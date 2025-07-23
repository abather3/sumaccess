#!/bin/bash

# EscaShop Deployment Testing Script
# This script tests all the major features after deployment
# Usage: ./test_deployment.sh [backend_url] [frontend_url]

set -e

# Configuration
BACKEND_URL=${1:-"http://localhost:5000"}
FRONTEND_URL=${2:-"http://localhost:3000"}
TEST_USER_EMAIL="test@escashop.com"
TEST_USER_PASSWORD="TestPass123!"
TEST_RESULTS_FILE="test_results_$(date +%Y%m%d_%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to log test results
log_test() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name - $message" | tee -a "$TEST_RESULTS_FILE"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}✗ FAIL${NC}: $test_name - $message" | tee -a "$TEST_RESULTS_FILE"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC}: $test_name - $message" | tee -a "$TEST_RESULTS_FILE"
    fi
}

# Function to make HTTP requests
make_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    local headers="$4"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" "$url" \
             -H "Content-Type: application/json" \
             ${headers:+-H "$headers"} \
             -d "$data" \
             -w "%{http_code}" \
             -o /tmp/curl_response.json
    else
        curl -s -X "$method" "$url" \
             ${headers:+-H "$headers"} \
             -w "%{http_code}" \
             -o /tmp/curl_response.json
    fi
}

echo -e "${BLUE}=== EscaShop Deployment Testing ===${NC}"
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "Test Results File: $TEST_RESULTS_FILE"
echo ""

# Test 1: Backend Health Check
echo -e "${YELLOW}Testing Backend Health...${NC}"
HTTP_CODE=$(make_request "GET" "$BACKEND_URL/health")
if [ "$HTTP_CODE" = "200" ]; then
    log_test "Backend Health Check" "PASS" "Backend is responding (HTTP $HTTP_CODE)"
else
    log_test "Backend Health Check" "FAIL" "Backend not responding (HTTP $HTTP_CODE)"
fi

# Test 2: Database Connection
echo -e "${YELLOW}Testing Database Connection...${NC}"
HTTP_CODE=$(make_request "GET" "$BACKEND_URL/api/health/db")
if [ "$HTTP_CODE" = "200" ]; then
    log_test "Database Connection" "PASS" "Database is accessible (HTTP $HTTP_CODE)"
else
    log_test "Database Connection" "FAIL" "Database connection failed (HTTP $HTTP_CODE)"
fi

# Test 3: User Registration
echo -e "${YELLOW}Testing User Registration...${NC}"
REGISTER_DATA='{
    "username": "testuser",
    "email": "'$TEST_USER_EMAIL'",
    "password": "'$TEST_USER_PASSWORD'",
    "role": "sales"
}'

HTTP_CODE=$(make_request "POST" "$BACKEND_URL/api/auth/register" "$REGISTER_DATA")
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    log_test "User Registration" "PASS" "User registered successfully (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" = "400" ]; then
    # Check if user already exists
    if grep -q "already exists" /tmp/curl_response.json 2>/dev/null; then
        log_test "User Registration" "PASS" "User already exists (expected for repeat tests)"
    else
        log_test "User Registration" "FAIL" "Registration failed with validation error"
    fi
else
    log_test "User Registration" "FAIL" "Registration failed (HTTP $HTTP_CODE)"
fi

# Test 4: User Login
echo -e "${YELLOW}Testing User Login...${NC}"
LOGIN_DATA='{
    "email": "'$TEST_USER_EMAIL'",
    "password": "'$TEST_USER_PASSWORD'"
}'

HTTP_CODE=$(make_request "POST" "$BACKEND_URL/api/auth/login" "$LOGIN_DATA")
if [ "$HTTP_CODE" = "200" ]; then
    # Extract token from response
    ACCESS_TOKEN=$(grep -o '"accessToken":"[^"]*' /tmp/curl_response.json | cut -d'"' -f4)
    if [ -n "$ACCESS_TOKEN" ]; then
        log_test "User Login" "PASS" "Login successful, token received"
        AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"
    else
        log_test "User Login" "FAIL" "Login successful but no token received"
        AUTH_HEADER=""
    fi
else
    log_test "User Login" "FAIL" "Login failed (HTTP $HTTP_CODE)"
    AUTH_HEADER=""
fi

# Test 5: Customer Registration (Queue Management)
if [ -n "$ACCESS_TOKEN" ]; then
    echo -e "${YELLOW}Testing Customer Registration...${NC}"
    CUSTOMER_DATA='{
        "or_number": "OR'$(date +%s)'",
        "name": "Test Customer",
        "contact_number": "1234567890",
        "email": "customer@test.com",
        "age": 30,
        "address": "123 Test Street, Test City",
        "occupation": "Engineer",
        "distribution_info": "pickup",
        "doctor_assigned": "Dr. Test",
        "prescription": {
            "od": "1.25",
            "os": "1.50", 
            "ou": "1.00",
            "pd": "62",
            "add": "0.75"
        },
        "grade_type": "Progressive",
        "lens_type": "Anti-reflective",
        "frame_code": "FR001",
        "estimated_time": {
            "days": 1,
            "hours": 2,
            "minutes": 30
        },
        "payment_info": {
            "mode": "gcash",
            "amount": 2500
        },
        "remarks": "Test customer for deployment verification",
        "priority_flags": {
            "senior_citizen": false,
            "pregnant": false,
            "pwd": false
        }
    }'
    
    HTTP_CODE=$(make_request "POST" "$BACKEND_URL/api/customers" "$CUSTOMER_DATA" "$AUTH_HEADER")
    if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
        CUSTOMER_ID=$(grep -o '"id":[0-9]*' /tmp/curl_response.json | cut -d':' -f2)
        TOKEN_NUMBER=$(grep -o '"token_number":[0-9]*' /tmp/curl_response.json | cut -d':' -f2)
        log_test "Customer Registration" "PASS" "Customer registered with token #$TOKEN_NUMBER (HTTP $HTTP_CODE)"
    else
        log_test "Customer Registration" "FAIL" "Customer registration failed (HTTP $HTTP_CODE)"
        CUSTOMER_ID=""
    fi
else
    log_test "Customer Registration" "FAIL" "Skipped - no authentication token"
fi

# Test 6: Queue Management - Get Customers
if [ -n "$ACCESS_TOKEN" ]; then
    echo -e "${YELLOW}Testing Queue Management...${NC}"
    HTTP_CODE=$(make_request "GET" "$BACKEND_URL/api/customers" "" "$AUTH_HEADER")
    if [ "$HTTP_CODE" = "200" ]; then
        CUSTOMER_COUNT=$(grep -o '"total":[0-9]*' /tmp/curl_response.json | cut -d':' -f2)
        log_test "Queue Management" "PASS" "Retrieved customer queue ($CUSTOMER_COUNT customers)"
    else
        log_test "Queue Management" "FAIL" "Failed to retrieve customer queue (HTTP $HTTP_CODE)"
    fi
else
    log_test "Queue Management" "FAIL" "Skipped - no authentication token"
fi

# Test 7: WebSocket Connection
echo -e "${YELLOW}Testing WebSocket Connection...${NC}"
WS_URL=$(echo "$BACKEND_URL" | sed 's/http/ws/')

# Test WebSocket connectivity (requires wscat or similar tool)
if command -v wscat &> /dev/null; then
    timeout 5 wscat -c "$WS_URL" --execute 'process.exit(0)' &> /dev/null
    if [ $? -eq 0 ]; then
        log_test "WebSocket Connection" "PASS" "WebSocket endpoint is accessible"
    else
        log_test "WebSocket Connection" "FAIL" "WebSocket connection failed"
    fi
else
    log_test "WebSocket Connection" "WARN" "wscat not available, skipping WebSocket test"
fi

# Test 8: Frontend Accessibility
echo -e "${YELLOW}Testing Frontend Accessibility...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$HTTP_CODE" = "200" ]; then
    log_test "Frontend Accessibility" "PASS" "Frontend is accessible (HTTP $HTTP_CODE)"
else
    log_test "Frontend Accessibility" "FAIL" "Frontend not accessible (HTTP $HTTP_CODE)"
fi

# Test 9: CORS Configuration
echo -e "${YELLOW}Testing CORS Configuration...${NC}"
CORS_RESPONSE=$(curl -s -H "Origin: $FRONTEND_URL" \
                     -H "Access-Control-Request-Method: POST" \
                     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
                     -X OPTIONS \
                     "$BACKEND_URL/api/customers" \
                     -i)

if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    log_test "CORS Configuration" "PASS" "CORS headers are present"
else
    log_test "CORS Configuration" "FAIL" "CORS headers missing"
fi

# Test 10: File Upload (if customer exists)
if [ -n "$ACCESS_TOKEN" ] && [ -n "$CUSTOMER_ID" ]; then
    echo -e "${YELLOW}Testing File Upload...${NC}"
    
    # Create a dummy image file for testing
    echo "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" | base64 -d > /tmp/test_image.gif
    
    HTTP_CODE=$(curl -s -X POST "$BACKEND_URL/api/upload" \
                     -H "$AUTH_HEADER" \
                     -F "file=@/tmp/test_image.gif" \
                     -F "type=prescription" \
                     -w "%{http_code}" \
                     -o /tmp/upload_response.json)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        log_test "File Upload" "PASS" "File upload successful (HTTP $HTTP_CODE)"
    else
        log_test "File Upload" "FAIL" "File upload failed (HTTP $HTTP_CODE)"
    fi
    
    # Clean up test file
    rm -f /tmp/test_image.gif
else
    log_test "File Upload" "WARN" "Skipped - no authentication token or customer ID"
fi

# Test 11: Environment Variables Check
echo -e "${YELLOW}Testing Environment Configuration...${NC}"
if [ -n "$ACCESS_TOKEN" ]; then
    HTTP_CODE=$(make_request "GET" "$BACKEND_URL/api/config/status" "" "$AUTH_HEADER")
    if [ "$HTTP_CODE" = "200" ]; then
        log_test "Environment Config" "PASS" "Environment configuration accessible"
    else
        log_test "Environment Config" "WARN" "Environment config endpoint not available"
    fi
else
    log_test "Environment Config" "WARN" "Skipped - no authentication token"
fi

# Test 12: Analytics Endpoint
if [ -n "$ACCESS_TOKEN" ]; then
    echo -e "${YELLOW}Testing Analytics...${NC}"
    HTTP_CODE=$(make_request "GET" "$BACKEND_URL/api/analytics/queue" "" "$AUTH_HEADER")
    if [ "$HTTP_CODE" = "200" ]; then
        log_test "Analytics" "PASS" "Analytics endpoint accessible"
    else
        log_test "Analytics" "FAIL" "Analytics endpoint failed (HTTP $HTTP_CODE)"
    fi
else
    log_test "Analytics" "FAIL" "Skipped - no authentication token"
fi

# Test 13: Export Functionality
if [ -n "$ACCESS_TOKEN" ]; then
    echo -e "${YELLOW}Testing Export Functionality...${NC}"
    HTTP_CODE=$(make_request "POST" "$BACKEND_URL/api/customers/export/excel" '{"format":"excel"}' "$AUTH_HEADER")
    if [ "$HTTP_CODE" = "200" ]; then
        log_test "Export Functionality" "PASS" "Export functionality working"
    else
        log_test "Export Functionality" "FAIL" "Export failed (HTTP $HTTP_CODE)"
    fi
else
    log_test "Export Functionality" "FAIL" "Skipped - no authentication token"
fi

# Clean up temporary files
rm -f /tmp/curl_response.json /tmp/upload_response.json

# Generate final report
echo ""
echo -e "${BLUE}=== Test Summary ===${NC}"
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo -e "Pass Rate: ${BLUE}$PASS_RATE%${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Deployment is ready.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review the issues above.${NC}"
    exit 1
fi

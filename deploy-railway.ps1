#!/usr/bin/env pwsh

Write-Output "🚀 EscaShop Railway Deployment & Troubleshooting Script"
Write-Output "======================================================"

# Function to check URL status
function Test-URLStatus {
    param($URL, $Description)
    try {
        $response = Invoke-WebRequest -Uri $URL -Method Get -TimeoutSec 30
        Write-Output "✅ $Description - Status: $($response.StatusCode)"
        return $true
    }
    catch {
        Write-Output "❌ $Description - Error: $($_.Exception.Message)"
        return $false
    }
}

# Check current deployment status
Write-Output "`n🔍 Checking current deployment status..."

$backendURL = "https://escashop-backend-production.up.railway.app"
$frontendURL = "https://escashop-frontend-production.up.railway.app"

$backendHealthy = Test-URLStatus "$backendURL/health" "Backend Health Check"
$frontendHealthy = Test-URLStatus $frontendURL "Frontend Application"

if ($backendHealthy -and $frontendHealthy) {
    Write-Output "`n🎉 Both services are running successfully!"
    exit 0
}

Write-Output "`n🔧 Troubleshooting deployment issues..."

# Check if Railway CLI is installed
try {
    railway --version | Out-Null
    Write-Output "✅ Railway CLI is installed"
} catch {
    Write-Output "❌ Railway CLI not found. Please install it:"
    Write-Output "   npm install -g @railway/cli"
    exit 1
}

# Show Railway project status
Write-Output "`n📊 Railway Project Status:"
try {
    railway status
} catch {
    Write-Output "❌ Unable to get Railway status. Please ensure you're logged in:"
    Write-Output "   railway login"
}

# Deployment recommendations
Write-Output "`n🛠️ Deployment Fix Recommendations:"

if (-not $backendHealthy) {
    Write-Output "`n🔴 Backend Issues:"
    Write-Output "1. Check environment variables in Railway dashboard:"
    Write-Output "   - DATABASE_URL (should be auto-provided by PostgreSQL service)"
    Write-Output "   - JWT_SECRET (secure 64+ character string)"
    Write-Output "   - JWT_REFRESH_SECRET (secure 64+ character string)"
    Write-Output "   - VONAGE_API_KEY and VONAGE_API_SECRET"
    Write-Output "   - EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM"
    Write-Output "`n2. Check backend logs:"
    Write-Output "   railway logs --service escashop-backend"
}

if (-not $frontendHealthy) {
    Write-Output "`n🔴 Frontend Issues (502 Bad Gateway):"
    Write-Output "1. Port Configuration Issue:"
    Write-Output "   - Ensure your app listens on process.env.PORT"
    Write-Output "   - Current nixpacks.toml should use: 'npx serve -s build -l `$PORT -d false'"
    Write-Output "`n2. Build Issues:"
    Write-Output "   - Check if frontend builds successfully"
    Write-Output "   - Verify all dependencies are in package.json"
    Write-Output "`n3. Environment Variables:"
    Write-Output "   - REACT_APP_API_URL should point to backend URL"
    Write-Output "   - NODE_ENV should be 'production'"
    Write-Output "`n4. Check frontend logs:"
    Write-Output "   railway logs --service escashop-frontend"
}

Write-Output "`n🔄 Quick Fix Commands:"
Write-Output "1. Redeploy frontend with updated configuration:"
Write-Output "   git add . && git commit -m 'Fix Railway port configuration' && git push"
Write-Output "`n2. Force redeploy specific service:"
Write-Output "   railway redeploy --service escashop-frontend"
Write-Output "`n3. Check service variables:"
Write-Output "   railway variables --service escashop-frontend"
Write-Output "   railway variables --service escashop-backend"

Write-Output "`n📋 Environment Variables Checklist:"

Write-Output "`nBackend Service Variables:"
@"
DATABASE_URL=<auto-provided-by-railway>
JWT_SECRET=<64-char-secure-string>
JWT_REFRESH_SECRET=<64-char-secure-string>
SESSION_SECRET=<64-char-secure-string>
FRONTEND_URL=https://escashop-frontend-production.up.railway.app
CORS_ORIGINS=https://escashop-frontend-production.up.railway.app
VONAGE_API_KEY=24580886
VONAGE_API_SECRET=0YSON3xZYOEWYLyf
EMAIL_USER=jefor16@gmail.com
EMAIL_PASSWORD=cutbcijqacobypak
EMAIL_FROM=jefor16@gmail.com
NODE_ENV=production
"@ | Write-Output

Write-Output "`nFrontend Service Variables:"
@"
REACT_APP_API_URL=https://escashop-backend-production.up.railway.app
REACT_APP_SOCKET_URL=https://escashop-backend-production.up.railway.app
NODE_ENV=production
GENERATE_SOURCEMAP=false
DISABLE_ESLINT_PLUGIN=true
CI=false
"@ | Write-Output

Write-Output "`n🎯 Next Steps:"
Write-Output "1. Update files as shown above"
Write-Output "2. Commit and push changes: git add . && git commit -m 'Fix Railway deployment' && git push"
Write-Output "3. Wait for automatic redeploy (or force redeploy)"
Write-Output "4. Test URLs again"
Write-Output "5. Check logs if issues persist: railway logs --service <service-name>"

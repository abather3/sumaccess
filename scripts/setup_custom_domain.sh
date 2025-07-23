#!/bin/bash

# EscaShop Custom Domain Setup Script
# This script helps configure custom domains with SSL certificates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.production"
NGINX_CONFIG_DIR="$PROJECT_ROOT/nginx"
SSL_DIR="$PROJECT_ROOT/ssl"

# Default values
DEFAULT_EMAIL="admin@example.com"
DEFAULT_BACKEND_DOMAIN="api.escashop.com"
DEFAULT_FRONTEND_DOMAIN="escashop.com"

echo -e "${BLUE}=== EscaShop Custom Domain Setup ===${NC}"
echo ""

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if domain is reachable
check_domain() {
    local domain=$1
    print_info "Checking if $domain is reachable..."
    
    if nslookup "$domain" > /dev/null 2>&1; then
        print_success "$domain is reachable"
        return 0
    else
        print_warning "$domain is not reachable. Make sure DNS is configured correctly."
        return 1
    fi
}

# Function to install required tools
install_dependencies() {
    print_info "Installing required dependencies..."
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        print_info "Installing certbot..."
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update
            sudo apt-get install -y certbot python3-certbot-nginx
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install certbot
        else
            print_error "Unsupported OS. Please install certbot manually."
            exit 1
        fi
    fi
    
    # Check if nginx is installed
    if ! command -v nginx &> /dev/null; then
        print_info "Installing nginx..."
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get install -y nginx
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install nginx
        else
            print_error "Unsupported OS. Please install nginx manually."
            exit 1
        fi
    fi
    
    print_success "Dependencies installed successfully"
}

# Function to collect domain information
collect_domain_info() {
    print_info "Please provide your domain information:"
    echo ""
    
    read -p "Frontend domain (e.g., escashop.com): " FRONTEND_DOMAIN
    FRONTEND_DOMAIN=${FRONTEND_DOMAIN:-$DEFAULT_FRONTEND_DOMAIN}
    
    read -p "Backend API domain (e.g., api.escashop.com): " BACKEND_DOMAIN
    BACKEND_DOMAIN=${BACKEND_DOMAIN:-$DEFAULT_BACKEND_DOMAIN}
    
    read -p "Email for SSL certificates: " SSL_EMAIL
    SSL_EMAIL=${SSL_EMAIL:-$DEFAULT_EMAIL}
    
    read -p "Enable www redirect? (y/n): " ENABLE_WWW
    ENABLE_WWW=${ENABLE_WWW:-n}
    
    print_info "Configuration summary:"
    echo "  Frontend Domain: $FRONTEND_DOMAIN"
    echo "  Backend Domain: $BACKEND_DOMAIN"
    echo "  SSL Email: $SSL_EMAIL"
    echo "  WWW Redirect: $ENABLE_WWW"
    echo ""
    
    read -p "Continue with this configuration? (y/n): " CONFIRM
    if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
        print_info "Setup cancelled."
        exit 0
    fi
}

# Function to create nginx configuration
create_nginx_config() {
    print_info "Creating nginx configuration..."
    
    mkdir -p "$NGINX_CONFIG_DIR"
    mkdir -p "$SSL_DIR"
    
    # Frontend configuration
    cat > "$NGINX_CONFIG_DIR/frontend.conf" << EOF
# Frontend configuration for $FRONTEND_DOMAIN
server {
    listen 80;
    server_name $FRONTEND_DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $FRONTEND_DOMAIN;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$FRONTEND_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$FRONTEND_DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Frontend proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://localhost:3000/health;
    }
}
EOF

    # WWW redirect if enabled
    if [[ "$ENABLE_WWW" == "y" || "$ENABLE_WWW" == "Y" ]]; then
        cat >> "$NGINX_CONFIG_DIR/frontend.conf" << EOF

# WWW redirect
server {
    listen 80;
    listen 443 ssl http2;
    server_name www.$FRONTEND_DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$FRONTEND_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$FRONTEND_DOMAIN/privkey.pem;
    
    return 301 https://$FRONTEND_DOMAIN\$request_uri;
}
EOF
    fi
    
    # Backend configuration
    cat > "$NGINX_CONFIG_DIR/backend.conf" << EOF
# Backend API configuration for $BACKEND_DOMAIN
server {
    listen 80;
    server_name $BACKEND_DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $BACKEND_DOMAIN;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$BACKEND_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$BACKEND_DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # CORS headers (adjust as needed)
    add_header Access-Control-Allow-Origin "https://$FRONTEND_DOMAIN" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept, Origin, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials true always;
    
    # Handle preflight requests
    if (\$request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "https://$FRONTEND_DOMAIN" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept, Origin, X-Requested-With" always;
        add_header Access-Control-Allow-Credentials true always;
        add_header Access-Control-Max-Age 1728000;
        add_header Content-Type 'text/plain; charset=utf-8';
        add_header Content-Length 0;
        return 204;
    }
    
    # API proxy
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        
        # Increase buffer sizes for large requests
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://localhost:5000/health;
    }
    
    # API documentation (if enabled)
    location /docs {
        proxy_pass http://localhost:5000/docs;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    print_success "Nginx configuration files created"
}

# Function to obtain SSL certificates
obtain_ssl_certificates() {
    print_info "Obtaining SSL certificates from Let's Encrypt..."
    
    # Stop nginx if running
    sudo systemctl stop nginx 2>/dev/null || true
    
    # Obtain certificate for frontend domain
    print_info "Obtaining certificate for $FRONTEND_DOMAIN..."
    if [[ "$ENABLE_WWW" == "y" || "$ENABLE_WWW" == "Y" ]]; then
        sudo certbot certonly --standalone \
            --email "$SSL_EMAIL" \
            --agree-tos \
            --no-eff-email \
            -d "$FRONTEND_DOMAIN" \
            -d "www.$FRONTEND_DOMAIN"
    else
        sudo certbot certonly --standalone \
            --email "$SSL_EMAIL" \
            --agree-tos \
            --no-eff-email \
            -d "$FRONTEND_DOMAIN"
    fi
    
    # Obtain certificate for backend domain
    print_info "Obtaining certificate for $BACKEND_DOMAIN..."
    sudo certbot certonly --standalone \
        --email "$SSL_EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$BACKEND_DOMAIN"
    
    print_success "SSL certificates obtained successfully"
}

# Function to install nginx configurations
install_nginx_configs() {
    print_info "Installing nginx configurations..."
    
    # Copy configurations to sites-available
    sudo cp "$NGINX_CONFIG_DIR/frontend.conf" "/etc/nginx/sites-available/$FRONTEND_DOMAIN"
    sudo cp "$NGINX_CONFIG_DIR/backend.conf" "/etc/nginx/sites-available/$BACKEND_DOMAIN"
    
    # Create symbolic links in sites-enabled
    sudo ln -sf "/etc/nginx/sites-available/$FRONTEND_DOMAIN" "/etc/nginx/sites-enabled/"
    sudo ln -sf "/etc/nginx/sites-available/$BACKEND_DOMAIN" "/etc/nginx/sites-enabled/"
    
    # Remove default site if it exists
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    if sudo nginx -t; then
        print_success "Nginx configuration is valid"
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
    
    print_success "Nginx configurations installed"
}

# Function to update environment variables
update_environment() {
    print_info "Updating environment variables..."
    
    # Backup existing .env file
    if [[ -f "$ENV_FILE" ]]; then
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        print_info "Backup of existing .env file created"
    fi
    
    # Update or create environment variables
    {
        echo "# Custom Domain Configuration"
        echo "FRONTEND_URL=https://$FRONTEND_DOMAIN"
        echo "BACKEND_URL=https://$BACKEND_DOMAIN"
        echo "CORS_ORIGIN=https://$FRONTEND_DOMAIN"
        echo "WEBSOCKET_CORS_ORIGIN=https://$FRONTEND_DOMAIN"
        echo ""
        echo "# SSL Configuration"
        echo "FORCE_HTTPS=true"
        echo "HSTS_MAX_AGE=31536000"
        echo ""
    } >> "$ENV_FILE"
    
    print_success "Environment variables updated"
}

# Function to setup SSL certificate renewal
setup_ssl_renewal() {
    print_info "Setting up SSL certificate auto-renewal..."
    
    # Create renewal script
    cat > "$SCRIPT_DIR/renew_ssl.sh" << EOF
#!/bin/bash
# SSL Certificate Renewal Script

# Renew certificates
certbot renew --quiet

# Reload nginx if certificates were renewed
if [[ \$? -eq 0 ]]; then
    systemctl reload nginx
fi
EOF
    
    chmod +x "$SCRIPT_DIR/renew_ssl.sh"
    
    # Add to crontab (run twice daily)
    (crontab -l 2>/dev/null; echo "0 12,0 * * * $SCRIPT_DIR/renew_ssl.sh") | crontab -
    
    print_success "SSL auto-renewal configured"
}

# Function to start services
start_services() {
    print_info "Starting services..."
    
    # Start and enable nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    # Restart application services
    cd "$PROJECT_ROOT"
    docker-compose restart
    
    print_success "Services started successfully"
}

# Function to verify setup
verify_setup() {
    print_info "Verifying domain setup..."
    
    # Test frontend
    print_info "Testing frontend at https://$FRONTEND_DOMAIN..."
    if curl -k -s "https://$FRONTEND_DOMAIN" > /dev/null; then
        print_success "Frontend is accessible"
    else
        print_warning "Frontend test failed"
    fi
    
    # Test backend
    print_info "Testing backend at https://$BACKEND_DOMAIN/health..."
    if curl -k -s "https://$BACKEND_DOMAIN/health" > /dev/null; then
        print_success "Backend is accessible"
    else
        print_warning "Backend test failed"
    fi
    
    # Test SSL certificates
    print_info "Checking SSL certificate validity..."
    if openssl s_client -connect "$FRONTEND_DOMAIN:443" -servername "$FRONTEND_DOMAIN" </dev/null 2>/dev/null | openssl x509 -noout -dates; then
        print_success "Frontend SSL certificate is valid"
    fi
    
    if openssl s_client -connect "$BACKEND_DOMAIN:443" -servername "$BACKEND_DOMAIN" </dev/null 2>/dev/null | openssl x509 -noout -dates; then
        print_success "Backend SSL certificate is valid"
    fi
}

# Function to display final instructions
show_final_instructions() {
    print_success "Custom domain setup completed successfully!"
    echo ""
    print_info "Your applications are now accessible at:"
    echo "  Frontend: https://$FRONTEND_DOMAIN"
    echo "  Backend API: https://$BACKEND_DOMAIN"
    echo ""
    print_info "Next steps:"
    echo "1. Update your DNS records to point to this server's IP address"
    echo "2. Test all functionality thoroughly"
    echo "3. Update any hardcoded URLs in your application"
    echo "4. Configure monitoring for the new domains"
    echo ""
    print_info "SSL certificates will auto-renew. Check logs with:"
    echo "  sudo tail -f /var/log/letsencrypt/letsencrypt.log"
    echo ""
    print_info "Nginx logs location:"
    echo "  sudo tail -f /var/log/nginx/access.log"
    echo "  sudo tail -f /var/log/nginx/error.log"
}

# Main execution
main() {
    print_info "Starting custom domain setup for EscaShop..."
    
    # Check if running as root for certain operations
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. Some operations may not work as expected."
    fi
    
    # Collect domain information
    collect_domain_info
    
    # Check domain reachability
    check_domain "$FRONTEND_DOMAIN"
    check_domain "$BACKEND_DOMAIN"
    
    # Install dependencies
    install_dependencies
    
    # Create nginx configurations
    create_nginx_config
    
    # Obtain SSL certificates
    obtain_ssl_certificates
    
    # Install nginx configurations
    install_nginx_configs
    
    # Update environment variables
    update_environment
    
    # Setup SSL renewal
    setup_ssl_renewal
    
    # Start services
    start_services
    
    # Verify setup
    verify_setup
    
    # Show final instructions
    show_final_instructions
}

# Handle script interruption
cleanup() {
    print_warning "Setup interrupted. Cleaning up..."
    sudo systemctl stop nginx 2>/dev/null || true
    exit 1
}

trap cleanup INT TERM

# Check for help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "EscaShop Custom Domain Setup Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "This script helps you configure custom domains with SSL certificates"
    echo "for your EscaShop application."
    echo ""
    echo "Prerequisites:"
    echo "- Domain names must point to this server's IP address"
    echo "- Ports 80 and 443 must be available"
    echo "- Root/sudo access required for SSL and nginx configuration"
    echo ""
    exit 0
fi

# Run main function
main "$@"

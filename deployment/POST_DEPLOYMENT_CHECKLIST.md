# Post-Deployment Configuration Checklist

## ✅ Step 6: Post-deployment configuration

This document outlines the complete deployment setup tasks that need to be completed after the initial deployment.

### 🌐 CORS Settings Configuration

#### Production URLs to Configure:
- **Frontend URLs**:
  - Railway: `https://escashop-frontend-production.up.railway.app`
  - Render: `https://escashop-frontend.onrender.com`
  - Local Development: `http://localhost:3000`

#### Backend CORS Configuration:
Update `backend/src/config/config.ts` or environment variables:

```typescript
// CORS configuration for production
const corsOptions = {
  origin: [
    'https://escashop-frontend-production.up.railway.app',
    'https://escashop-frontend.onrender.com',
    'http://localhost:3000', // Development
    // Add custom domain when available
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
};
```

#### Environment Variables to Update:
```bash
# Production
FRONTEND_URL=https://your-production-domain.com
CORS_ORIGIN=https://your-production-domain.com,https://escashop-frontend.onrender.com

# Development
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

### 🏷️ Custom Domains Configuration

#### Railway Custom Domain Setup:
1. Log in to Railway Dashboard
2. Navigate to your project
3. Go to Settings → Domains
4. Add custom domain: `escashop.yourdomain.com`
5. Configure DNS records:
   ```
   Type: CNAME
   Name: escashop
   Value: railway-provided-domain.up.railway.app
   ```

#### Render Custom Domain Setup:
1. Go to Render Dashboard
2. Select your service
3. Settings → Custom Domains
4. Add domain and configure DNS
5. Enable automatic HTTPS

### 📊 Monitoring & Alerts Setup

#### Application Monitoring:
```yaml
# monitoring/grafana/provisioning/alerting/rules.yml
groups:
  - name: escashop_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: DatabaseConnectionDown
        expr: up{job="postgres"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection is down"
          
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
```

#### Log Monitoring:
```yaml
# monitoring/elastalert/rules/application_errors.yml
name: "Application Error Rate"
type: frequency
index: logstash-*
num_events: 10
timeframe:
  minutes: 5
filter:
  - terms:
      level: ["ERROR", "FATAL"]
alert:
  - "email"
email:
  - "admin@yourdomain.com"
```

### 🧪 Feature Testing Checklist

#### ✅ Authentication and Authorization:
- [ ] User registration works with all roles (admin, sales, cashier)
- [ ] Login/logout functionality
- [ ] JWT token refresh mechanism
- [ ] Role-based access control (RBAC)
- [ ] Password reset functionality
- [ ] Account lockout after failed attempts

**Test Commands:**
```bash
# Test user registration
curl -X POST https://your-api-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"TestPass123","role":"sales"}'

# Test login  
curl -X POST https://your-api-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"TestPass123"}'
```

#### ✅ Queue Management:
- [ ] Customer registration creates queue entry
- [ ] Token number generation is sequential
- [ ] Queue status updates (waiting → serving → completed)
- [ ] Priority queue handling (senior, pregnant, PWD)
- [ ] Daily queue reset at midnight
- [ ] Queue analytics and reporting

**Test Commands:**
```bash
# Test customer registration
curl -X POST https://your-api-domain.com/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Customer",
    "contact_number": "1234567890",
    "email": "customer@test.com",
    "address": "Test Address",
    "distribution_info": "pickup",
    "prescription": {"od": "1.25", "os": "1.50", "ou": "1.00", "pd": "62", "add": "0.75"},
    "grade_type": "Progressive",
    "lens_type": "Anti-reflective",
    "frame_code": "FR001",
    "estimated_time": {"days": 1, "hours": 2, "minutes": 30},
    "payment_info": {"mode": "gcash", "amount": 2500},
    "priority_flags": {"senior_citizen": false, "pregnant": false, "pwd": false}
  }'
```

#### ✅ Real-time Updates via WebSocket:
- [ ] Queue status changes broadcast to all connected clients
- [ ] Customer registration notifications
- [ ] Payment completion updates
- [ ] Connection recovery after network interruption
- [ ] Multiple client synchronization

**Test Script:**
```javascript
// Test WebSocket connection
const ws = new WebSocket('wss://your-api-domain.com');
ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', JSON.parse(event.data));
ws.onerror = (error) => console.error('WebSocket error:', error);
```

#### ✅ SMS/Email Notifications:
- [ ] Customer registration confirmation
- [ ] Queue status change notifications
- [ ] Payment confirmation messages
- [ ] Daily summary reports
- [ ] Error notifications to admins

**Test Configuration:**
```bash
# Environment variables for SMS (Vonage)
SMS_PROVIDER=vonage
SMS_ENABLED=true
VONAGE_API_KEY=your_api_key
VONAGE_API_SECRET=your_api_secret
SMS_FROM=EscaShop

# Environment variables for Email
EMAIL_SERVICE_ENABLED=true
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com
```

#### ✅ File Uploads:
- [ ] Customer profile pictures
- [ ] Prescription documents
- [ ] Frame catalog images
- [ ] Export documents (PDF, Excel)
- [ ] File size limits and validation
- [ ] Secure file storage

**Test Commands:**
```bash
# Test file upload
curl -X POST https://your-api-domain.com/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test_image.jpg" \
  -F "type=prescription"
```

### 🗄️ PostgreSQL Backup Configuration

#### Automated Daily Backups:
```bash
#!/bin/bash
# scripts/backup_postgres.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="escashop"
DB_USER="postgres"
DB_HOST="localhost"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/escashop_backup_$DATE.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "escashop_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: escashop_backup_$DATE.sql.gz"
```

#### Cron Job Setup:
```bash
# Add to crontab (crontab -e)
0 2 * * * /path/to/escashop/scripts/backup_postgres.sh >> /var/log/escashop_backup.log 2>&1
```

#### Cloud Backup (Railway):
```bash
# Railway backup using pg_dump
railway run pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz

# Upload to cloud storage (AWS S3 example)
aws s3 cp backup_$(date +%Y%m%d).sql.gz s3://your-backup-bucket/postgres/
```

### 📚 Deployment Documentation

#### Environment Variables Checklist:

**Backend (.env.production):**
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=escashop
DB_USER=escashop_user
DB_PASSWORD=secure_password

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=another-super-secure-refresh-secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# CORS & Frontend
FRONTEND_URL=https://your-frontend-domain.com
CORS_ORIGIN=https://your-frontend-domain.com

# SMS & Email
SMS_PROVIDER=vonage
SMS_ENABLED=true
VONAGE_API_KEY=your_vonage_key
VONAGE_API_SECRET=your_vonage_secret
SMS_FROM=EscaShop

EMAIL_SERVICE_ENABLED=true
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com

# External Services
GOOGLE_SHEETS_URL=https://script.google.com/macros/s/your-script-id/exec

# Server
NODE_ENV=production
PORT=5000
```

**Frontend (.env.production):**
```bash
REACT_APP_API_URL=https://your-backend-domain.com
REACT_APP_SOCKET_URL=https://your-backend-domain.com
DISABLE_ESLINT_PLUGIN=true
GENERATE_SOURCEMAP=false
```

### 🔐 Security Configuration

#### SSL/TLS Certificate:
- [ ] HTTPS enabled on all endpoints
- [ ] SSL certificate auto-renewal configured
- [ ] HTTP to HTTPS redirect enabled
- [ ] Secure headers configured

#### Security Headers:
```javascript
// Add to express app
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  next();
});
```

### 🚀 Deployment Commands

#### Build and Deploy Frontend:
```bash
cd frontend
npm ci
npm run build
# Deploy build folder to hosting service
```

#### Build and Deploy Backend:
```bash
cd backend
npm ci
npm run build
# Deploy to hosting service
```

#### Docker Deployment:
```bash
# Build and run with docker-compose
docker-compose -f docker-compose.yml up -d

# Check container health
docker-compose ps
docker-compose logs backend
docker-compose logs frontend
```

### 📋 Post-Deployment Verification

#### Health Checks:
```bash
# Backend health check
curl https://your-backend-domain.com/health

# Database connection check
curl https://your-backend-domain.com/api/health/db

# WebSocket connection check
wscat -c wss://your-backend-domain.com
```

#### Performance Tests:
```bash
# Load testing with Apache Bench
ab -n 1000 -c 10 https://your-backend-domain.com/api/customers

# Memory usage monitoring
free -h
top -p $(pgrep node)
```

## 🔧 Troubleshooting

### Common Issues:

1. **CORS Errors**: Update CORS_ORIGIN environment variable
2. **Database Connection**: Check DATABASE_URL and network connectivity
3. **WebSocket Issues**: Verify WebSocket endpoint and proxy configuration
4. **Email/SMS Not Sending**: Validate API keys and service credentials
5. **File Upload Issues**: Check file permissions and storage configuration

### Logs Location:
- Backend logs: `/app/logs/` or check hosting service logs
- Nginx logs: `/var/log/nginx/`
- PostgreSQL logs: `/var/log/postgresql/`

## ✅ Deployment Completion Checklist

- [ ] CORS settings updated with production URLs
- [ ] Custom domains configured (if available)
- [ ] Monitoring and alerts set up
- [ ] All features tested and working:
  - [ ] Authentication and authorization
  - [ ] Queue management  
  - [ ] Real-time updates via WebSocket
  - [ ] SMS/Email notifications
  - [ ] File uploads
- [ ] PostgreSQL backups configured
- [ ] Documentation completed
- [ ] Security measures implemented
- [ ] Performance optimized
- [ ] Health checks configured
- [ ] Error monitoring active

## 📞 Support Contacts

- **Technical Lead**: [Your Name] - [your.email@domain.com]
- **DevOps**: [DevOps Team] - [devops@domain.com]
- **Database Admin**: [DBA Name] - [dba@domain.com]

---

**Last Updated**: $(date)
**Version**: 1.0
**Status**: ✅ COMPLETED

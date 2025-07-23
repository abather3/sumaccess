# Railway Service Setup Guide

## Current Status
Based on your Railway dashboard, you have:
- ✅ **escashop-database-bw...** (PostgreSQL) - Working
- ❌ **escashop-database** - Failed (needs removal)
- 🔄 **escashop-frontend** - Building
- ⚠️ **escashop-backend** - Not deployed yet

## Step 1: Clean Up Database Services

### Remove Failed Database
1. Go to your Railway dashboard
2. Click on the failed **escashop-database** service
3. Go to Settings → Danger → Delete Service
4. Confirm deletion

### Get Working Database Connection String
1. Click on **escashop-database-bw...** service
2. Go to Variables tab
3. Copy the `DATABASE_URL` or connection details
4. Note down the connection string format: `postgresql://username:password@hostname:port/database`

## Step 2: Configure Backend Service

### Set Root Directory
1. Click on **escashop-backend** service
2. Go to Settings
3. Set **Root Directory** to `/backend`
4. Save changes

### Set Environment Variables
In the Variables tab of your backend service, add these variables:

#### Required Database Variables
```bash
DATABASE_URL=<your-postgresql-connection-string-from-step-1>
```

#### Required Security Variables (Generate secure values)
```bash
JWT_SECRET=<generate-a-secure-random-string>
JWT_REFRESH_SECRET=<generate-another-secure-random-string>
```

#### SMS Service Variables (from your .env.railway)
```bash
VONAGE_API_KEY=24580886
VONAGE_API_SECRET=0YSON3xZYOEWYLyf
```

#### Email Service Variables (from your .env.railway)
```bash
EMAIL_USER=jefor16@gmail.com
EMAIL_PASSWORD=cutbcijqacobypak
EMAIL_FROM=jefor16@gmail.com
```

#### Google Sheets Integration
```bash
GOOGLE_SHEETS_URL=https://script.google.com/macros/s/AKfycbxK6QzgW_7lZbNYknNyXVe4ogZvdByyqaHwfpoX4txyeTXVVmz498xxGBtuDCG_2xAi/exec
```

### Health Check Configuration
- ✅ Already configured in `backend/railway.toml`
- Health check path: `/health`
- Timeout: 300 seconds
- Restart policy: ON_FAILURE with 3 max retries

## Step 3: Configure Frontend Service

### Set Root Directory
1. Click on **escashop-frontend** service
2. Go to Settings
3. Set **Root Directory** to `/frontend`
4. Save changes

### Set Environment Variables
In the Variables tab of your frontend service, add:

#### Backend API URL
```bash
REACT_APP_API_URL=https://<your-backend-service-url>
```
*Replace `<your-backend-service-url>` with your actual backend service URL from Railway*

#### WebSocket URL
```bash
REACT_APP_WS_URL=wss://<your-backend-service-url>
```

### Static File Serving
- ✅ Already configured in `frontend/railway.toml`
- Uses `npx serve -s build` for static file serving
- Health check path: `/` (serves the React app)

## Step 4: Deploy Services

### Deploy Backend
1. Go to **escashop-backend** service
2. Click **Deploy**
3. Wait for deployment to complete
4. Check logs for any errors
5. Test the health endpoint: `https://<backend-url>/health`

### Deploy Frontend
1. Your frontend should be building automatically
2. Once deployed, get the frontend URL
3. Update the backend's `FRONTEND_URL` environment variable with this URL

### Update CORS Configuration
After both services are deployed, you may need to update CORS settings in your backend to allow requests from your frontend URL.

## Step 5: Database Setup

### Run Database Migrations
Once your backend is deployed:
1. Use Railway's CLI or dashboard to run database migrations
2. Check if your database schema is properly initialized
3. Verify database connectivity from the backend

### Test Database Connection
```bash
# You can test this via Railway's CLI or backend logs
railway shell
# Then run your migration commands
```

## Step 6: Verify Everything Works

### Backend Health Check
Visit: `https://<your-backend-url>/health`
Should return: `{"status": "OK", "timestamp": "..."}`

### Frontend Access
Visit: `https://<your-frontend-url>`
Should load your React application

### API Connection
Test that frontend can communicate with backend API

## Troubleshooting

### Common Issues

1. **Backend won't start**
   - Check environment variables are set correctly
   - Verify database connection string
   - Check backend logs for specific errors

2. **Frontend build fails**
   - Check if all environment variables starting with `REACT_APP_` are set
   - Verify Node.js version compatibility

3. **Database connection fails**
   - Verify `DATABASE_URL` is correct
   - Check if database service is running
   - Ensure database allows connections from Railway services

4. **CORS errors**
   - Update CORS configuration in backend
   - Verify `FRONTEND_URL` environment variable in backend

### Security Recommendations

1. **Generate Secure JWT Secrets**
   ```bash
   # Use a tool like this to generate secure secrets:
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Environment Variables**
   - Never commit actual secrets to version control
   - Use Railway's environment variable encryption
   - Regularly rotate sensitive credentials

## Next Steps

After successful deployment:
1. Test all functionality
2. Set up monitoring and logging
3. Configure custom domains if needed
4. Set up backup strategies for your database
5. Configure SSL certificates (Railway handles this automatically)

## Railway Service URLs

Once deployed, your services will be available at:
- Backend: `https://<backend-service-name>.up.railway.app`
- Frontend: `https://<frontend-service-name>.up.railway.app`
- Database: Internal Railway network (not publicly accessible)

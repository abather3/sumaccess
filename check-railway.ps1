Write-Output "🚀 Railway EscaShop Status Check"
Write-Output "================================"

# Test backend
Write-Output "`nTesting backend..."
try {
    $backend = Invoke-WebRequest -Uri "https://escashop-backend-production.up.railway.app/health" -Method Get -TimeoutSec 10
    Write-Output "✅ Backend Status: $($backend.StatusCode) - HEALTHY"
} catch {
    Write-Output "❌ Backend Error: $($_.Exception.Message)"
}

# Test frontend
Write-Output "`nTesting frontend..."
try {
    $frontend = Invoke-WebRequest -Uri "https://escashop-frontend-production.up.railway.app" -Method Get -TimeoutSec 10
    Write-Output "✅ Frontend Status: $($frontend.StatusCode) - WORKING"
} catch {
    Write-Output "❌ Frontend Error: $($_.Exception.Message)"
    Write-Output "`n🔧 Frontend 502 Error - Likely Causes:"
    Write-Output "1. Port configuration: App not listening on Railway's PORT variable"
    Write-Output "2. Build failure: Check if React app builds successfully"
    Write-Output "3. Missing environment variables"
    Write-Output "4. Start command issues"
}

Write-Output "`n📋 Quick Fixes:"
Write-Output "1. Check Railway logs: railway logs --service escashop-frontend" 
Write-Output "2. Verify nixpacks.toml uses: cmd = 'npx serve -s build -l \$PORT -d false'"
Write-Output "3. Ensure all environment variables are set"
Write-Output "4. Redeploy: railway redeploy --service escashop-frontend"

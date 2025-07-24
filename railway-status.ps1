Write-Host "Railway EscaShop Status Check" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green

Write-Host "`nTesting backend health..." -ForegroundColor Yellow
try {
    $backend = Invoke-WebRequest -Uri "https://escashop-backend-production.up.railway.app/health" -Method Get -TimeoutSec 10
    Write-Host "Backend Status: $($backend.StatusCode) - HEALTHY" -ForegroundColor Green
} catch {
    Write-Host "Backend Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTesting frontend..." -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri "https://escashop-frontend-production.up.railway.app" -Method Head -TimeoutSec 10
    Write-Host "Frontend Status: $($frontend.StatusCode) - WORKING" -ForegroundColor Green
} catch {
    Write-Host "Frontend Error: 502 Bad Gateway" -ForegroundColor Red
    Write-Host "`nFrontend 502 Error - Likely Causes:" -ForegroundColor Yellow
    Write-Host "1. Port configuration issue" -ForegroundColor White
    Write-Host "2. Build failure" -ForegroundColor White
    Write-Host "3. Missing environment variables" -ForegroundColor White
    Write-Host "4. Start command problems" -ForegroundColor White
}

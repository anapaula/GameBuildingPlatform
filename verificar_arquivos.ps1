Write-Host "Verificando arquivos necessários..." -ForegroundColor Cyan
Write-Host ""

$basePath = "C:\Users\anapa\PilotoJogo"

# Verificar backend
Write-Host "Backend:" -ForegroundColor Yellow
$backendFiles = @("Dockerfile", "requirements.txt", "main.py", ".env")
foreach ($file in $backendFiles) {
    $path = Join-Path $basePath "backend\$file"
    if (Test-Path $path) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file (FALTANDO)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Frontend:" -ForegroundColor Yellow
$frontendFiles = @("Dockerfile", "package.json", ".env.local")
foreach ($file in $frontendFiles) {
    $path = Join-Path $basePath "frontend\$file"
    if (Test-Path $path) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file (FALTANDO)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Raiz:" -ForegroundColor Yellow
if (Test-Path (Join-Path $basePath "docker-compose.yml")) {
    Write-Host "  ✅ docker-compose.yml" -ForegroundColor Green
} else {
    Write-Host "  ❌ docker-compose.yml (FALTANDO)" -ForegroundColor Red
}


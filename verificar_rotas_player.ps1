# Script para verificar se as rotas do player estão corretas

Write-Host "Verificando estrutura de arquivos do player..." -ForegroundColor Yellow

$basePath = "frontend\app\player"

$files = @(
    "$basePath\page.tsx",
    "$basePath\layout.tsx",
    "$basePath\games\[gameId]\rooms\page.tsx"
)

$allExist = $true

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✓ $file existe" -ForegroundColor Green
    } else {
        Write-Host "✗ $file NÃO existe!" -ForegroundColor Red
        $allExist = $false
    }
}

if ($allExist) {
    Write-Host "`nTodos os arquivos existem!" -ForegroundColor Green
    Write-Host "`nPróximos passos:" -ForegroundColor Cyan
    Write-Host "1. Pare o servidor Next.js (Ctrl+C)" -ForegroundColor White
    Write-Host "2. Execute: cd frontend && Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue" -ForegroundColor White
    Write-Host "3. Execute: npm run dev" -ForegroundColor White
    Write-Host "4. Acesse: http://localhost:3000/player" -ForegroundColor White
} else {
    Write-Host "`nAlguns arquivos estão faltando!" -ForegroundColor Red
}



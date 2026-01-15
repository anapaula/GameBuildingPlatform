# Script para limpar cache do Next.js e reiniciar o servidor

Write-Host "Limpando cache do Next.js..." -ForegroundColor Yellow

# Navegar para o diretório frontend
Set-Location frontend

# Remover pasta .next (cache do Next.js)
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "Cache do Next.js removido!" -ForegroundColor Green
} else {
    Write-Host "Pasta .next não encontrada (pode não existir ainda)" -ForegroundColor Yellow
}

# Verificar se os arquivos da rota player existem
Write-Host "`nVerificando arquivos da rota /player/games..." -ForegroundColor Yellow

$files = @(
    "app\player\layout.tsx",
    "app\player\games\page.tsx",
    "app\player\games\[gameId]\rooms\page.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✓ $file existe" -ForegroundColor Green
    } else {
        Write-Host "✗ $file NÃO existe!" -ForegroundColor Red
    }
}

Write-Host "`nPróximos passos:" -ForegroundColor Cyan
Write-Host "1. Pare o servidor Next.js (Ctrl+C)" -ForegroundColor White
Write-Host "2. Execute: npm run dev" -ForegroundColor White
Write-Host "3. Acesse: http://localhost:3000/player/games" -ForegroundColor White

Set-Location ..



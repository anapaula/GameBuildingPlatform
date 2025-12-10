# Script para verificar ambiente e iniciar o sistema

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VERIFICAÇÃO DO AMBIENTE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Docker
Write-Host "Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker encontrado: $dockerVersion" -ForegroundColor Green
        $dockerAvailable = $true
    } else {
        $dockerAvailable = $false
    }
} catch {
    Write-Host "❌ Docker NÃO está instalado ou não está no PATH" -ForegroundColor Red
    $dockerAvailable = $false
}

Write-Host ""

# Verificar Python
Write-Host "Verificando Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python encontrado: $pythonVersion" -ForegroundColor Green
    $pythonAvailable = $true
} catch {
    Write-Host "❌ Python não encontrado" -ForegroundColor Red
    $pythonAvailable = $false
}

Write-Host ""

# Verificar Node.js
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
    $nodeAvailable = $true
} catch {
    Write-Host "❌ Node.js não encontrado" -ForegroundColor Red
    $nodeAvailable = $false
}

Write-Host ""

# Verificar PostgreSQL
Write-Host "Verificando PostgreSQL..." -ForegroundColor Yellow
$postgresAvailable = $false
try {
    $pgService = Get-Service -Name "*postgresql*" -ErrorAction SilentlyContinue
    if ($pgService) {
        Write-Host "✅ PostgreSQL encontrado como serviço" -ForegroundColor Green
        $postgresAvailable = $true
    } else {
        # Tentar conectar
        $pgTest = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
        if ($pgTest.TcpTestSucceeded) {
            Write-Host "✅ PostgreSQL está rodando na porta 5432" -ForegroundColor Green
            $postgresAvailable = $true
        } else {
            Write-Host "⚠️  PostgreSQL não encontrado (necessário para banco de dados)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠️  PostgreSQL não encontrado (necessário para banco de dados)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RECOMENDAÇÃO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($dockerAvailable) {
    Write-Host "✅ RECOMENDADO: Usar Docker Compose" -ForegroundColor Green
    Write-Host ""
    Write-Host "Execute o seguinte comando:" -ForegroundColor Yellow
    Write-Host "  docker-compose up -d" -ForegroundColor White
    Write-Host ""
    Write-Host "Isso iniciará:" -ForegroundColor Cyan
    Write-Host "  - PostgreSQL (banco de dados)" -ForegroundColor White
    Write-Host "  - Backend FastAPI (porta 8000)" -ForegroundColor White
    Write-Host "  - Frontend Next.js (porta 3000)" -ForegroundColor White
} elseif ($pythonAvailable -and $nodeAvailable -and $postgresAvailable) {
    Write-Host "✅ Você pode iniciar sem Docker" -ForegroundColor Green
    Write-Host ""
    Write-Host "Siga as instruções em: INICIAR_SISTEMA.md" -ForegroundColor Yellow
    Write-Host "Seção: OPÇÃO 2: Iniciar sem Docker" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  RECOMENDADO: Instalar Docker Desktop" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Docker facilita muito o processo!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Baixe: https://www.docker.com/products/docker-desktop/" -ForegroundColor White
    Write-Host "2. Instale e reinicie" -ForegroundColor White
    Write-Host "3. Execute: docker-compose up -d" -ForegroundColor White
    Write-Host ""
    Write-Host "OU instale PostgreSQL e siga INICIAR_SISTEMA.md" -ForegroundColor Yellow
}

Write-Host ""



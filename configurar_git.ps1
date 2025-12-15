# Script para configurar Git e GitHub
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURAÇÃO DO GIT E GITHUB" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Git está instalado
Write-Host "Verificando se o Git está instalado..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Git encontrado: $gitVersion" -ForegroundColor Green
        $gitInstalled = $true
    } else {
        $gitInstalled = $false
    }
} catch {
    Write-Host "❌ Git NÃO está instalado" -ForegroundColor Red
    $gitInstalled = $false
}

Write-Host ""

if (-not $gitInstalled) {
    Write-Host "⚠️  Git não está instalado!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Por favor:" -ForegroundColor Cyan
    Write-Host "1. Baixe o Git em: https://git-scm.com/download/win" -ForegroundColor White
    Write-Host "2. Instale o Git (mantenha as opções padrão)" -ForegroundColor White
    Write-Host "3. Reinicie o terminal" -ForegroundColor White
    Write-Host "4. Execute este script novamente" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou veja o guia completo em: CONFIGURAR_GIT.md" -ForegroundColor Cyan
    exit
}

# Verificar se já é um repositório Git
if (Test-Path .git) {
    Write-Host "✅ Repositório Git já inicializado" -ForegroundColor Green
} else {
    Write-Host "Inicializando repositório Git..." -ForegroundColor Yellow
    git init
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Repositório Git inicializado" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao inicializar repositório" -ForegroundColor Red
        exit
    }
}

Write-Host ""

# Verificar configuração do Git
Write-Host "Verificando configuração do Git..." -ForegroundColor Yellow
$userName = git config --global user.name
$userEmail = git config --global user.email

if ([string]::IsNullOrEmpty($userName)) {
    Write-Host "⚠️  Nome do usuário não configurado" -ForegroundColor Yellow
    $name = Read-Host "Digite seu nome para o Git"
    git config --global user.name $name
    Write-Host "✅ Nome configurado" -ForegroundColor Green
} else {
    Write-Host "✅ Nome configurado: $userName" -ForegroundColor Green
}

if ([string]::IsNullOrEmpty($userEmail)) {
    Write-Host "⚠️  Email do usuário não configurado" -ForegroundColor Yellow
    $email = Read-Host "Digite seu email para o Git"
    git config --global user.email $email
    Write-Host "✅ Email configurado" -ForegroundColor Green
} else {
    Write-Host "✅ Email configurado: $userEmail" -ForegroundColor Green
}

Write-Host ""

# Verificar se há commits
$hasCommits = git rev-parse --verify HEAD 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Já existem commits no repositório" -ForegroundColor Green
} else {
    Write-Host "Preparando primeiro commit..." -ForegroundColor Yellow
    git add .
    git commit -m "Initial commit: Plataforma de Jogo Online Multiagentes"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Primeiro commit criado" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Nenhum arquivo para commitar (pode ser normal se já estiver tudo commitado)" -ForegroundColor Yellow
    }
}

Write-Host ""

# Verificar remote
$remote = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Remote 'origin' configurado: $remote" -ForegroundColor Green
} else {
    Write-Host "⚠️  Remote 'origin' não configurado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para conectar ao GitHub:" -ForegroundColor Cyan
    Write-Host "1. Crie um repositório no GitHub (https://github.com/new)" -ForegroundColor White
    Write-Host "2. Execute:" -ForegroundColor White
    Write-Host "   git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git" -ForegroundColor Yellow
    Write-Host "   git branch -M main" -ForegroundColor Yellow
    Write-Host "   git push -u origin main" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ou veja o guia completo em: CONFIGURAR_GIT.md" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURAÇÃO CONCLUÍDA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Comandos úteis:" -ForegroundColor Cyan
Write-Host "  git status          - Ver status do repositório" -ForegroundColor White
Write-Host "  git add .           - Adicionar arquivos" -ForegroundColor White
Write-Host "  git commit -m 'msg' - Fazer commit" -ForegroundColor White
Write-Host "  git push            - Enviar para GitHub" -ForegroundColor White
Write-Host ""



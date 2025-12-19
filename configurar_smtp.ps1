# Script para configurar SMTP no arquivo .env
# Execute este script no PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuracao de SMTP para E-mails" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$envFile = "backend\.env"

# Verificar se o arquivo existe
if (-not (Test-Path $envFile)) {
    Write-Host "Arquivo .env nao encontrado. Criando..." -ForegroundColor Yellow
    New-Item -Path $envFile -ItemType File -Force | Out-Null
}

# Ler conteúdo atual
$envContent = Get-Content $envFile -ErrorAction SilentlyContinue

# Remover configurações SMTP antigas se existirem
$envContent = $envContent | Where-Object { 
    $_ -notmatch "^SMTP_" -and $_ -notmatch "^# SMTP"
}

# Menu de seleção
Write-Host "Selecione o provedor de e-mail:" -ForegroundColor Green
Write-Host "1. Gmail" -ForegroundColor White
Write-Host "2. Outlook/Hotmail" -ForegroundColor White
Write-Host "3. Yahoo" -ForegroundColor White
Write-Host "4. Outro (configuracao manual)" -ForegroundColor White
Write-Host ""
$escolha = Read-Host "Digite o numero da opcao (1-4)"

$smtpHost = ""
$smtpPort = "587"
$smtpUser = ""
$smtpPassword = ""
$smtpFromEmail = ""
$smtpFromName = "Plataforma de Jogo Online"

switch ($escolha) {
    "1" {
        Write-Host ""
        Write-Host "=== Configuracao Gmail ===" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "IMPORTANTE: Para usar Gmail, voce precisa:" -ForegroundColor Yellow
        Write-Host "1. Ter verificacao em duas etapas ativada" -ForegroundColor Yellow
        Write-Host "2. Gerar uma 'Senha de App' em:" -ForegroundColor Yellow
        Write-Host "   https://myaccount.google.com/apppasswords" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Passos:" -ForegroundColor Green
        Write-Host "1. Acesse o link acima" -ForegroundColor White
        Write-Host "2. Selecione 'App' e 'Outro (nome personalizado)'" -ForegroundColor White
        Write-Host "3. Digite 'Plataforma de Jogo' e clique em 'Gerar'" -ForegroundColor White
        Write-Host "4. Copie a senha de 16 caracteres gerada" -ForegroundColor White
        Write-Host ""
        
        $smtpHost = "smtp.gmail.com"
        $smtpPort = "587"
        $smtpUser = Read-Host "Digite seu e-mail do Gmail"
        $smtpPassword = Read-Host "Digite a senha de app gerada (16 caracteres)" -AsSecureString
        $smtpPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpPassword)
        )
        $smtpFromEmail = $smtpUser
    }
    "2" {
        Write-Host ""
        Write-Host "=== Configuracao Outlook/Hotmail ===" -ForegroundColor Cyan
        Write-Host ""
        $smtpHost = "smtp-mail.outlook.com"
        $smtpPort = "587"
        $smtpUser = Read-Host "Digite seu e-mail do Outlook/Hotmail"
        $smtpPassword = Read-Host "Digite sua senha" -AsSecureString
        $smtpPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpPassword)
        )
        $smtpFromEmail = $smtpUser
    }
    "3" {
        Write-Host ""
        Write-Host "=== Configuracao Yahoo ===" -ForegroundColor Cyan
        Write-Host ""
        $smtpHost = "smtp.mail.yahoo.com"
        $smtpPort = "587"
        $smtpUser = Read-Host "Digite seu e-mail do Yahoo"
        $smtpPassword = Read-Host "Digite sua senha" -AsSecureString
        $smtpPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpPassword)
        )
        $smtpFromEmail = $smtpUser
    }
    "4" {
        Write-Host ""
        Write-Host "=== Configuracao Manual ===" -ForegroundColor Cyan
        Write-Host ""
        $smtpHost = Read-Host "Digite o servidor SMTP (ex: smtp.exemplo.com)"
        $smtpPort = Read-Host "Digite a porta SMTP (padrao: 587)"
        if ([string]::IsNullOrWhiteSpace($smtpPort)) {
            $smtpPort = "587"
        }
        $smtpUser = Read-Host "Digite seu e-mail"
        $smtpPassword = Read-Host "Digite sua senha" -AsSecureString
        $smtpPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpPassword)
        )
        $smtpFromEmail = Read-Host "Digite o e-mail remetente (ou pressione Enter para usar o mesmo)"
        if ([string]::IsNullOrWhiteSpace($smtpFromEmail)) {
            $smtpFromEmail = $smtpUser
        }
    }
    default {
        Write-Host "Opcao invalida!" -ForegroundColor Red
        exit 1
    }
}

# Perguntar nome do remetente
$smtpFromName = Read-Host "Digite o nome do remetente (ou pressione Enter para usar 'Plataforma de Jogo Online')"
if ([string]::IsNullOrWhiteSpace($smtpFromName)) {
    $smtpFromName = "Plataforma de Jogo Online"
}

# Adicionar configurações SMTP ao arquivo
Write-Host ""
Write-Host "Adicionando configuracoes ao arquivo .env..." -ForegroundColor Green

# Adicionar linha em branco se necessário
if ($envContent.Count -gt 0 -and $envContent[-1] -ne "") {
    $envContent += ""
}

# Adicionar configurações SMTP
$envContent += "# SMTP Configuration"
$envContent += "SMTP_HOST=$smtpHost"
$envContent += "SMTP_PORT=$smtpPort"
$envContent += "SMTP_USER=$smtpUser"
$envContent += "SMTP_PASSWORD=$smtpPassword"
$envContent += "SMTP_FROM_EMAIL=$smtpFromEmail"
$envContent += "SMTP_FROM_NAME=$smtpFromName"

# Salvar arquivo
$envContent | Set-Content $envFile -Encoding UTF8

Write-Host ""
Write-Host "Configuracao SMTP adicionada com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "1. Reinicie o backend com: docker-compose restart backend" -ForegroundColor White
Write-Host "2. Teste enviando um convite para facilitador ou jogador" -ForegroundColor White
Write-Host "3. Verifique os logs com: docker-compose logs backend" -ForegroundColor White
Write-Host ""

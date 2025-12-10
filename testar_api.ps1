# Script para testar a API do jogo online
# Execute: .\testar_api.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE DA API - JOGO ONLINE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8000"
$token = $null
$testResults = @()

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [hashtable]$Headers = @{},
        [string]$Description,
        [string]$ContentType = "application/json"
    )
    
    Write-Host "[TESTE] $Description" -ForegroundColor Yellow
    Write-Host "   $Method $Endpoint" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = "$baseUrl$Endpoint"
            Method = $Method
            Headers = $Headers
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            if ($ContentType -eq "application/x-www-form-urlencoded") {
                # Converter hashtable para form-urlencoded
                $formData = ($Body.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
                $params.Body = $formData
                $params.ContentType = $ContentType
            } else {
                $params.Body = ($Body | ConvertTo-Json -Depth 10)
                $params.ContentType = $ContentType
            }
        }
        
        $response = Invoke-RestMethod @params
        $statusCode = 200
        
        Write-Host "   [OK] SUCESSO (200)" -ForegroundColor Green
        if ($response) {
            $responseJson = $response | ConvertTo-Json -Compress -Depth 2
            if ($responseJson.Length -gt 200) {
                $responseJson = $responseJson.Substring(0, 200) + "..."
            }
            Write-Host "   Resposta: $responseJson" -ForegroundColor Gray
        }
        
        $script:testResults += @{
            Test = $Description
            Status = "PASSOU"
            StatusCode = $statusCode
        }
        
        return $response
    }
    catch {
        $statusCode = "N/A"
        $errorMessage = $_.Exception.Message
        
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
        }
        
        Write-Host "   [ERRO] FALHOU ($statusCode)" -ForegroundColor Red
        Write-Host "   Erro: $errorMessage" -ForegroundColor Red
        
        $script:testResults += @{
            Test = $Description
            Status = "FALHOU"
            StatusCode = $statusCode
            Error = $errorMessage
        }
        
        return $null
    }
    finally {
        Write-Host ""
    }
}

# Teste 1: Verificar se a API está online
Write-Host "[VERIFICACAO] Verificando se a API esta online..." -ForegroundColor Cyan
try {
    $healthCheck = Invoke-RestMethod -Uri "$baseUrl/docs" -Method GET -ErrorAction Stop
    Write-Host "[OK] API esta ONLINE" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "[ERRO] API NAO esta respondendo" -ForegroundColor Red
    Write-Host "   Verifique se o backend esta rodando: docker ps" -ForegroundColor Yellow
    exit 1
}

# Teste 2: Verificar endpoint raiz
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTES DE ENDPOINTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Teste 3: Endpoint de documentação
Test-Endpoint -Method "GET" -Endpoint "/docs" -Description "Documentacao da API (Swagger)"

# Teste 4: Endpoint OpenAPI JSON
Test-Endpoint -Method "GET" -Endpoint "/openapi.json" -Description "Esquema OpenAPI"

# Teste 5: Tentar criar usuário (sem autenticação primeiro)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTES DE AUTENTICACAO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Teste de health check
Test-Endpoint -Method "GET" -Endpoint "/api/health" -Description "Health Check da API"

# Teste de registro de usuário
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$registerData = @{
    username = "teste_$timestamp"
    email = "teste_$timestamp@teste.com"
    password = "senha123456"
}

$registerResponse = Test-Endpoint -Method "POST" -Endpoint "/api/auth/register" -Body $registerData -Description "Registro de novo usuario"

# Se registro foi bem-sucedido, fazer login com o usuário criado
if ($registerResponse -and $registerResponse.username) {
    Write-Host "[INFO] Usuario criado com sucesso. Fazendo login..." -ForegroundColor Cyan
    
    $loginData = @{
        username = $registerData.username
        password = $registerData.password
    }
    
    $loginResponse = Test-Endpoint -Method "POST" -Endpoint "/api/auth/login" -Body $loginData -Description "Login com usuario criado" -ContentType "application/x-www-form-urlencoded"
    
    if ($loginResponse -and $loginResponse.access_token) {
        $token = $loginResponse.access_token
        Write-Host "[OK] Token obtido: $($token.Substring(0, [Math]::Min(20, $token.Length)))..." -ForegroundColor Green
        Write-Host ""
    }
}

# Se ainda não tem token, tenta fazer login com credenciais existentes
if (-not $token) {
    Write-Host "[AVISO] Tentando login com credenciais existentes..." -ForegroundColor Yellow
    
    $loginData = @{
        username = "teste"
        password = "senha123456"
    }
    
    $loginResponse = Test-Endpoint -Method "POST" -Endpoint "/api/auth/login" -Body $loginData -Description "Login com credenciais existentes" -ContentType "application/x-www-form-urlencoded"
    
    if ($loginResponse -and $loginResponse.access_token) {
        $token = $loginResponse.access_token
        Write-Host "[OK] Token obtido: $($token.Substring(0, [Math]::Min(20, $token.Length)))..." -ForegroundColor Green
        Write-Host ""
    }
}

# Testes com autenticação
if ($token) {
    $authHeaders = @{
        "Authorization" = "Bearer $token"
    }
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  TESTES COM AUTENTICACAO" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Teste: Obter perfil do usuário atual
    Test-Endpoint -Method "GET" -Endpoint "/api/auth/me" -Headers $authHeaders -Description "Obter perfil do usuario atual"
    
    # Teste: Listar salas
    Test-Endpoint -Method "GET" -Endpoint "/api/rooms/" -Headers $authHeaders -Description "Listar salas disponiveis"
    
    # Teste: Criar sala
    $roomData = @{
        name = "Sala de Teste"
        description = "Sala criada para testes automatizados"
        max_players = 4
    }
    
    $newRoom = Test-Endpoint -Method "POST" -Endpoint "/api/rooms/" -Body $roomData -Headers $authHeaders -Description "Criar nova sala"
    
    # Se conseguiu criar sala, testar entrar nela
    if ($newRoom -and $newRoom.id) {
        Test-Endpoint -Method "POST" -Endpoint "/api/rooms/$($newRoom.id)/join" -Headers $authHeaders -Description "Entrar na sala criada"
        
        # Teste: Obter detalhes da sala
        Test-Endpoint -Method "GET" -Endpoint "/api/rooms/$($newRoom.id)" -Headers $authHeaders -Description "Obter detalhes da sala"
    }
    
    # Teste: Listar usuários (pode requerer permissões de admin)
    Test-Endpoint -Method "GET" -Endpoint "/api/users/" -Headers $authHeaders -Description "Listar usuarios"
    
    # Teste: Obter configuração LLM ativa
    Test-Endpoint -Method "GET" -Endpoint "/api/llm/active" -Headers $authHeaders -Description "Obter configuracao LLM ativa"
}

# Resumo dos testes
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$passed = ($testResults | Where-Object { $_.Status -eq "PASSOU" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FALHOU" }).Count
$total = $testResults.Count

Write-Host "Total de testes: $total" -ForegroundColor White
Write-Host "[OK] Passou: $passed" -ForegroundColor Green
Write-Host "[ERRO] Falhou: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "[SUCESSO] TODOS OS TESTES PASSARAM!" -ForegroundColor Green
} else {
    Write-Host "[AVISO] Alguns testes falharam. Veja os detalhes acima." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[DICA] Acesse http://localhost:8000/docs para ver a documentacao interativa" -ForegroundColor Cyan
Write-Host ""

# 🚀 Como Rodar o Projeto

Este guia mostra como iniciar a plataforma de jogo online com configuração de LLMs.

## 📋 Pré-requisitos

- **Python 3.11+** (você tem: 3.13.5 ✅)
- **Node.js 18+** (você tem: v22.17.1 ✅)
- **PostgreSQL** OU **Docker Desktop** (recomendado)

---

## 🐳 OPÇÃO 1: Usando Docker (Recomendado)

Esta é a forma mais fácil e garante que tudo funcione corretamente.

### Passo 1: Instalar Docker Desktop (se ainda não tiver)

1. Baixe em: https://www.docker.com/products/docker-desktop/
2. Instale e reinicie o computador
3. Abra o Docker Desktop e aguarde até aparecer "Docker Desktop is running"

### Passo 2: Iniciar o Sistema

Abra o PowerShell no diretório do projeto e execute:

```powershell
cd C:\Users\anapa\PilotoJogo
docker-compose up -d
```

Isso iniciará:
- ✅ PostgreSQL (banco de dados) na porta 5432
- ✅ Backend FastAPI na porta 8000
- ✅ Frontend Next.js na porta 3000

### Passo 3: Verificar se está rodando

```powershell
docker-compose ps
```

Você deve ver os 3 serviços rodando.

### Passo 4: Criar usuário admin

Execute o script para criar o usuário admin:

```powershell
docker-compose exec backend python scripts/create_admin_simple.py
```

**Credenciais padrão:**
- Username: `admin`
- Password: `admin123`

### Passo 5: Acessar a aplicação

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Documentação da API:** http://localhost:8000/docs

### Comandos úteis do Docker

```powershell
# Parar os serviços
docker-compose down

# Ver logs
docker-compose logs -f

# Ver logs apenas do backend
docker-compose logs -f backend

# Reiniciar os serviços
docker-compose restart
```

---

## 💻 OPÇÃO 2: Sem Docker (Desenvolvimento Local)

Se preferir rodar sem Docker, siga estes passos:

### Passo 1: Instalar PostgreSQL

1. Baixe em: https://www.postgresql.org/download/windows/
2. Instale com as configurações padrão:
   - Porta: **5432**
   - Username: **postgres**
   - Password: **postgres** (ou escolha uma)

### Passo 2: Criar Banco de Dados

Abra o pgAdmin ou execute no terminal:

```sql
CREATE DATABASE jogo_online;
```

### Passo 3: Configurar Backend

1. Crie um arquivo `.env` em `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jogo_online
SECRET_KEY=seu-secret-key-aqui-mude-em-producao
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

2. Instale as dependências do Python:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Passo 4: Iniciar Backend

Em um terminal:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

O backend estará em: **http://localhost:8000**

### Passo 5: Criar usuário admin

Em outro terminal:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python scripts/create_admin_simple.py
```

**Credenciais padrão:**
- Username: `admin`
- Password: `admin123`

### Passo 6: Configurar Frontend

1. Crie um arquivo `.env.local` em `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

2. Instale as dependências:

```powershell
cd frontend
npm install
```

### Passo 7: Iniciar Frontend

Em outro terminal:

```powershell
cd frontend
npm run dev
```

O frontend estará em: **http://localhost:3000**

---

## 🎮 Usando a Aplicação

### 1. Fazer Login

1. Acesse: http://localhost:3000/login
2. Use as credenciais:
   - Username: `admin`
   - Password: `admin123`

### 2. Configurar LLMs

1. Após fazer login, vá para a área de **Admin**
2. Clique em **Configurações de LLM**
3. Clique em **Nova Configuração**
4. Preencha os dados:
   - **Provider:** OpenAI ou Anthropic
   - **Modelo:** ex: `gpt-4`, `claude-3-opus`
   - **API Key:** sua chave da API
   - **Custo por Token:** (opcional)
   - **Max Tokens:** (opcional)
   - **Temperature:** (padrão: 0.7)

5. Clique em **Criar**
6. Clique em **Ativar** para ativar a configuração
7. Use **Testar** para verificar se está funcionando

### 3. Outras Funcionalidades

- **Regras do Jogo:** Criar e gerenciar regras
- **Cenários:** Criar e gerenciar cenários do jogo
- **Sessões:** Ver sessões de jogo
- **Usuários:** Gerenciar usuários

---

## 🔧 Solução de Problemas

### Erro: "Docker não está instalado"

**Solução:** Instale o Docker Desktop ou use a OPÇÃO 2 (sem Docker).

### Erro: "Porta 5432 já está em uso"

**Solução:** 
- Se estiver usando Docker, pare outros containers PostgreSQL
- Se estiver usando PostgreSQL local, pare o serviço ou mude a porta no docker-compose.yml

### Erro: "Não consigo conectar ao banco de dados"

**Solução:**
- Verifique se o PostgreSQL está rodando
- Verifique se a DATABASE_URL está correta no `.env`
- Se estiver usando Docker, aguarde alguns segundos para o banco inicializar

### Erro: "Module not found" no backend

**Solução:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Erro: "Module not found" no frontend

**Solução:**
```powershell
cd frontend
npm install
```

### Erro: "CORS" no navegador

**Solução:** Verifique se o `NEXT_PUBLIC_API_URL` no frontend está apontando para o backend correto.

---

## 📝 Scripts Úteis

### Verificar Ambiente

Execute o script de verificação:

```powershell
.\iniciar.ps1
```

Este script verifica se você tem Docker, Python, Node.js e PostgreSQL instalados.

---

## 🎯 Próximos Passos

Após iniciar o sistema:

1. ✅ Fazer login como admin
2. ✅ Configurar pelo menos uma LLM (OpenAI ou Anthropic)
3. ✅ Criar regras do jogo
4. ✅ Criar cenários
5. ✅ Começar a jogar!

---

## 📚 Documentação Adicional

- **Backend API Docs:** http://localhost:8000/docs (quando o backend estiver rodando)
- **Resumo do Sistema:** Veja `RESUMO_SISTEMA.md`
- **Próximos Passos:** Veja `PROXIMOS_PASSOS.md`

---

## ⚠️ Notas Importantes

- **API Keys:** Nunca commite suas API keys no código. Use arquivos `.env` que estão no `.gitignore`
- **Senha do Admin:** Mude a senha padrão em produção!
- **Secret Key:** Mude o SECRET_KEY em produção!
- **Banco de Dados:** Em produção, use um banco de dados seguro e faça backups regularmente

---

**Boa sorte e divirta-se! 🎮**


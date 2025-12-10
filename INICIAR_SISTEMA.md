# 🚀 Como Iniciar o Sistema

## ⚠️ IMPORTANTE: Docker não está instalado

Você tem duas opções:

---

## OPÇÃO 1: Instalar Docker Desktop (Recomendado)

### Passo 1: Baixar Docker Desktop
1. Acesse: https://www.docker.com/products/docker-desktop/
2. Baixe o Docker Desktop para Windows
3. Instale e reinicie o computador

### Passo 2: Iniciar Docker Desktop
1. Abra o Docker Desktop
2. Aguarde até aparecer "Docker Desktop is running"

### Passo 3: Iniciar o Sistema
No terminal, execute:

```powershell
cd C:\Users\anapa\PilotoJogo
docker-compose up -d
```

### Passo 4: Verificar Status
```powershell
docker-compose ps
```

---

## OPÇÃO 2: Iniciar sem Docker (Desenvolvimento Local)

### Pré-requisitos:
- ✅ Python 3.11+ (você tem: 3.13.5)
- ✅ Node.js 18+ (você tem: v22.17.1)
- ⚠️ PostgreSQL (precisa instalar)

### Passo 1: Instalar PostgreSQL

1. Baixe em: https://www.postgresql.org/download/windows/
2. Instale com as configurações padrão:
   - Porta: 5432
   - Username: postgres
   - Password: postgres (ou escolha uma)

### Passo 2: Criar Banco de Dados

Abra o pgAdmin ou execute no terminal:

```sql
CREATE DATABASE jogo_online;
```

### Passo 3: Instalar Dependências do Backend

```powershell
cd C:\Users\anapa\PilotoJogo\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Passo 4: Configurar Banco de Dados Local

Edite `backend/.env` e altere:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jogo_online
```

### Passo 5: Iniciar Backend

```powershell
cd C:\Users\anapa\PilotoJogo\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

O backend estará em: http://localhost:8000

### Passo 6: Instalar Dependências do Frontend

Em outro terminal:

```powershell
cd C:\Users\anapa\PilotoJogo\frontend
npm install
```

### Passo 7: Iniciar Frontend

```powershell
cd C:\Users\anapa\PilotoJogo\frontend
npm run dev
```

O frontend estará em: http://localhost:3000

---

## 🎯 Recomendação

**Use a OPÇÃO 1 (Docker)** - É mais fácil e garante que tudo funcione corretamente!

Após instalar o Docker Desktop, volte aqui e execute:

```powershell
cd C:\Users\anapa\PilotoJogo
docker-compose up -d
```



# 💻 Comandos para Rodar no Prompt de Comando (CMD)

Guia rápido com os comandos exatos para rodar o projeto no Windows.

---

## 🐳 OPÇÃO 1: Usando Docker (Recomendado)

### 1. Abrir o Prompt de Comando

Pressione `Win + R`, digite `cmd` e pressione Enter.

### 2. Navegar até a pasta do projeto

```cmd
cd C:\Users\anapa\PilotoJogo
```

### 3. Verificar se o Docker está instalado

```cmd
docker --version
```

Se aparecer um erro, instale o Docker Desktop primeiro: https://www.docker.com/products/docker-desktop/

### 4. Iniciar o sistema

```cmd
docker-compose up -d
```

Aguarde alguns minutos enquanto as imagens são baixadas e os containers são criados.

### 5. Verificar se está rodando

```cmd
docker-compose ps
```

Você deve ver 3 serviços: `postgres`, `backend` e `frontend`.

### 6. Criar usuário admin

```cmd
docker-compose exec backend python scripts/create_admin_simple.py
```

### 7. Ver logs (opcional)

```cmd
docker-compose logs -f
```

Para sair dos logs, pressione `Ctrl + C`.

### 8. Parar o sistema (quando terminar)

```cmd
docker-compose down
```

---

## 💻 OPÇÃO 2: Sem Docker (Desenvolvimento Local)

### Pré-requisito: Instalar PostgreSQL

Baixe e instale: https://www.postgresql.org/download/windows/

---

### PARTE 1: Configurar o Backend

#### 1. Abrir o Prompt de Comando e navegar até a pasta do backend

```cmd
cd C:\Users\anapa\PilotoJogo\backend
```

#### 2. Criar ambiente virtual Python

```cmd
python -m venv venv
```

#### 3. Ativar o ambiente virtual

```cmd
venv\Scripts\activate.bat
```

**Nota:** Após ativar, você verá `(venv)` no início da linha do prompt.

#### 4. Instalar dependências

```cmd
pip install -r requirements.txt
```

#### 5. Criar arquivo .env

Crie um arquivo chamado `.env` na pasta `backend` com este conteúdo:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jogo_online
SECRET_KEY=seu-secret-key-aqui-mude-em-producao
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

**Como criar o arquivo .env:**
```cmd
echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jogo_online > .env
echo SECRET_KEY=seu-secret-key-aqui-mude-em-producao >> .env
echo ALGORITHM=HS256 >> .env
echo ACCESS_TOKEN_EXPIRE_MINUTES=1440 >> .env
```

#### 6. Criar banco de dados (se ainda não criou)

Abra o pgAdmin ou execute no psql:

```cmd
psql -U postgres
```

Depois execute:
```sql
CREATE DATABASE jogo_online;
\q
```

#### 7. Iniciar o backend

```cmd
uvicorn main:app --reload
```

O backend estará rodando em: **http://localhost:8000**

**Mantenha este terminal aberto!**

---

### PARTE 2: Criar Usuário Admin (em outro terminal)

#### 1. Abrir um NOVO Prompt de Comando

#### 2. Navegar até a pasta do backend

```cmd
cd C:\Users\anapa\PilotoJogo\backend
```

#### 3. Ativar o ambiente virtual

```cmd
venv\Scripts\activate.bat
```

#### 4. Criar o admin

```cmd
python scripts/create_admin_simple.py
```

Você verá:
```
✅ Admin criado com sucesso!
   Username: admin
   Password: admin123
```

---

### PARTE 3: Configurar o Frontend

#### 1. Abrir um NOVO Prompt de Comando

#### 2. Navegar até a pasta do frontend

```cmd
cd C:\Users\anapa\PilotoJogo\frontend
```

#### 3. Instalar dependências

```cmd
npm install
```

Aguarde alguns minutos enquanto as dependências são instaladas.

#### 4. Criar arquivo .env.local

Crie um arquivo chamado `.env.local` na pasta `frontend`:

```cmd
echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
```

#### 5. Iniciar o frontend

```cmd
npm run dev
```

O frontend estará rodando em: **http://localhost:3000**

**Mantenha este terminal aberto!**

---

## 📋 Resumo dos Comandos (Docker - Mais Fácil)

```cmd
cd C:\Users\anapa\PilotoJogo
docker-compose up -d
docker-compose exec backend python scripts/create_admin_simple.py
```

Depois acesse:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

---

## 📋 Resumo dos Comandos (Sem Docker)

### Terminal 1 - Backend:
```cmd
cd C:\Users\anapa\PilotoJogo\backend
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
uvicorn main:app --reload
```

### Terminal 2 - Criar Admin:
```cmd
cd C:\Users\anapa\PilotoJogo\backend
venv\Scripts\activate.bat
python scripts/create_admin_simple.py
```

### Terminal 3 - Frontend:
```cmd
cd C:\Users\anapa\PilotoJogo\frontend
npm install
npm run dev
```

---

## 🔍 Comandos Úteis

### Verificar se está tudo rodando (Docker)

```cmd
docker-compose ps
```

### Ver logs do backend (Docker)

```cmd
docker-compose logs -f backend
```

### Ver logs do frontend (Docker)

```cmd
docker-compose logs -f frontend
```

### Parar tudo (Docker)

```cmd
docker-compose down
```

### Reiniciar tudo (Docker)

```cmd
docker-compose restart
```

### Verificar versões instaladas

```cmd
python --version
node --version
docker --version
```

---

## ⚠️ Problemas Comuns

### Erro: "python não é reconhecido"

**Solução:** Use `py` em vez de `python`:
```cmd
py -m venv venv
py scripts/create_admin_simple.py
```

### Erro: "npm não é reconhecido"

**Solução:** Instale o Node.js: https://nodejs.org/

### Erro: "docker não é reconhecido"

**Solução:** Instale o Docker Desktop: https://www.docker.com/products/docker-desktop/

### Erro: "pip não é reconhecido"

**Solução:** Use `py -m pip`:
```cmd
py -m pip install -r requirements.txt
```

### Erro: "Porta 8000 já está em uso"

**Solução:** Pare o processo que está usando a porta ou mude a porta no comando:
```cmd
uvicorn main:app --reload --port 8001
```

### Erro: "Porta 3000 já está em uso"

**Solução:** O Next.js perguntará se quer usar outra porta. Digite `Y` e Enter.

---

## ✅ Checklist Rápido

- [ ] Docker instalado OU PostgreSQL instalado
- [ ] Python 3.11+ instalado
- [ ] Node.js 18+ instalado
- [ ] Navegou até a pasta do projeto
- [ ] Executou `docker-compose up -d` OU configurou backend/frontend separadamente
- [ ] Criou o usuário admin
- [ ] Acessou http://localhost:3000

---

**Pronto! Agora você pode começar a usar a plataforma! 🎮**



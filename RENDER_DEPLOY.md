## Publicação no Render (gratuito)

### 1) Criar o Postgres
- No Render, crie um **PostgreSQL** gratuito.
- Copie a `DATABASE_URL` gerada pelo Render.

### 2) Publicar o backend (FastAPI)
- Crie um **Web Service** apontando para este repositório.
- **Root directory**: `backend`
- **Build command**: `pip install -r requirements.txt`
- **Start command**: `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2 --timeout-keep-alive 30`

**Variáveis de ambiente (backend):**
- `DATABASE_URL` = sua URL do Postgres
- `SECRET_KEY` = chave segura
- `ALGORITHM` = `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES` = `1440`
- `CORS_ORIGINS` = URL do frontend (ex.: `https://seu-frontend.onrender.com`)

**Seed inicial (admin + cenas + regras):**
- Configure:
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - `ADMIN_USERNAME` (opcional)
  - `GAME_TITLE` (opcional)
  - `GAME_DESCRIPTION` (opcional)
  - `GAME_COVER_FILENAME` (opcional)
- Abra o **Shell** do serviço no Render e execute:
  - `python scripts/seed_initial_data.py`

### 3) Publicar o frontend (Next.js)
- Crie outro **Web Service** no Render.
- **Root directory**: `frontend`
- **Build command**: `npm install && npm run build`
- **Start command**: `npm run start`

**Variáveis de ambiente (frontend):**
- `NEXT_PUBLIC_API_URL` = URL do backend (ex.: `https://seu-backend.onrender.com`)

### 4) Testes rápidos
- Acesse o frontend, faça login como admin.
- Verifique se o jogo, regras e cenas aparecem.
- Crie novos admins em `Admin > Admins`.

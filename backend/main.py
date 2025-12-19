from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import uvicorn

from database import SessionLocal, engine, Base
from routers import auth, users, rooms, sessions, admin, game, llm_config, audio, games, facilitator, player
from models import User, Room, GameSession, Scenario

# Criar tabelas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Plataforma de Jogo Online Multiagentes",
    description="Sistema completo para jogos online com IA",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticação"])
app.include_router(users.router, prefix="/api/users", tags=["Usuários"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["Salas"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessões"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(game.router, prefix="/api/game", tags=["Jogo"])
app.include_router(llm_config.router, prefix="/api/llm", tags=["LLM"])
app.include_router(audio.router, prefix="/api/audio", tags=["Áudio"])
app.include_router(games.router, prefix="/api/admin/games", tags=["Jogos"])
app.include_router(facilitator.router, prefix="/api/facilitator", tags=["Facilitador"])
app.include_router(player.router, prefix="/api/player", tags=["Jogador"])
app.include_router(player.router, prefix="/api/player", tags=["Jogador"])

@app.get("/")
async def root():
    return {"message": "Plataforma de Jogo Online Multiagentes API"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


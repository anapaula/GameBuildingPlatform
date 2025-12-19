from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
from models import GameSession, User, PlayerGameAccess, UserRole
from schemas import GameSessionCreate, GameSessionResponse
from auth import get_current_active_user

router = APIRouter()

@router.post("/", response_model=GameSessionResponse, status_code=201)
async def create_session(session_data: GameSessionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    active_session = db.query(GameSession).filter(GameSession.player_id == current_user.id, GameSession.status == "active").first()
    if active_session:
        return active_session
    
    from models import Game
    
    # Se não houver game_id, buscar o primeiro jogo disponível para o usuário
    game_id = session_data.game_id
    if not game_id:
        # Para jogadores, buscar primeiro jogo ao qual têm acesso
        if current_user.role == UserRole.PLAYER:
            access = db.query(PlayerGameAccess).filter(
                PlayerGameAccess.player_id == current_user.id
            ).first()
            if access:
                game_id = access.game_id
            else:
                raise HTTPException(status_code=403, detail="Você não tem acesso a nenhum jogo. Entre em contato com seu facilitador.")
        else:
            # Admin e facilitadores podem acessar qualquer jogo
            first_game = db.query(Game).filter(Game.is_active == True).order_by(Game.created_at).first()
            if first_game:
                game_id = first_game.id
            else:
                raise HTTPException(status_code=400, detail="Nenhum jogo disponível. Crie um jogo primeiro.")
    else:
        # Verificar se o jogador tem acesso ao jogo solicitado
        if current_user.role == UserRole.PLAYER:
            access = db.query(PlayerGameAccess).filter(
                PlayerGameAccess.player_id == current_user.id,
                PlayerGameAccess.game_id == game_id
            ).first()
            if not access:
                raise HTTPException(status_code=403, detail="Você não tem acesso a este jogo.")
        
        # Verificar se o jogo existe e está ativo
        game = db.query(Game).filter(Game.id == game_id, Game.is_active == True).first()
        if not game:
            raise HTTPException(status_code=404, detail="Jogo não encontrado ou inativo")
    
    db_session = GameSession(
        game_id=game_id,
        player_id=current_user.id, 
        room_id=session_data.room_id, 
        llm_provider=session_data.llm_provider, 
        llm_model=session_data.llm_model,
        current_scenario_id=session_data.scenario_id,  # Mapear scenario_id para current_scenario_id
        status="active"
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.get("/", response_model=List[GameSessionResponse])
async def list_sessions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role.value == "ADMIN":
        sessions = db.query(GameSession).offset(skip).limit(limit).all()
    else:
        sessions = db.query(GameSession).filter(GameSession.player_id == current_user.id).offset(skip).limit(limit).all()
    return sessions

@router.get("/{session_id}", response_model=GameSessionResponse)
async def get_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if current_user.role.value != "ADMIN" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    return session

@router.patch("/{session_id}/pause")
async def pause_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if current_user.role.value != "ADMIN" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    session.status = "paused"
    session.last_activity = datetime.utcnow()
    db.commit()
    return {"message": "Sessão pausada com sucesso"}

@router.patch("/{session_id}/resume")
async def resume_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if current_user.role.value != "ADMIN" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    session.status = "active"
    session.last_activity = datetime.utcnow()
    db.commit()
    return {"message": "Sessão retomada com sucesso"}

@router.patch("/{session_id}/llm")
async def change_session_llm(session_id: int, llm_config_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    from models import LLMConfiguration
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if current_user.role.value != "ADMIN" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    llm_config = db.query(LLMConfiguration).filter(LLMConfiguration.id == llm_config_id).first()
    if not llm_config:
        raise HTTPException(status_code=404, detail="Configuração de LLM não encontrada")
    
    session.llm_provider = llm_config.provider.value
    session.llm_model = llm_config.model_name
    session.last_activity = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return {"message": "LLM da sessão alterada com sucesso", "llm_provider": session.llm_provider, "llm_model": session.llm_model}
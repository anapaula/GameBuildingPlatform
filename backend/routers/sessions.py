from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
from models import GameSession, User
from schemas import GameSessionCreate, GameSessionResponse
from auth import get_current_active_user

router = APIRouter()

@router.post("/", response_model=GameSessionResponse, status_code=201)
async def create_session(session_data: GameSessionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    active_session = db.query(GameSession).filter(GameSession.player_id == current_user.id, GameSession.status == "active").first()
    if active_session:
        return active_session
    db_session = GameSession(player_id=current_user.id, room_id=session_data.room_id, llm_provider=session_data.llm_provider, llm_model=session_data.llm_model, status="active")
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.get("/", response_model=List[GameSessionResponse])
async def list_sessions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role.value == "admin":
        sessions = db.query(GameSession).offset(skip).limit(limit).all()
    else:
        sessions = db.query(GameSession).filter(GameSession.player_id == current_user.id).offset(skip).limit(limit).all()
    return sessions

@router.get("/{session_id}", response_model=GameSessionResponse)
async def get_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if current_user.role.value != "admin" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    return session

@router.patch("/{session_id}/pause")
async def pause_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if current_user.role.value != "admin" and session.player_id != current_user.id:
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
    if current_user.role.value != "admin" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    session.status = "active"
    session.last_activity = datetime.utcnow()
    db.commit()
    return {"message": "Sessão retomada com sucesso"}

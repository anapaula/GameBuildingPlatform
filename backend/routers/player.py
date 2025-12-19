from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User, Game, PlayerGameAccess, UserRole
from schemas import GameResponse
from auth import get_current_active_user

router = APIRouter()

@router.get("/games", response_model=List[GameResponse])
async def get_available_games(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retorna os jogos disponíveis para o jogador atual"""
    # Admin e facilitadores veem todos os jogos
    if current_user.role in [UserRole.ADMIN, UserRole.FACILITATOR]:
        games = db.query(Game).filter(Game.is_active == True).all()
        return games
    
    # Jogadores veem apenas os jogos aos quais têm acesso
    accesses = db.query(PlayerGameAccess).filter(
        PlayerGameAccess.player_id == current_user.id
    ).all()
    
    game_ids = [access.game_id for access in accesses]
    
    if not game_ids:
        return []
    
    games = db.query(Game).filter(
        Game.id.in_(game_ids),
        Game.is_active == True
    ).all()
    
    return games


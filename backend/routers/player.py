from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import User, Game, PlayerGameAccess, UserRole, Room, RoomMember, GameSession, SessionInteraction, FacilitatorGameAccess
from schemas import GameResponse, RoomResponse
from auth import get_current_active_user

router = APIRouter()

@router.get("/games", response_model=List[GameResponse])
async def get_available_games(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retorna os jogos disponíveis para o jogador atual"""
    # Admin vê todos os jogos
    if current_user.role == UserRole.ADMIN:
        games = db.query(Game).filter(Game.is_active == True).all()
        return games

    # Facilitadores veem apenas jogos aos quais têm acesso
    if current_user.role == UserRole.FACILITATOR:
        accesses = db.query(FacilitatorGameAccess).filter(
            FacilitatorGameAccess.facilitator_id == current_user.id
        ).all()
        game_ids = [access.game_id for access in accesses]
        if not game_ids:
            return []
        games = db.query(Game).filter(
            Game.id.in_(game_ids),
            Game.is_active == True
        ).all()
        return games
    
    # Jogadores veem apenas os jogos aos quais têm acesso
    accesses = db.query(PlayerGameAccess).filter(
        PlayerGameAccess.player_id == current_user.id
    ).all()
    
    game_ids = [access.game_id for access in accesses]
    
    # Se o jogador não tem acesso a nenhum jogo, não associar automaticamente
    if not game_ids:
        return []
    
    games = db.query(Game).filter(
        Game.id.in_(game_ids),
        Game.is_active == True
    ).all()
    
    return games

@router.get("/games/{game_id}/rooms", response_model=List[dict])
async def get_player_rooms_by_game(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retorna todas as salas do jogador para um jogo específico"""
    # Verificar se o jogador tem acesso ao jogo
    if current_user.role == UserRole.PLAYER:
        access = db.query(PlayerGameAccess).filter(
            PlayerGameAccess.player_id == current_user.id,
            PlayerGameAccess.game_id == game_id
        ).first()
        if not access:
            raise HTTPException(status_code=403, detail="Você não tem acesso a este jogo")
    
    # Verificar se o jogo existe e está ativo
    game = db.query(Game).filter(Game.id == game_id, Game.is_active == True).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado ou inativo")
    
    # Buscar todas as salas onde o jogador é membro e que têm sessões deste jogo
    room_members = db.query(RoomMember).filter(
        RoomMember.user_id == current_user.id
    ).all()
    
    room_ids = [rm.room_id for rm in room_members]
    
    if not room_ids:
        return []
    
    # Buscar salas ativas
    rooms = db.query(Room).filter(
        Room.id.in_(room_ids),
        Room.is_active == True,
        Room.game_id == game_id
    ).all()
    
    # Para cada sala, buscar sessões do jogador neste jogo
    result = []
    for room in rooms:
        # Buscar sessões do jogador nesta sala e neste jogo
        sessions = db.query(GameSession).filter(
            GameSession.room_id == room.id,
            GameSession.game_id == game_id,
            GameSession.player_id == current_user.id
        ).order_by(GameSession.created_at.desc()).all()
        
        # Buscar informações dos membros da sala
        members = db.query(RoomMember).filter(RoomMember.room_id == room.id).all()
        member_count = len(members)
        
        session_info = []
        for session in sessions:
            interaction_count = db.query(SessionInteraction).filter(
                SessionInteraction.session_id == session.id
            ).count()
            session_info.append({
                "id": session.id,
                "status": session.status,
                "current_phase": session.current_phase,
                "created_at": session.created_at.isoformat(),
                "last_activity": session.last_activity.isoformat() if session.last_activity else None,
                "interaction_count": interaction_count
            })

        chat_sessions = [s for s in session_info if s["interaction_count"] > 0]
        has_chat = len(chat_sessions) > 0

        result.append({
            "id": room.id,
            "name": room.name,
            "description": room.description,
            "max_players": room.max_players,
            "is_active": room.is_active,
            "created_at": room.created_at.isoformat(),
            "member_count": member_count,
            "sessions": chat_sessions,
            "has_active_session": any(s.status == "active" for s in sessions),
            "has_chat": has_chat,
            "latest_session": {
                "id": chat_sessions[0]["id"],
                "status": chat_sessions[0]["status"],
                "current_phase": chat_sessions[0]["current_phase"],
                "created_at": chat_sessions[0]["created_at"],
                "last_activity": chat_sessions[0]["last_activity"],
                "interaction_count": chat_sessions[0]["interaction_count"]
            } if chat_sessions else None
        })
    
    return result






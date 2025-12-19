from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from database import get_db
from models import User, Invitation, InvitationStatus, UserRole, FacilitatorPlayer, PlayerGameAccess, Game, GameSession, InvitationGame
from schemas import InvitationCreate, InvitationResponse, PlayerInviteCreate, PlayerInviteResponse, FacilitatorPlayerResponse, PlayerGameAccessResponse, UserResponse
from auth import get_current_facilitator_user, get_password_hash
from services.email_service import EmailService

router = APIRouter()

class UpdatePlayerGamesRequest(BaseModel):
    game_ids: List[int]

# ========== PLAYER INVITATIONS ==========
@router.post("/players/invite", response_model=InvitationResponse, status_code=201)
async def invite_player(
    invite_data: PlayerInviteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_facilitator_user)
):
    """Convidar jogador por e-mail com acesso a jogos específicos"""
    # Verificar se já existe usuário com este e-mail
    existing_user = db.query(User).filter(User.email == invite_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Já existe um usuário com este e-mail")
    
    # Verificar se já existe convite pendente
    existing_invitation = db.query(Invitation).filter(
        Invitation.email == invite_data.email,
        Invitation.status == InvitationStatus.PENDING
    ).first()
    if existing_invitation:
        raise HTTPException(status_code=400, detail="Já existe um convite pendente para este e-mail")
    
    # Verificar se os jogos existem
    games = db.query(Game).filter(Game.id.in_(invite_data.game_ids)).all()
    if len(games) != len(invite_data.game_ids):
        raise HTTPException(status_code=400, detail="Um ou mais jogos não foram encontrados")
    
    # Gerar token e criar convite
    email_service = EmailService()
    token = email_service.generate_invitation_token()
    expires_at = email_service.get_invitation_expiry()
    
    invitation = Invitation(
        email=invite_data.email,
        role=UserRole.PLAYER,
        inviter_id=current_user.id,
        token=token,
        status=InvitationStatus.PENDING,
        expires_at=expires_at
    )
    db.add(invitation)
    db.flush()  # Para obter o ID do convite
    
    # Criar relacionamentos entre convite e jogos
    for game_id in invite_data.game_ids:
        invitation_game = InvitationGame(
            invitation_id=invitation.id,
            game_id=game_id
        )
        db.add(invitation_game)
    
    db.commit()
    db.refresh(invitation)
    
    # Enviar e-mail
    await email_service.send_invitation_email(
        email=invite_data.email,
        role="player",
        invitation_token=token,
        inviter_name=current_user.username
    )
    
    return invitation

@router.get("/players", response_model=List[FacilitatorPlayerResponse])
async def list_my_players(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_facilitator_user)
):
    """Lista todos os jogadores gerenciados pelo facilitador"""
    facilitator_players = db.query(FacilitatorPlayer).filter(
        FacilitatorPlayer.facilitator_id == current_user.id
    ).all()
    
    result = []
    for fp in facilitator_players:
        player = db.query(User).filter(User.id == fp.player_id).first()
        if player:
            result.append({
                "id": fp.id,
                "player_id": player.id,
                "player_username": player.username,
                "player_email": player.email,
                "created_at": fp.created_at
            })
    
    return result

@router.get("/players/{player_id}/games", response_model=List[PlayerGameAccessResponse])
async def get_player_games(
    player_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_facilitator_user)
):
    """Lista os jogos que um jogador tem acesso"""
    # Verificar se o jogador pertence a este facilitador
    facilitator_player = db.query(FacilitatorPlayer).filter(
        FacilitatorPlayer.facilitator_id == current_user.id,
        FacilitatorPlayer.player_id == player_id
    ).first()
    
    if not facilitator_player:
        raise HTTPException(status_code=403, detail="Você não tem permissão para acessar este jogador")
    
    accesses = db.query(PlayerGameAccess).filter(
        PlayerGameAccess.player_id == player_id
    ).all()
    
    result = []
    for access in accesses:
        game = db.query(Game).filter(Game.id == access.game_id).first()
        if game:
            result.append({
                "id": access.id,
                "player_id": access.player_id,
                "game_id": access.game_id,
                "game_title": game.title,
                "granted_by": access.granted_by,
                "created_at": access.created_at
            })
    
    return result

@router.put("/players/{player_id}/games")
async def update_player_games(
    player_id: int,
    request: UpdatePlayerGamesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_facilitator_user)
):
    """Atualiza os jogos que um jogador tem acesso"""
    game_ids = request.game_ids
    # Verificar se o jogador pertence a este facilitador
    facilitator_player = db.query(FacilitatorPlayer).filter(
        FacilitatorPlayer.facilitator_id == current_user.id,
        FacilitatorPlayer.player_id == player_id
    ).first()
    
    if not facilitator_player:
        raise HTTPException(status_code=403, detail="Você não tem permissão para acessar este jogador")
    
    # Verificar se os jogos existem
    games = db.query(Game).filter(Game.id.in_(game_ids)).all()
    if len(games) != len(game_ids):
        raise HTTPException(status_code=400, detail="Um ou mais jogos não foram encontrados")
    
    # Remover acessos antigos
    db.query(PlayerGameAccess).filter(
        PlayerGameAccess.player_id == player_id,
        PlayerGameAccess.granted_by == current_user.id
    ).delete()
    
    # Criar novos acessos
    for game_id in game_ids:
        access = PlayerGameAccess(
            player_id=player_id,
            game_id=game_id,
            granted_by=current_user.id
        )
        db.add(access)
    
    db.commit()
    return {"message": "Acessos aos jogos atualizados com sucesso"}

@router.delete("/players/{player_id}")
async def remove_player(
    player_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_facilitator_user)
):
    """Remove um jogador dos gerenciados pelo facilitador"""
    facilitator_player = db.query(FacilitatorPlayer).filter(
        FacilitatorPlayer.facilitator_id == current_user.id,
        FacilitatorPlayer.player_id == player_id
    ).first()
    
    if not facilitator_player:
        raise HTTPException(status_code=404, detail="Jogador não encontrado ou não pertence a você")
    
    # Remover acessos aos jogos
    db.query(PlayerGameAccess).filter(
        PlayerGameAccess.player_id == player_id,
        PlayerGameAccess.granted_by == current_user.id
    ).delete()
    
    # Remover relacionamento
    db.delete(facilitator_player)
    db.commit()
    
    return {"message": "Jogador removido com sucesso"}

@router.get("/players/{player_id}/sessions", response_model=List[dict])
async def get_player_sessions(
    player_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_facilitator_user)
):
    """Lista todas as sessões de jogo de um jogador"""
    # Verificar se o jogador pertence a este facilitador
    facilitator_player = db.query(FacilitatorPlayer).filter(
        FacilitatorPlayer.facilitator_id == current_user.id,
        FacilitatorPlayer.player_id == player_id
    ).first()
    
    if not facilitator_player:
        raise HTTPException(status_code=403, detail="Você não tem permissão para acessar este jogador")
    
    sessions = db.query(GameSession).filter(
        GameSession.player_id == player_id
    ).order_by(GameSession.created_at.desc()).all()
    
    result = []
    for session in sessions:
        game = db.query(Game).filter(Game.id == session.game_id).first()
        result.append({
            "id": session.id,
            "game_id": session.game_id,
            "game_title": game.title if game else "Jogo desconhecido",
            "status": session.status,
            "current_phase": session.current_phase,
            "created_at": session.created_at.isoformat(),
            "last_activity": session.last_activity.isoformat() if session.last_activity else None
        })
    
    return result

@router.get("/invitations", response_model=List[InvitationResponse])
async def list_my_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_facilitator_user)
):
    """Lista todos os convites de jogadores criados pelo facilitador"""
    invitations = db.query(Invitation).filter(
        Invitation.inviter_id == current_user.id,
        Invitation.role == UserRole.PLAYER
    ).order_by(Invitation.created_at.desc()).all()
    return invitations

@router.delete("/invitations/{invitation_id}")
async def delete_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_facilitator_user)
):
    """Remove um convite de jogador"""
    invitation = db.query(Invitation).filter(
        Invitation.id == invitation_id,
        Invitation.inviter_id == current_user.id,
        Invitation.role == UserRole.PLAYER
    ).first()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Convite não encontrado")
    
    db.delete(invitation)
    db.commit()
    return {"message": "Convite removido com sucesso"}


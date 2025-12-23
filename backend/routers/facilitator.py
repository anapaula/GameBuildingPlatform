from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from database import get_db
from models import User, Invitation, InvitationStatus, UserRole, FacilitatorPlayer, PlayerGameAccess, Game, GameSession, InvitationGame, Room, RoomMember
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
    
    # Log para debug
    print(f"[DEBUG] Convite criado - ID: {invitation.id}, Token: {token}, Email: {invite_data.email}")
    
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

@router.get("/players/{player_id}/sessions/{session_id}/interactions")
async def get_player_session_interactions(
    player_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_facilitator_user)
):
    """Lista todas as interações de uma sessão de jogo de um jogador"""
    # Verificar se o jogador pertence a este facilitador
    facilitator_player = db.query(FacilitatorPlayer).filter(
        FacilitatorPlayer.facilitator_id == current_user.id,
        FacilitatorPlayer.player_id == player_id
    ).first()
    
    if not facilitator_player:
        raise HTTPException(status_code=403, detail="Você não tem permissão para acessar este jogador")
    
    # Verificar se a sessão pertence ao jogador
    session = db.query(GameSession).filter(
        GameSession.id == session_id,
        GameSession.player_id == player_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    from models import SessionInteraction
    interactions = db.query(SessionInteraction).filter(
        SessionInteraction.session_id == session_id
    ).order_by(SessionInteraction.created_at.asc()).all()
    
    result = []
    for interaction in interactions:
        result.append({
            "id": interaction.id,
            "player_input": interaction.player_input,
            "player_input_type": interaction.player_input_type,
            "ai_response": interaction.ai_response,
            "ai_response_audio_url": interaction.ai_response_audio_url,
            "llm_provider": interaction.llm_provider,
            "llm_model": interaction.llm_model,
            "tokens_used": interaction.tokens_used,
            "cost": interaction.cost,
            "response_time": interaction.response_time,
            "created_at": interaction.created_at.isoformat() if interaction.created_at else None
        })
    
    return result

@router.get("/invitations", response_model=List[InvitationResponse])
async def list_my_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_facilitator_user)
):
    """Lista todos os convites de jogadores criados pelo facilitador"""
    # Buscar todos os convites
    all_invitations = db.query(Invitation).filter(
        Invitation.inviter_id == current_user.id,
        Invitation.role == UserRole.PLAYER
    ).order_by(Invitation.created_at.desc()).all()
    
    # Buscar todos os jogadores já registrados (que têm FacilitatorPlayer)
    registered_player_ids = db.query(FacilitatorPlayer.player_id).filter(
        FacilitatorPlayer.facilitator_id == current_user.id
    ).subquery()
    
    registered_emails = db.query(User.email).filter(
        User.id.in_(registered_player_ids)
    ).subquery()
    
    # Filtrar convites aceitos: só retornar se o email NÃO está nos jogadores registrados
    # (ou seja, convite aceito mas jogador ainda não se registrou)
    result = []
    for invitation in all_invitations:
        # Se o convite está aceito, verificar se o jogador já se registrou
        if invitation.status == InvitationStatus.ACCEPTED:
            # Verificar se existe um usuário com este email que já está nos jogadores registrados
            user = db.query(User).filter(User.email == invitation.email).first()
            if user:
                facilitator_player = db.query(FacilitatorPlayer).filter(
                    FacilitatorPlayer.facilitator_id == current_user.id,
                    FacilitatorPlayer.player_id == user.id
                ).first()
                # Se o jogador já está registrado, não incluir este convite aceito
                if facilitator_player:
                    continue
        
        result.append(invitation)
    
    return result

@router.delete("/invitations/{invitation_id}")
async def delete_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_facilitator_user)
):
    """Remove um convite de jogador (pendente ou aceito, mas não registrado)"""
    invitation = db.query(Invitation).filter(
        Invitation.id == invitation_id,
        Invitation.inviter_id == current_user.id,
        Invitation.role == UserRole.PLAYER
    ).first()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Convite não encontrado")
    
    # Se o convite está aceito, verificar se o jogador já se registrou
    if invitation.status == InvitationStatus.ACCEPTED:
        user = db.query(User).filter(User.email == invitation.email).first()
        if user:
            facilitator_player = db.query(FacilitatorPlayer).filter(
                FacilitatorPlayer.facilitator_id == current_user.id,
                FacilitatorPlayer.player_id == user.id
            ).first()
            # Se o jogador já está registrado, não permitir deletar o convite
            if facilitator_player:
                raise HTTPException(
                    status_code=400, 
                    detail="Não é possível remover convite de jogador que já se registrou"
                )
    
    # Deletar primeiro os relacionamentos com jogos (invitation_games)
    db.query(InvitationGame).filter(
        InvitationGame.invitation_id == invitation_id
    ).delete()
    
    # Agora pode deletar o convite
    db.delete(invitation)
    db.commit()
    return {"message": "Convite removido com sucesso"}

# ========== PLAYER ROOMS ==========
@router.get("/players/{player_id}/rooms")
async def get_player_rooms(
    player_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_facilitator_user)
):
    """Lista todas as salas de jogos de um jogador específico"""
    # Verificar se o jogador pertence a este facilitador
    facilitator_player = db.query(FacilitatorPlayer).filter(
        FacilitatorPlayer.facilitator_id == current_user.id,
        FacilitatorPlayer.player_id == player_id
    ).first()
    
    if not facilitator_player:
        raise HTTPException(status_code=403, detail="Você não tem permissão para acessar este jogador")
    
    # Buscar todas as salas onde o jogador é membro
    room_members = db.query(RoomMember).filter(
        RoomMember.user_id == player_id
    ).all()
    
    room_ids = list(set([rm.room_id for rm in room_members]))
    
    if not room_ids:
        return []
    
    # Buscar informações das salas
    rooms = db.query(Room).filter(
        Room.id.in_(room_ids),
        Room.is_active == True
    ).all()
    
    result = []
    for room in rooms:
        # Buscar todos os membros da sala
        members = db.query(RoomMember).filter(RoomMember.room_id == room.id).all()
        player_members = []
        for member in members:
            player = db.query(User).filter(User.id == member.user_id).first()
            if player:
                player_members.append({
                    "id": player.id,
                    "username": player.username,
                    "email": player.email,
                    "joined_at": member.joined_at.isoformat() if member.joined_at else None
                })
        
        # Buscar sessões do jogador nesta sala
        sessions = db.query(GameSession).filter(
            GameSession.room_id == room.id,
            GameSession.player_id == player_id
        ).all()
        
        session_info = []
        for session in sessions:
            game = db.query(Game).filter(Game.id == session.game_id).first()
            player = db.query(User).filter(User.id == session.player_id).first()
            session_info.append({
                "id": session.id,
                "player_id": session.player_id,
                "player_username": player.username if player else "Desconhecido",
                "game_id": session.game_id,
                "game_title": game.title if game else "Jogo desconhecido",
                "status": session.status,
                "current_phase": session.current_phase,
                "created_at": session.created_at.isoformat() if session.created_at else None,
                "last_activity": session.last_activity.isoformat() if session.last_activity else None
            })
        
        result.append({
            "id": room.id,
            "name": room.name,
            "description": room.description,
            "max_players": room.max_players,
            "created_at": room.created_at.isoformat() if room.created_at else None,
            "players": player_members,
            "sessions": session_info,
            "total_sessions": len(session_info),
            "active_sessions": len([s for s in session_info if s["status"] == "active"])
        })
    
    return result

@router.get("/players/rooms")
async def get_all_player_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_facilitator_user)
):
    """Lista todas as salas de jogos dos jogadores gerenciados pelo facilitador"""
    # Buscar todos os jogadores do facilitador
    facilitator_players = db.query(FacilitatorPlayer).filter(
        FacilitatorPlayer.facilitator_id == current_user.id
    ).all()
    
    player_ids = [fp.player_id for fp in facilitator_players]
    
    if not player_ids:
        return []
    
    # Buscar todas as salas onde os jogadores são membros
    room_members = db.query(RoomMember).filter(
        RoomMember.user_id.in_(player_ids)
    ).all()
    
    room_ids = list(set([rm.room_id for rm in room_members]))
    
    if not room_ids:
        return []
    
    # Buscar informações das salas
    rooms = db.query(Room).filter(
        Room.id.in_(room_ids),
        Room.is_active == True
    ).all()
    
    result = []
    for room in rooms:
        # Buscar membros da sala (apenas os jogadores do facilitador)
        members = db.query(RoomMember).filter(RoomMember.room_id == room.id).all()
        player_members = []
        for member in members:
            if member.user_id in player_ids:
                player = db.query(User).filter(User.id == member.user_id).first()
                if player:
                    player_members.append({
                        "id": player.id,
                        "username": player.username,
                        "email": player.email,
                        "joined_at": member.joined_at.isoformat() if member.joined_at else None
                    })
        
        # Buscar sessões ativas na sala
        sessions = db.query(GameSession).filter(
            GameSession.room_id == room.id,
            GameSession.player_id.in_(player_ids)
        ).all()
        
        session_info = []
        for session in sessions:
            game = db.query(Game).filter(Game.id == session.game_id).first()
            player = db.query(User).filter(User.id == session.player_id).first()
            session_info.append({
                "id": session.id,
                "player_id": session.player_id,
                "player_username": player.username if player else "Desconhecido",
                "game_id": session.game_id,
                "game_title": game.title if game else "Jogo desconhecido",
                "status": session.status,
                "current_phase": session.current_phase,
                "created_at": session.created_at.isoformat() if session.created_at else None,
                "last_activity": session.last_activity.isoformat() if session.last_activity else None
            })
        
        result.append({
            "id": room.id,
            "name": room.name,
            "description": room.description,
            "max_players": room.max_players,
            "created_at": room.created_at.isoformat() if room.created_at else None,
            "players": player_members,
            "sessions": session_info,
            "total_sessions": len(session_info),
            "active_sessions": len([s for s in session_info if s["status"] == "active"])
        })
    
    return result

@router.get("/rooms/{room_id}")
async def get_room_details(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_facilitator_user)
):
    """Retorna detalhes de uma sala específica, incluindo todas as interações"""
    # Verificar se a sala tem jogadores do facilitador
    facilitator_players = db.query(FacilitatorPlayer).filter(
        FacilitatorPlayer.facilitator_id == current_user.id
    ).all()
    
    player_ids = [fp.player_id for fp in facilitator_players]
    
    if not player_ids:
        raise HTTPException(status_code=403, detail="Você não tem jogadores gerenciados")
    
    # Verificar se há membros do facilitador na sala
    room_members = db.query(RoomMember).filter(
        RoomMember.room_id == room_id,
        RoomMember.user_id.in_(player_ids)
    ).first()
    
    if not room_members:
        raise HTTPException(status_code=403, detail="Você não tem permissão para acessar esta sala")
    
    # Buscar informações da sala
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala não encontrada")
    
    # Buscar todos os membros (apenas jogadores do facilitador)
    members = db.query(RoomMember).filter(RoomMember.room_id == room_id).all()
    player_members = []
    for member in members:
        if member.user_id in player_ids:
            player = db.query(User).filter(User.id == member.user_id).first()
            if player:
                player_members.append({
                    "id": player.id,
                    "username": player.username,
                    "email": player.email,
                    "joined_at": member.joined_at.isoformat() if member.joined_at else None
                })
    
    # Buscar todas as sessões na sala
    sessions = db.query(GameSession).filter(
        GameSession.room_id == room_id,
        GameSession.player_id.in_(player_ids)
    ).order_by(GameSession.created_at.desc()).all()
    
    session_details = []
    for session in sessions:
        game = db.query(Game).filter(Game.id == session.game_id).first()
        player = db.query(User).filter(User.id == session.player_id).first()
        
        # Buscar todas as interações da sessão
        from models import SessionInteraction
        interactions = db.query(SessionInteraction).filter(
            SessionInteraction.session_id == session.id
        ).order_by(SessionInteraction.created_at.asc()).all()
        
        interaction_list = []
        for interaction in interactions:
            interaction_list.append({
                "id": interaction.id,
                "player_input": interaction.player_input,
                "player_input_type": interaction.player_input_type,
                "ai_response": interaction.ai_response,
                "llm_provider": interaction.llm_provider,
                "llm_model": interaction.llm_model,
                "tokens_used": interaction.tokens_used,
                "cost": interaction.cost,
                "response_time": interaction.response_time,
                "created_at": interaction.created_at.isoformat() if interaction.created_at else None
            })
        
        session_details.append({
            "id": session.id,
            "player_id": session.player_id,
            "player_username": player.username if player else "Desconhecido",
            "player_email": player.email if player else "",
            "game_id": session.game_id,
            "game_title": game.title if game else "Jogo desconhecido",
            "status": session.status,
            "current_phase": session.current_phase,
            "llm_provider": session.llm_provider,
            "llm_model": session.llm_model,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "last_activity": session.last_activity.isoformat() if session.last_activity else None,
            "interactions": interaction_list,
            "total_interactions": len(interaction_list)
        })
    
    return {
        "id": room.id,
        "name": room.name,
        "description": room.description,
        "max_players": room.max_players,
        "created_at": room.created_at.isoformat() if room.created_at else None,
        "players": player_members,
        "sessions": session_details,
        "total_sessions": len(session_details),
        "active_sessions": len([s for s in session_details if s["status"] == "active"])
    }


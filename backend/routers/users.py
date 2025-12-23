from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User
from schemas import UserResponse, UserUpdate
from auth import get_current_active_user, get_current_admin_user, get_password_hash

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role.value != "ADMIN" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Atualiza um usuário (apenas admin)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar se username ou email já estão em uso por outro usuário
    if user_update.username and user_update.username != user.username:
        existing_user = db.query(User).filter(User.username == user_update.username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username já está em uso")
        user.username = user_update.username
    
    if user_update.email and user_update.email != user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email já está em uso")
        user.email = user_update.email
    
    if user_update.password:
        user.hashed_password = get_password_hash(user_update.password)
    
    if user_update.role is not None:
        user.role = user_update.role
    
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Remove um usuário (apenas admin)"""
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Você não pode deletar seu próprio usuário")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Importar modelos necessários
    from models import (
        GameSession, SessionInteraction, SessionScenario,
        RoomMember, FacilitatorPlayer, PlayerGameAccess,
        Invitation, InvitationGame, Room, GameRule
    )
    
    # 1. Deletar interações de sessões do usuário
    user_sessions = db.query(GameSession).filter(GameSession.player_id == user_id).all()
    session_ids = [s.id for s in user_sessions]
    
    if session_ids:
        # Deletar SessionInteraction
        db.query(SessionInteraction).filter(SessionInteraction.session_id.in_(session_ids)).delete(synchronize_session=False)
        # Deletar SessionScenario
        db.query(SessionScenario).filter(SessionScenario.session_id.in_(session_ids)).delete(synchronize_session=False)
        # Deletar GameSession
        db.query(GameSession).filter(GameSession.player_id == user_id).delete(synchronize_session=False)
    
    # 2. Deletar RoomMember
    db.query(RoomMember).filter(RoomMember.user_id == user_id).delete(synchronize_session=False)
    
    # 3. Deletar FacilitatorPlayer (tanto como facilitador quanto como jogador)
    db.query(FacilitatorPlayer).filter(
        (FacilitatorPlayer.facilitator_id == user_id) | (FacilitatorPlayer.player_id == user_id)
    ).delete(synchronize_session=False)
    
    # 4. Deletar PlayerGameAccess (tanto como jogador quanto como granted_by)
    db.query(PlayerGameAccess).filter(
        (PlayerGameAccess.player_id == user_id) | (PlayerGameAccess.granted_by == user_id)
    ).delete(synchronize_session=False)
    
    # 5. Deletar InvitationGame relacionados a convites do usuário
    user_invitations = db.query(Invitation).filter(
        (Invitation.inviter_id == user_id) | (Invitation.email == user.email)
    ).all()
    invitation_ids = [inv.id for inv in user_invitations]
    
    if invitation_ids:
        db.query(InvitationGame).filter(InvitationGame.invitation_id.in_(invitation_ids)).delete(synchronize_session=False)
        # Deletar Invitation
        db.query(Invitation).filter(
            (Invitation.inviter_id == user_id) | (Invitation.email == user.email)
        ).delete(synchronize_session=False)
    
    # 6. Atualizar Rooms criados pelo usuário (setar created_by como NULL)
    db.query(Room).filter(Room.created_by == user_id).update({"created_by": None}, synchronize_session=False)
    
    # 7. Atualizar GameRule criados pelo usuário (setar created_by como NULL)
    db.query(GameRule).filter(GameRule.created_by == user_id).update({"created_by": None}, synchronize_session=False)
    
    # 8. Agora pode deletar o usuário
    db.delete(user)
    db.commit()
    
    return {"message": "Usuário removido com sucesso"}

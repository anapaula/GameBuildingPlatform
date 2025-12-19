from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime

from database import get_db
from models import User, Invitation, InvitationStatus, UserRole, FacilitatorPlayer, PlayerGameAccess, InvitationGame
from schemas import Token, UserCreate, UserResponse, RegisterWithInvitation
from auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username ou email já está em uso"
        )
    
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.post("/register-with-invitation", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_with_invitation(
    register_data: RegisterWithInvitation,
    db: Session = Depends(get_db)
):
    """Registro usando token de convite (para facilitadores e jogadores)"""
    # Buscar convite pelo token
    invitation = db.query(Invitation).filter(
        Invitation.token == register_data.token,
        Invitation.status == InvitationStatus.PENDING
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de convite inválido ou já utilizado"
        )
    
    # Verificar se o convite expirou
    if invitation.expires_at and invitation.expires_at < datetime.utcnow():
        invitation.status = InvitationStatus.EXPIRED
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de convite expirado"
        )
    
    # Verificar se já existe usuário com este e-mail ou username
    existing_user = db.query(User).filter(
        (User.username == register_data.username) | (User.email == invitation.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username ou email já está em uso"
        )
    
    # Criar usuário
    hashed_password = get_password_hash(register_data.password)
    db_user = User(
        username=register_data.username,
        email=invitation.email,
        hashed_password=hashed_password,
        role=invitation.role
    )
    db.add(db_user)
    db.flush()  # Para obter o ID do usuário
    
    # Se for jogador, criar relacionamento com facilitador e acessos aos jogos
    if invitation.role == UserRole.PLAYER:
        # Criar relacionamento FacilitatorPlayer
        facilitator_player = FacilitatorPlayer(
            facilitator_id=invitation.inviter_id,
            player_id=db_user.id
        )
        db.add(facilitator_player)
        
        # Criar acessos aos jogos baseado nos InvitationGame
        invitation_games = db.query(InvitationGame).filter(
            InvitationGame.invitation_id == invitation.id
        ).all()
        
        for inv_game in invitation_games:
            player_access = PlayerGameAccess(
                player_id=db_user.id,
                game_id=inv_game.game_id,
                granted_by=invitation.inviter_id
            )
            db.add(player_access)
    
    # Marcar convite como aceito
    invitation.status = InvitationStatus.ACCEPTED
    invitation.accepted_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/invitation/{token}")
async def get_invitation_info(token: str, db: Session = Depends(get_db)):
    """Retorna informações do convite pelo token"""
    invitation = db.query(Invitation).filter(Invitation.token == token).first()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Convite não encontrado")
    
    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Convite já foi utilizado ou expirado")
    
    if invitation.expires_at and invitation.expires_at < datetime.utcnow():
        invitation.status = InvitationStatus.EXPIRED
        db.commit()
        raise HTTPException(status_code=400, detail="Convite expirado")
    
    return {
        "email": invitation.email,
        "role": invitation.role.value,
        "expires_at": invitation.expires_at.isoformat() if invitation.expires_at else None
    }


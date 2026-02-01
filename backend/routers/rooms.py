from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Room, RoomMember, User
from schemas import RoomCreate, RoomResponse
from auth import get_current_active_user

router = APIRouter()

@router.post("/", response_model=RoomResponse, status_code=201)
async def create_room(room_data: RoomCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if not room_data.game_id:
        raise HTTPException(status_code=400, detail="game_id é obrigatório para criar sala")
    existing = db.query(Room).filter(
        Room.game_id == room_data.game_id,
        Room.name == room_data.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Já existe uma sala com esse nome neste jogo")
    db_room = Room(
        name=room_data.name,
        description=room_data.description,
        max_players=room_data.max_players,
        created_by=current_user.id,
        game_id=room_data.game_id
    )
    db.add(db_room)
    db.flush()
    member = RoomMember(room_id=db_room.id, user_id=current_user.id)
    db.add(member)
    db.commit()
    db.refresh(db_room)
    return db_room

@router.get("/", response_model=List[RoomResponse])
async def list_rooms(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    rooms = db.query(Room).filter(Room.is_active == True).offset(skip).limit(limit).all()
    return rooms

@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala não encontrada")
    return room

@router.post("/{room_id}/join")
async def join_room(room_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala não encontrada")
    existing_member = db.query(RoomMember).filter(RoomMember.room_id == room_id, RoomMember.user_id == current_user.id).first()
    if existing_member:
        # Se já é membro, retornar sucesso silenciosamente (idempotente)
        return {"message": "Você já é membro desta sala"}
    current_members = db.query(RoomMember).filter(RoomMember.room_id == room_id).count()
    if current_members >= room.max_players:
        raise HTTPException(status_code=400, detail="Sala cheia")
    member = RoomMember(room_id=room_id, user_id=current_user.id)
    db.add(member)
    db.commit()
    return {"message": "Você entrou na sala com sucesso"}

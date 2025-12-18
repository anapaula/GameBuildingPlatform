from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import LLMConfiguration
from schemas import LLMConfigResponse
from auth import get_current_active_user, get_current_admin_user

router = APIRouter()

@router.get("/active", response_model=LLMConfigResponse)
async def get_active_llm_config(
    game_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    query = db.query(LLMConfiguration).filter(LLMConfiguration.is_active == True)
    
    # Se game_id for fornecido, filtrar por jogo
    if game_id:
        query = query.filter(LLMConfiguration.game_id == game_id)
    else:
        # Se não houver game_id, buscar do primeiro jogo ativo
        from models import Game
        first_game = db.query(Game).filter(Game.is_active == True).order_by(Game.created_at).first()
        if first_game:
            query = query.filter(LLMConfiguration.game_id == first_game.id)
    
    config = query.first()
    if not config:
        raise HTTPException(status_code=404, detail="Nenhuma configuração de LLM ativa encontrada")
    return config

@router.patch("/{config_id}/activate")
async def activate_llm_config(config_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_admin_user)):
    config = db.query(LLMConfiguration).filter(LLMConfiguration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")
    # Desativar apenas as LLMs do mesmo jogo
    db.query(LLMConfiguration).filter(LLMConfiguration.game_id == config.game_id).update({"is_active": False})
    config.is_active = True
    db.commit()
    return {"message": "Configuração de LLM ativada com sucesso"}

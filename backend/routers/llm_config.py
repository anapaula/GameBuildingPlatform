from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import LLMConfiguration
from schemas import LLMConfigResponse
from auth import get_current_active_user, get_current_admin_user

router = APIRouter()

@router.get("/active", response_model=LLMConfigResponse)
async def get_active_llm_config(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    config = db.query(LLMConfiguration).filter(LLMConfiguration.is_active == True).first()
    if not config:
        raise HTTPException(status_code=404, detail="Nenhuma configuração de LLM ativa encontrada")
    return config

@router.patch("/{config_id}/activate")
async def activate_llm_config(config_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_admin_user)):
    config = db.query(LLMConfiguration).filter(LLMConfiguration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")
    db.query(LLMConfiguration).update({"is_active": False})
    config.is_active = True
    db.commit()
    return {"message": "Configuração de LLM ativada com sucesso"}

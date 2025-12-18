from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pathlib import Path
from database import get_db
from models import GameSession, SessionInteraction, User, GameRule, Scenario, LLMConfiguration
from schemas import InteractionCreate, InteractionResponse, LLMConfigResponse
from auth import get_current_active_user
from services.llm_service import LLMService
from services.audio_service import AudioService

router = APIRouter()

@router.get("/config/llms", response_model=List[LLMConfigResponse])
async def get_available_llms(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Retorna todas as configurações de LLM disponíveis para uso no jogo"""
    configs = db.query(LLMConfiguration).all()
    return configs

@router.get("/config/scenarios")
async def get_available_scenarios(
    game_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retorna todos os cenários disponíveis para um jogo específico"""
    query = db.query(Scenario).filter(Scenario.is_active == True)
    if game_id:
        query = query.filter(Scenario.game_id == game_id)
    scenarios = query.order_by(Scenario.order).all()
    return scenarios

@router.post("/interact", response_model=InteractionResponse)
async def interact_with_game(interaction_data: InteractionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    session = db.query(GameSession).filter(GameSession.id == interaction_data.session_id, GameSession.player_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Sessão não está ativa")
    
    # Verificar se é a primeira interação
    existing_interactions = db.query(SessionInteraction).filter(SessionInteraction.session_id == session.id).count()
    is_first_interaction = existing_interactions == 0
    
    # Buscar regras do jogo da sessão
    game_rules = db.query(GameRule).filter(
        GameRule.game_id == session.game_id,
        GameRule.is_active == True
    ).all()
    current_scenario = None
    if session.current_scenario_id:
        current_scenario = db.query(Scenario).filter(Scenario.id == session.current_scenario_id).first()
    
    llm_service = LLMService(db)
    context = llm_service.build_game_context(session.id, current_scenario, game_rules)
    system_prompt = "Você é um assistente de jogo interativo. Responda em português do Brasil de forma envolvente e imersiva."
    
    # Se for a primeira interação e houver cenário com conteúdo, incluir o conteúdo do arquivo
    if is_first_interaction and current_scenario and current_scenario.file_content:
        system_prompt += f"\n\nINÍCIO DO JOGO - CONTEÚDO DO CENÁRIO:\n{current_scenario.file_content}\n\n"
        system_prompt += "Apresente este conteúdo ao jogador de forma envolvente e natural, como se estivesse narrando o início da história. Adapte o texto para uma conversa interativa."
    
    if game_rules:
        rules_text = "\n".join([f"- {rule.title}: {rule.description}" for rule in game_rules])
        system_prompt += f"\n\nRegras do jogo:\n{rules_text}"
    
    # Se for primeira interação, modificar o prompt para incluir instrução de apresentar a introdução
    user_prompt = interaction_data.player_input
    if is_first_interaction and current_scenario and current_scenario.file_content:
        user_prompt = "Olá, quero começar a jogar. Por favor, me apresente o início da história."
    
    try:
        llm_response = await llm_service.generate_response(
            prompt=user_prompt, 
            system_prompt=system_prompt, 
            config_id=None, 
            context=context,
            session_llm_provider=session.llm_provider,
            session_llm_model=session.llm_model
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar resposta: {str(e)}")
    audio_url = None
    if interaction_data.include_audio_response:
        audio_service = AudioService()
        try:
            audio_path = await audio_service.text_to_speech(llm_response["response"])
            audio_url = f"/api/audio/{Path(audio_path).name}"
        except Exception:
            pass
    interaction = SessionInteraction(session_id=session.id, player_input=interaction_data.player_input, player_input_type=interaction_data.player_input_type, ai_response=llm_response["response"], ai_response_audio_url=audio_url, llm_provider=llm_response["provider"], llm_model=llm_response["model"], tokens_used=llm_response["tokens_used"], cost=llm_response["cost"], response_time=llm_response["response_time"])
    db.add(interaction)
    session.last_activity = datetime.utcnow()
    db.commit()
    db.refresh(interaction)
    return interaction

@router.post("/interact/audio")
async def interact_with_audio(session_id: int, audio_file: UploadFile = File(...), include_audio_response: bool = False, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    session = db.query(GameSession).filter(GameSession.id == session_id, GameSession.player_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    audio_service = AudioService()
    audio_data = await audio_file.read()
    audio_path = await audio_service.save_uploaded_audio(audio_data, f"session_{session_id}_{datetime.utcnow().timestamp()}.{audio_file.filename.split('.')[-1]}")
    try:
        player_input = await audio_service.speech_to_text(audio_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar áudio: {str(e)}")
    interaction_data = InteractionCreate(session_id=session_id, player_input=player_input, player_input_type="audio", include_audio_response=include_audio_response)
    return await interact_with_game(interaction_data, db, current_user)

@router.get("/{session_id}/history", response_model=List[InteractionResponse])
async def get_session_history(session_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if current_user.role.value != "admin" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    interactions = db.query(SessionInteraction).filter(SessionInteraction.session_id == session_id).order_by(SessionInteraction.created_at.desc()).offset(skip).limit(limit).all()
    return interactions

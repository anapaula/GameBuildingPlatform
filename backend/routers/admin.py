from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User, GameRule, Scenario, LLMConfiguration, GameSession, SessionInteraction, LLMTestResult
from schemas import GameRuleCreate, GameRuleResponse, ScenarioCreate, ScenarioResponse, LLMConfigCreate, LLMConfigUpdate, LLMConfigResponse, LLMTestRequest, LLMTestResponse, SessionStats, LLMStats
from auth import get_current_admin_user
from services.llm_service import LLMService

router = APIRouter()

@router.post("/rules", response_model=GameRuleResponse, status_code=201)
async def create_game_rule(rule_data: GameRuleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    db_rule = GameRule(title=rule_data.title, description=rule_data.description, rule_type=rule_data.rule_type, content=rule_data.content, created_by=current_user.id)
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.get("/rules", response_model=List[GameRuleResponse])
async def list_game_rules(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    rules = db.query(GameRule).offset(skip).limit(limit).all()
    return rules

@router.get("/rules/{rule_id}", response_model=GameRuleResponse)
async def get_game_rule(rule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    rule = db.query(GameRule).filter(GameRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")
    return rule

@router.put("/rules/{rule_id}", response_model=GameRuleResponse)
async def update_game_rule(rule_id: int, rule_data: GameRuleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    rule = db.query(GameRule).filter(GameRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")
    rule.title = rule_data.title
    rule.description = rule_data.description
    rule.rule_type = rule_data.rule_type
    rule.content = rule_data.content
    db.commit()
    db.refresh(rule)
    return rule

@router.delete("/rules/{rule_id}")
async def delete_game_rule(rule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    rule = db.query(GameRule).filter(GameRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")
    rule.is_active = False
    db.commit()
    return {"message": "Regra desativada com sucesso"}

@router.post("/scenarios", response_model=ScenarioResponse, status_code=201)
async def create_scenario(scenario_data: ScenarioCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    db_scenario = Scenario(name=scenario_data.name, description=scenario_data.description, image_url=scenario_data.image_url, phase=scenario_data.phase, order=scenario_data.order)
    db.add(db_scenario)
    db.commit()
    db.refresh(db_scenario)
    return db_scenario

@router.get("/scenarios", response_model=List[ScenarioResponse])
async def list_scenarios(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    scenarios = db.query(Scenario).order_by(Scenario.order).offset(skip).limit(limit).all()
    return scenarios

@router.post("/llm/configs", response_model=LLMConfigResponse, status_code=201)
async def create_llm_config(config_data: LLMConfigCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    db_config = LLMConfiguration(provider=config_data.provider, model_name=config_data.model_name, api_key=config_data.api_key, cost_per_token=config_data.cost_per_token, max_tokens=config_data.max_tokens, temperature=config_data.temperature)
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

@router.get("/llm/configs", response_model=List[LLMConfigResponse])
async def list_llm_configs(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    configs = db.query(LLMConfiguration).all()
    return configs

@router.get("/llm/configs/{config_id}", response_model=LLMConfigResponse)
async def get_llm_config(config_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    config = db.query(LLMConfiguration).filter(LLMConfiguration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuração de LLM não encontrada")
    return config

@router.put("/llm/configs/{config_id}", response_model=LLMConfigResponse)
async def update_llm_config(config_id: int, config_data: LLMConfigUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    config = db.query(LLMConfiguration).filter(LLMConfiguration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuração de LLM não encontrada")
    
    # Atualizar apenas os campos fornecidos
    if config_data.provider is not None:
        config.provider = config_data.provider
    if config_data.model_name is not None:
        config.model_name = config_data.model_name
    if config_data.api_key is not None:
        config.api_key = config_data.api_key
    if config_data.cost_per_token is not None:
        config.cost_per_token = config_data.cost_per_token
    if config_data.max_tokens is not None:
        config.max_tokens = config_data.max_tokens
    if config_data.temperature is not None:
        config.temperature = config_data.temperature
    
    db.commit()
    db.refresh(config)
    return config

@router.delete("/llm/configs/{config_id}")
async def delete_llm_config(config_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    config = db.query(LLMConfiguration).filter(LLMConfiguration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuração de LLM não encontrada")
    
    # Não permitir deletar se for a única configuração ativa
    if config.is_active:
        other_configs = db.query(LLMConfiguration).filter(LLMConfiguration.id != config_id).count()
        if other_configs == 0:
            raise HTTPException(status_code=400, detail="Não é possível deletar a única configuração de LLM")
    
    db.delete(config)
    db.commit()
    return {"message": "Configuração de LLM deletada com sucesso"}

@router.post("/llm/test", response_model=LLMTestResponse)
async def test_llm(test_data: LLMTestRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    config = db.query(LLMConfiguration).filter(LLMConfiguration.id == test_data.llm_config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuração de LLM não encontrada")
    
    llm_service = LLMService(db)
    try:
        # Usar config_id explicitamente para garantir que usa a configuração correta
        response = await llm_service.generate_response(
            prompt=test_data.test_prompt, 
            system_prompt="Você é um assistente útil. Responda em português do Brasil.", 
            config_id=config.id
        )
        quality_score = 10.0 - min(response["response_time"] * 2, 5.0)
        test_result = LLMTestResult(
            llm_config_id=config.id, 
            test_prompt=test_data.test_prompt, 
            response=response["response"], 
            response_time=response["response_time"], 
            tokens_used=response["tokens_used"], 
            cost=response["cost"], 
            quality_score=quality_score
        )
        db.add(test_result)
        db.commit()
        db.refresh(test_result)
        return test_result
    except Exception as e:
        import traceback
        error_detail = str(e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao testar LLM: {error_detail}")

@router.get("/llm/stats", response_model=List[LLMStats])
async def get_llm_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    configs = db.query(LLMConfiguration).all()
    stats = []
    for config in configs:
        success_rate = 1.0 if config.total_requests > 0 else 0.0
        stats.append(LLMStats(llm_config_id=config.id, provider=config.provider.value, model_name=config.model_name, total_requests=config.total_requests, total_tokens=config.total_tokens, total_cost=config.total_cost, avg_response_time=config.avg_response_time, success_rate=success_rate))
    return stats

@router.get("/sessions")
async def list_all_sessions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    sessions = db.query(GameSession).offset(skip).limit(limit).all()
    return sessions

@router.get("/sessions/{session_id}/stats", response_model=SessionStats)
async def get_session_stats(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    interactions = db.query(SessionInteraction).filter(SessionInteraction.session_id == session_id).all()
    total_interactions = len(interactions)
    total_tokens = sum(i.tokens_used or 0 for i in interactions)
    total_cost = sum(i.cost or 0 for i in interactions)
    avg_response_time = sum(i.response_time or 0 for i in interactions) / total_interactions if total_interactions > 0 else 0
    duration = (session.last_activity - session.created_at).total_seconds() / 60
    return SessionStats(session_id=session_id, total_interactions=total_interactions, total_tokens=total_tokens, total_cost=total_cost, avg_response_time=avg_response_time, duration_minutes=duration)

@router.get("/sessions/{session_id}/interactions")
async def get_session_interactions(session_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    interactions = db.query(SessionInteraction).filter(SessionInteraction.session_id == session_id).order_by(SessionInteraction.created_at.desc()).offset(skip).limit(limit).all()
    return interactions

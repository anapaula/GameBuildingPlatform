#!/usr/bin/env python3
"""Script para criar arquivos faltantes do backend"""

import os

# Criar diretórios
os.makedirs("routers", exist_ok=True)
os.makedirs("services", exist_ok=True)
os.makedirs("scripts", exist_ok=True)

# Criar arquivos __init__.py
with open("services/__init__.py", "w") as f:
    f.write("# Services package\n")

# Criar routers básicos (versões simplificadas)
routers = {
    "users.py": '''from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User
from schemas import UserResponse
from auth import get_current_active_user, get_current_admin_user

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role.value != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user
''',
    "rooms.py": '''from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Room, RoomMember, User
from schemas import RoomCreate, RoomResponse
from auth import get_current_active_user

router = APIRouter()

@router.post("/", response_model=RoomResponse, status_code=201)
async def create_room(room_data: RoomCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_room = Room(name=room_data.name, description=room_data.description, max_players=room_data.max_players, created_by=current_user.id)
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    member = RoomMember(room_id=db_room.id, user_id=current_user.id)
    db.add(member)
    db.commit()
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
        raise HTTPException(status_code=400, detail="Você já é membro desta sala")
    current_members = db.query(RoomMember).filter(RoomMember.room_id == room_id).count()
    if current_members >= room.max_players:
        raise HTTPException(status_code=400, detail="Sala cheia")
    member = RoomMember(room_id=room_id, user_id=current_user.id)
    db.add(member)
    db.commit()
    return {"message": "Você entrou na sala com sucesso"}
''',
    "sessions.py": '''from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
from models import GameSession, User
from schemas import GameSessionCreate, GameSessionResponse
from auth import get_current_active_user

router = APIRouter()

@router.post("/", response_model=GameSessionResponse, status_code=201)
async def create_session(session_data: GameSessionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    active_session = db.query(GameSession).filter(GameSession.player_id == current_user.id, GameSession.status == "active").first()
    if active_session:
        return active_session
    db_session = GameSession(player_id=current_user.id, room_id=session_data.room_id, llm_provider=session_data.llm_provider, llm_model=session_data.llm_model, status="active")
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.get("/", response_model=List[GameSessionResponse])
async def list_sessions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role.value == "admin":
        sessions = db.query(GameSession).offset(skip).limit(limit).all()
    else:
        sessions = db.query(GameSession).filter(GameSession.player_id == current_user.id).offset(skip).limit(limit).all()
    return sessions

@router.get("/{session_id}", response_model=GameSessionResponse)
async def get_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if current_user.role.value != "admin" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    return session

@router.patch("/{session_id}/pause")
async def pause_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if current_user.role.value != "admin" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    session.status = "paused"
    session.last_activity = datetime.utcnow()
    db.commit()
    return {"message": "Sessão pausada com sucesso"}

@router.patch("/{session_id}/resume")
async def resume_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if current_user.role.value != "admin" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    session.status = "active"
    session.last_activity = datetime.utcnow()
    db.commit()
    return {"message": "Sessão retomada com sucesso"}
''',
    "admin.py": '''from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User, GameRule, Scenario, LLMConfiguration, GameSession, SessionInteraction, LLMTestResult
from schemas import GameRuleCreate, GameRuleResponse, ScenarioCreate, ScenarioResponse, LLMConfigCreate, LLMConfigResponse, LLMTestRequest, LLMTestResponse, SessionStats, LLMStats
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

@router.post("/llm/test", response_model=LLMTestResponse)
async def test_llm(test_data: LLMTestRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    config = db.query(LLMConfiguration).filter(LLMConfiguration.id == test_data.llm_config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuração de LLM não encontrada")
    llm_service = LLMService(db)
    try:
        response = await llm_service.generate_response(prompt=test_data.test_prompt, system_prompt="Você é um assistente útil. Responda em português do Brasil.", config_id=config.id)
        quality_score = 10.0 - min(response["response_time"] * 2, 5.0)
        test_result = LLMTestResult(llm_config_id=config.id, test_prompt=test_data.test_prompt, response=response["response"], response_time=response["response_time"], tokens_used=response["tokens_used"], cost=response["cost"], quality_score=quality_score)
        db.add(test_result)
        db.commit()
        db.refresh(test_result)
        return test_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao testar LLM: {str(e)}")

@router.get("/llm/stats", response_model=List[LLMStats])
async def get_llm_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    configs = db.query(LLMConfiguration).all()
    stats = []
    for config in configs:
        success_rate = 1.0 if config.total_requests > 0 else 0.0
        stats.append(LLMStats(llm_config_id=config.id, provider=config.provider.value, model_name=config.model_name, total_requests=config.total_requests, total_tokens=config.total_tokens, total_cost=config.total_cost, avg_response_time=config.avg_response_time, success_rate=success_rate))
    return stats

@router.get("/sessions", response_model=List[GameSession])
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
''',
    "game.py": '''from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pathlib import Path
from database import get_db
from models import GameSession, SessionInteraction, User, GameRule, Scenario
from schemas import InteractionCreate, InteractionResponse
from auth import get_current_active_user
from services.llm_service import LLMService
from services.audio_service import AudioService

router = APIRouter()

@router.post("/interact", response_model=InteractionResponse)
async def interact_with_game(interaction_data: InteractionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    session = db.query(GameSession).filter(GameSession.id == interaction_data.session_id, GameSession.player_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Sessão não está ativa")
    game_rules = db.query(GameRule).filter(GameRule.is_active == True).all()
    current_scenario = None
    if session.current_scenario_id:
        current_scenario = db.query(Scenario).filter(Scenario.id == session.current_scenario_id).first()
    llm_service = LLMService(db)
    context = llm_service.build_game_context(session.id, current_scenario, game_rules)
    system_prompt = "Você é um assistente de jogo interativo. Responda em português do Brasil de forma envolvente e imersiva."
    if game_rules:
        rules_text = "\\n".join([f"- {rule.title}: {rule.description}" for rule in game_rules])
        system_prompt += f"\\n\\nRegras do jogo:\\n{rules_text}"
    try:
        llm_response = await llm_service.generate_response(prompt=interaction_data.player_input, system_prompt=system_prompt, config_id=None, context=context)
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
''',
    "llm_config.py": '''from fastapi import APIRouter, Depends, HTTPException
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
''',
    "audio.py": '''from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import os
from services.audio_service import AudioService

router = APIRouter()

@router.get("/{filename}")
async def get_audio_file(filename: str):
    audio_service = AudioService()
    file_path = audio_service.audio_output_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo de áudio não encontrado")
    return FileResponse(str(file_path), media_type="audio/mpeg")
'''
}

services = {
    "llm_service.py": '''from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import time
import openai
from anthropic import Anthropic
from models import LLMConfiguration, LLMProvider

class LLMService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_llm_config(self, config_id: Optional[int] = None) -> Optional[LLMConfiguration]:
        if config_id:
            return self.db.query(LLMConfiguration).filter(LLMConfiguration.id == config_id, LLMConfiguration.is_active == True).first()
        else:
            return self.db.query(LLMConfiguration).filter(LLMConfiguration.is_active == True).first()
    
    async def generate_response(self, prompt: str, system_prompt: Optional[str] = None, config_id: Optional[int] = None, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        config = self.get_llm_config(config_id)
        if not config:
            raise ValueError("Nenhuma configuração de LLM ativa encontrada")
        start_time = time.time()
        try:
            if config.provider == LLMProvider.OPENAI:
                response = await self._call_openai(prompt, system_prompt, config, context)
            elif config.provider == LLMProvider.ANTHROPIC:
                response = await self._call_anthropic(prompt, system_prompt, config, context)
            else:
                raise ValueError(f"Provider {config.provider} não suportado")
            response_time = time.time() - start_time
            tokens_used = response.get("tokens_used", 0)
            cost = tokens_used * config.cost_per_token if config.cost_per_token else 0
            config.total_requests += 1
            config.total_tokens += tokens_used
            config.total_cost += cost
            if config.avg_response_time == 0:
                config.avg_response_time = response_time
            else:
                config.avg_response_time = (config.avg_response_time * 0.9) + (response_time * 0.1)
            self.db.commit()
            return {"response": response["text"], "tokens_used": tokens_used, "cost": cost, "response_time": response_time, "provider": config.provider.value, "model": config.model_name}
        except Exception as e:
            raise Exception(f"Erro ao gerar resposta: {str(e)}")
    
    async def _call_openai(self, prompt: str, system_prompt: Optional[str], config: LLMConfiguration, context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        client = openai.OpenAI(api_key=config.api_key)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        if context:
            messages.append({"role": "system", "content": f"Contexto: {context}"})
        messages.append({"role": "user", "content": prompt})
        response = client.chat.completions.create(model=config.model_name, messages=messages, temperature=config.temperature, max_tokens=config.max_tokens)
        return {"text": response.choices[0].message.content, "tokens_used": response.usage.total_tokens}
    
    async def _call_anthropic(self, prompt: str, system_prompt: Optional[str], config: LLMConfiguration, context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        client = Anthropic(api_key=config.api_key)
        system_message = system_prompt or ""
        if context:
            system_message += f"\\n\\nContexto: {context}"
        response = client.messages.create(model=config.model_name, max_tokens=config.max_tokens or 1024, temperature=config.temperature, system=system_message, messages=[{"role": "user", "content": prompt}])
        return {"text": response.content[0].text, "tokens_used": response.usage.input_tokens + response.usage.output_tokens}
    
    def build_game_context(self, session_id: int, current_scenario: Optional[Any] = None, game_rules: Optional[list] = None) -> Dict[str, Any]:
        context = {"language": "pt-BR", "session_id": session_id}
        if current_scenario:
            context["scenario"] = {"name": current_scenario.name, "description": current_scenario.description, "phase": current_scenario.phase}
        if game_rules:
            context["rules"] = [rule.content for rule in game_rules]
        return context
''',
    "audio_service.py": '''from typing import Optional
import os
import aiofiles
from gtts import gTTS
import speech_recognition as sr
from pydub import AudioSegment
from pathlib import Path

class AudioService:
    def __init__(self):
        self.audio_upload_dir = Path(os.getenv("AUDIO_UPLOAD_DIR", "./recordings/audio"))
        self.audio_output_dir = Path(os.getenv("AUDIO_OUTPUT_DIR", "./recordings/output"))
        self.audio_upload_dir.mkdir(parents=True, exist_ok=True)
        self.audio_output_dir.mkdir(parents=True, exist_ok=True)
    
    async def text_to_speech(self, text: str, lang: str = "pt-BR") -> str:
        try:
            tts = gTTS(text=text, lang=lang, slow=False)
            output_file = self.audio_output_dir / f"tts_{hash(text)}.mp3"
            tts.save(str(output_file))
            return str(output_file)
        except Exception as e:
            raise Exception(f"Erro ao converter texto em áudio: {str(e)}")
    
    async def speech_to_text(self, audio_file_path: str) -> str:
        try:
            recognizer = sr.Recognizer()
            audio = AudioSegment.from_file(audio_file_path)
            wav_path = audio_file_path.replace(Path(audio_file_path).suffix, ".wav")
            audio.export(wav_path, format="wav")
            with sr.AudioFile(wav_path) as source:
                audio_data = recognizer.record(source)
            try:
                text = recognizer.recognize_google(audio_data, language="pt-BR")
            except sr.UnknownValueError:
                text = "Não foi possível reconhecer o áudio"
            if os.path.exists(wav_path) and wav_path != audio_file_path:
                os.remove(wav_path)
            return text
        except Exception as e:
            raise Exception(f"Erro ao converter áudio em texto: {str(e)}")
    
    async def save_uploaded_audio(self, audio_data: bytes, filename: str) -> str:
        file_path = self.audio_upload_dir / filename
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(audio_data)
        return str(file_path)
'''
}

# Criar arquivos
for filename, content in routers.items():
    with open(f"routers/{filename}", "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Criado: routers/{filename}")

for filename, content in services.items():
    with open(f"services/{filename}", "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Criado: services/{filename}")

print("\\nTodos os arquivos foram criados com sucesso!")


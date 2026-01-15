from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pathlib import Path
from database import get_db
from models import User, Game, GameRule, Scenario, LLMConfiguration, GameSession, SessionInteraction, LLMTestResult, Invitation, InvitationStatus, UserRole, FacilitatorPlayer, Room, RoomMember
from schemas import GameCreate, GameResponse, GameRuleCreate, GameRuleResponse, ScenarioCreate, ScenarioResponse, LLMConfigCreate, LLMConfigUpdate, LLMConfigResponse, LLMTestRequest, LLMTestResponse, SessionStats, LLMStats, InvitationCreate, InvitationResponse, UserResponse
from services.email_service import EmailService
from auth import get_current_admin_user
from services.llm_service import LLMService
from services.file_service import FileService

router = APIRouter()

# ========== GAMES ==========
@router.post("/games", response_model=GameResponse, status_code=201)
async def create_game(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    cover_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    cover_image_url = None
    
    # Processar upload da imagem de capa
    if cover_image and cover_image.filename:
        try:
            file_data = await cover_image.read()
            file_service = FileService()
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"game_cover_{timestamp}_{cover_image.filename}"
            file_path = await file_service.save_uploaded_file(file_data, filename, file_type="game_cover")
            cover_image_url = file_service.get_file_url(file_path, file_type="game_cover")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao processar imagem: {str(e)}")
    
    db_game = Game(
        title=title,
        description=description,
        cover_image_url=cover_image_url
    )
    db.add(db_game)
    db.commit()
    db.refresh(db_game)
    return db_game

@router.get("/games", response_model=List[GameResponse])
async def list_games(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    games = db.query(Game).order_by(Game.created_at.desc()).offset(skip).limit(limit).all()
    return games

@router.get("/games/{game_id}", response_model=GameResponse)
async def get_game(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    return game

@router.put("/games/{game_id}", response_model=GameResponse)
async def update_game(
    game_id: int,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    cover_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    # Processar upload da imagem de capa se fornecido
    if cover_image and cover_image.filename:
        try:
            file_data = await cover_image.read()
            file_service = FileService()
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"game_cover_{timestamp}_{cover_image.filename}"
            file_path = await file_service.save_uploaded_file(file_data, filename, file_type="game_cover")
            game.cover_image_url = file_service.get_file_url(file_path, file_type="game_cover")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao processar imagem: {str(e)}")
    
    game.title = title
    game.description = description
    
    db.commit()
    db.refresh(game)
    return game

@router.delete("/games/{game_id}")
async def delete_game(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    from models import Scenario, GameRule, LLMConfiguration, GameSession, LLMTestResult, SessionInteraction, SessionScenario
    
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    # Deletar registros relacionados manualmente para garantir que funciona
    # (mesmo com cascade, é mais seguro fazer explicitamente)
    try:
        # Primeiro, obter todas as LLM configurations do jogo
        llm_configs = db.query(LLMConfiguration).filter(LLMConfiguration.game_id == game_id).all()
        llm_config_ids = [config.id for config in llm_configs]
        
        # Deletar LLM test results relacionados às configurações
        if llm_config_ids:
            db.query(LLMTestResult).filter(LLMTestResult.llm_config_id.in_(llm_config_ids)).delete()
        
        # Deletar LLM configurations
        db.query(LLMConfiguration).filter(LLMConfiguration.game_id == game_id).delete()
        
        # Obter todas as sessions do jogo
        sessions = db.query(GameSession).filter(GameSession.game_id == game_id).all()
        session_ids = [session.id for session in sessions]
        
        # Deletar session interactions relacionados às sessions
        if session_ids:
            db.query(SessionInteraction).filter(SessionInteraction.session_id.in_(session_ids)).delete()
        
        # Deletar session scenarios relacionados às sessions
        if session_ids:
            db.query(SessionScenario).filter(SessionScenario.session_id.in_(session_ids)).delete()
        
        # Deletar game sessions
        db.query(GameSession).filter(GameSession.game_id == game_id).delete()
        
        # Deletar scenarios (que já tem cascade para session_scenarios)
        db.query(Scenario).filter(Scenario.game_id == game_id).delete()
        
        # Deletar game rules
        db.query(GameRule).filter(GameRule.game_id == game_id).delete()
        
        # Agora deletar o jogo
        db.delete(game)
        db.commit()
        
        return {"message": "Jogo deletado com sucesso"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao deletar jogo: {str(e)}")

@router.get("/games/covers/{filename}")
async def get_game_cover(filename: str):
    """Serve imagens de capa dos jogos (público para permitir exibição em tags img)"""
    from fastapi.responses import FileResponse
    file_service = FileService()
    # Resolver para caminho absoluto
    game_covers_dir = file_service.game_covers_dir.resolve()
    file_path = game_covers_dir / filename
    
    # Validar que o arquivo está no diretório correto (segurança)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Arquivo não encontrado: {filename} em {game_covers_dir}")
    
    # Verificar que o arquivo está dentro do diretório de capas (segurança)
    try:
        file_path.resolve().relative_to(game_covers_dir)
    except ValueError:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Determinar content-type baseado na extensão
    ext = Path(filename).suffix.lower()
    media_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    media_type = media_types.get(ext, 'image/jpeg')
    
    return FileResponse(str(file_path.resolve()), media_type=media_type)

# ========== GAME RULES ==========
@router.post("/rules", response_model=GameRuleResponse, status_code=201)
async def create_game_rule(rule_data: GameRuleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    db_rule = GameRule(
        game_id=rule_data.game_id,
        title=rule_data.title,
        description=rule_data.description,
        rule_type=rule_data.rule_type,
        content=rule_data.content,
        created_by=current_user.id
    )
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.get("/rules", response_model=List[GameRuleResponse])
async def list_game_rules(
    game_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    query = db.query(GameRule)
    if game_id:
        query = query.filter(GameRule.game_id == game_id)
    rules = query.offset(skip).limit(limit).all()
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
    rule.game_id = rule_data.game_id
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
async def create_scenario(
    game_id: int = Form(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    image_url: Optional[str] = Form(None),
    phase: int = Form(1),
    order: int = Form(0),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    file_url = None
    file_content = None
    
    # Processar arquivo se fornecido
    if file and file.filename:
        allowed_extensions = ['.pdf', '.docx', '.doc', '.txt']
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Formato de arquivo não suportado. Use: {', '.join(allowed_extensions)}")
        
        try:
            file_service = FileService()
            file_data = await file.read()
            
            # Salvar arquivo
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"scenario_{timestamp}_{file.filename}"
            file_path = await file_service.save_uploaded_file(file_data, filename)
            
            # Extrair texto do arquivo
            file_content = await file_service.extract_text_from_file(file_path, file_ext)
            file_url = file_service.get_file_url(file_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao processar arquivo: {str(e)}")
    
    db_scenario = Scenario(
        game_id=game_id,
        name=name,
        description=description,
        image_url=image_url,
        file_url=file_url,
        file_content=file_content,
        phase=phase,
        order=order
    )
    db.add(db_scenario)
    db.commit()
    db.refresh(db_scenario)
    return db_scenario

@router.get("/scenarios", response_model=List[ScenarioResponse])
async def list_scenarios(
    game_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    query = db.query(Scenario)
    if game_id:
        query = query.filter(Scenario.game_id == game_id)
    scenarios = query.order_by(Scenario.order).offset(skip).limit(limit).all()
    return scenarios

@router.put("/scenarios/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(
    scenario_id: int,
    game_id: int = Form(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    image_url: Optional[str] = Form(None),
    phase: int = Form(1),
    order: int = Form(0),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    # Processar arquivo se fornecido
    if file and file.filename:
        allowed_extensions = ['.pdf', '.docx', '.doc', '.txt']
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Formato de arquivo não suportado. Use: {', '.join(allowed_extensions)}")
        
        try:
            file_service = FileService()
            file_data = await file.read()
            
            # Salvar arquivo
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"scenario_{timestamp}_{file.filename}"
            file_path = await file_service.save_uploaded_file(file_data, filename)
            
            # Extrair texto do arquivo
            file_content = await file_service.extract_text_from_file(file_path, file_ext)
            file_url = file_service.get_file_url(file_path)
            
            scenario.file_url = file_url
            scenario.file_content = file_content
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao processar arquivo: {str(e)}")
    
    # Atualizar outros campos
    scenario.game_id = game_id
    scenario.name = name
    scenario.description = description
    scenario.image_url = image_url
    scenario.phase = phase
    scenario.order = order
    
    db.commit()
    db.refresh(scenario)
    return scenario

@router.get("/scenarios/files/{filename}")
async def get_scenario_file(filename: str, current_user: User = Depends(get_current_admin_user)):
    """Serve arquivos de cenários"""
    from fastapi.responses import FileResponse
    file_service = FileService()
    file_path = file_service.upload_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    # Determinar content-type baseado na extensão
    ext = Path(filename).suffix.lower()
    media_types = {
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
        '.txt': 'text/plain'
    }
    media_type = media_types.get(ext, 'application/octet-stream')
    
    return FileResponse(str(file_path), media_type=media_type)

@router.post("/llm/configs", response_model=LLMConfigResponse, status_code=201)
async def create_llm_config(config_data: LLMConfigCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    db_config = LLMConfiguration(
        game_id=config_data.game_id,
        provider=config_data.provider,
        model_name=config_data.model_name,
        api_key=config_data.api_key,
        cost_per_token=config_data.cost_per_token,
        max_tokens=config_data.max_tokens,
        temperature=config_data.temperature
    )
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

@router.get("/llm/configs", response_model=List[LLMConfigResponse])
async def list_llm_configs(
    game_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    query = db.query(LLMConfiguration)
    if game_id:
        query = query.filter(LLMConfiguration.game_id == game_id)
    configs = query.all()
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

@router.get("/rooms/overview")
async def get_rooms_overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    """Retorna visão hierárquica: facilitadores -> jogadores -> salas -> sessões -> interações."""
    facilitator_links = db.query(FacilitatorPlayer).all()
    players_by_facilitator = {}
    assigned_player_ids = set()

    for link in facilitator_links:
        assigned_player_ids.add(link.player_id)
        players_by_facilitator.setdefault(link.facilitator_id, set()).add(link.player_id)

    facilitators = db.query(User).filter(User.role == UserRole.FACILITATOR).all()

    def build_room_details(player_id: int):
        room_memberships = db.query(RoomMember).filter(RoomMember.user_id == player_id).all()
        room_ids = list({rm.room_id for rm in room_memberships})
        if not room_ids:
            return []

        rooms = db.query(Room).filter(Room.id.in_(room_ids), Room.is_active == True).all()
        room_details = []
        for room in rooms:
            sessions = db.query(GameSession).filter(
                GameSession.room_id == room.id,
                GameSession.player_id == player_id
            ).order_by(GameSession.created_at.desc()).all()

            session_details = []
            for session in sessions:
                game = db.query(Game).filter(Game.id == session.game_id).first()
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
                        "ai_response_audio_url": interaction.ai_response_audio_url,
                        "llm_provider": interaction.llm_provider,
                        "llm_model": interaction.llm_model,
                        "tokens_used": interaction.tokens_used,
                        "cost": interaction.cost,
                        "response_time": interaction.response_time,
                        "created_at": interaction.created_at.isoformat() if interaction.created_at else None
                    })

                session_details.append({
                    "id": session.id,
                    "status": session.status,
                    "current_phase": session.current_phase,
                    "game_id": session.game_id,
                    "game_title": game.title if game else "Jogo desconhecido",
                    "created_at": session.created_at.isoformat() if session.created_at else None,
                    "last_activity": session.last_activity.isoformat() if session.last_activity else None,
                    "interactions": interaction_list
                })

            room_details.append({
                "id": room.id,
                "name": room.name,
                "description": room.description,
                "max_players": room.max_players,
                "created_at": room.created_at.isoformat() if room.created_at else None,
                "sessions": session_details
            })

        return room_details

    facilitator_data = []
    for facilitator in facilitators:
        player_ids = list(players_by_facilitator.get(facilitator.id, set()))
        players = []
        for player_id in player_ids:
            player = db.query(User).filter(User.id == player_id).first()
            if not player:
                continue
            players.append({
                "id": player.id,
                "username": player.username,
                "email": player.email,
                "rooms": build_room_details(player.id)
            })

        facilitator_data.append({
            "id": facilitator.id,
            "username": facilitator.username,
            "email": facilitator.email,
            "players": players
        })

    unassigned_players = db.query(User).filter(
        User.role == UserRole.PLAYER,
        ~User.id.in_(assigned_player_ids)
    ).all()

    unassigned_data = []
    for player in unassigned_players:
        unassigned_data.append({
            "id": player.id,
            "username": player.username,
            "email": player.email,
            "rooms": build_room_details(player.id)
        })

    return {
        "facilitators": facilitator_data,
        "unassigned_players": unassigned_data
    }

# ========== FACILITATORS ==========
@router.get("/facilitators", response_model=List[UserResponse])
async def list_facilitators(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Lista todos os facilitadores"""
    facilitators = db.query(User).filter(User.role == UserRole.FACILITATOR).offset(skip).limit(limit).all()
    return facilitators

@router.post("/facilitators/invite", response_model=InvitationResponse, status_code=201)
async def invite_facilitator(
    invitation_data: InvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Cria convite para facilitador"""
    if invitation_data.role != UserRole.FACILITATOR:
        raise HTTPException(status_code=400, detail="Este endpoint é apenas para convites de facilitadores")
    
    # Verificar se já existe usuário com este e-mail
    existing_user = db.query(User).filter(User.email == invitation_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Já existe um usuário com este e-mail")
    
    # Verificar se já existe convite pendente
    existing_invitation = db.query(Invitation).filter(
        Invitation.email == invitation_data.email,
        Invitation.status == InvitationStatus.PENDING
    ).first()
    if existing_invitation:
        raise HTTPException(status_code=400, detail="Já existe um convite pendente para este e-mail")
    
    # Gerar token e criar convite
    email_service = EmailService()
    token = email_service.generate_invitation_token()
    expires_at = email_service.get_invitation_expiry()
    
    invitation = Invitation(
        email=invitation_data.email,
        role=UserRole.FACILITATOR,
        inviter_id=current_user.id,
        token=token,
        status=InvitationStatus.PENDING,
        expires_at=expires_at
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    
    # Enviar e-mail (por enquanto apenas log)
    await email_service.send_invitation_email(
        email=invitation_data.email,
        role="facilitator",
        invitation_token=token,
        inviter_name=current_user.username
    )
    
    return invitation

@router.get("/facilitators/invitations", response_model=List[InvitationResponse])
async def list_facilitator_invitations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Lista todos os convites de facilitadores"""
    invitations = db.query(Invitation).filter(
        Invitation.role == UserRole.FACILITATOR
    ).order_by(Invitation.created_at.desc()).offset(skip).limit(limit).all()
    return invitations

@router.delete("/facilitators/{facilitator_id}")
async def delete_facilitator(
    facilitator_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Remove um facilitador"""
    facilitator = db.query(User).filter(
        User.id == facilitator_id,
        User.role == UserRole.FACILITATOR
    ).first()
    
    if not facilitator:
        raise HTTPException(status_code=404, detail="Facilitador não encontrado")
    
    db.delete(facilitator)
    db.commit()
    return {"message": "Facilitador removido com sucesso"}

@router.delete("/facilitators/invitations/{invitation_id}")
async def delete_facilitator_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Remove um convite de facilitador"""
    invitation = db.query(Invitation).filter(
        Invitation.id == invitation_id,
        Invitation.role == UserRole.FACILITATOR
    ).first()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Convite não encontrado")
    
    db.delete(invitation)
    db.commit()
    return {"message": "Convite removido com sucesso"}

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import re
import unicodedata
from pathlib import Path
from database import get_db
from models import GameSession, SessionInteraction, User, GameRule, Scenario, LLMConfiguration, PlayerGameAccess, UserRole
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
    # Se game_id fornecido, verificar acesso do jogador
    if game_id and current_user.role == UserRole.PLAYER:
        access = db.query(PlayerGameAccess).filter(
            PlayerGameAccess.player_id == current_user.id,
            PlayerGameAccess.game_id == game_id
        ).first()
        if not access:
            raise HTTPException(status_code=403, detail="Você não tem acesso a este jogo")
    
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
    
    # Buscar elementos do jogo da sessão
    game_rules = db.query(GameRule).filter(
        GameRule.game_id == session.game_id,
        GameRule.is_active == True
    ).all()
    scenarios = db.query(Scenario).filter(
        Scenario.game_id == session.game_id,
        Scenario.is_active == True
    ).order_by(Scenario.phase, Scenario.order).all()

    def _norm(text: str) -> str:
        if not text:
            return ""
        normalized = unicodedata.normalize("NFKD", text)
        return "".join([c for c in normalized if not unicodedata.combining(c)]).lower()

    def _is_history_rule(rule: GameRule) -> bool:
        return _norm(rule.title).startswith("historia")

    def _is_prompt_instruction(rule: GameRule) -> bool:
        return "prompt de instrucao" in _norm(rule.title)

    number_words = {
        "um": 1, "uma": 1, "dois": 2, "duas": 2, "tres": 3, "três": 3,
        "quatro": 4, "cinco": 5, "seis": 6, "sete": 7, "oito": 8,
        "nove": 9, "dez": 10, "onze": 11, "doze": 12, "treze": 13,
        "catorze": 14, "quatorze": 14, "quinze": 15, "dezesseis": 16,
        "dezessete": 17, "dezoito": 18, "dezenove": 19, "vinte": 20
    }

    def _extract_age(text: str) -> Optional[int]:
        if not text:
            return None
        matches = re.findall(r"(\\d{1,3})\\s*(anos?)?", text.lower())
        for match in matches:
            try:
                age = int(match[0])
                if 3 <= age <= 120:
                    return age
            except ValueError:
                continue
        normalized = _norm(text)
        word_match = re.search(r"(?:tenho\s+)?([a-záàâãéêíóôõúç]+)\s+anos?", normalized)
        if word_match:
            word = word_match.group(1)
            return number_words.get(word)
        return None

    def _get_player_age() -> Optional[int]:
        age = _extract_age(interaction_data.player_input or "")
        if age:
            return age
        previous = db.query(SessionInteraction).filter(
            SessionInteraction.session_id == session.id
        ).order_by(SessionInteraction.created_at.asc()).all()
        for interaction in previous:
            age = _extract_age(interaction.player_input or "")
            if age:
                return age
        return None

    def _extract_player_name(text: str) -> Optional[str]:
        if not text:
            return None
        match = re.search(r"(me chamo|meu nome é|meu nome e|sou)\s+([A-Za-zÀ-ÿ' -]+)", text, re.IGNORECASE)
        if match:
            name = match.group(2).strip()
            name = re.split(r"(\s+e\s+|\s+tenho\s+|,|\.|;)", name)[0].strip()
            return name.title()
        return None

    def _extract_player_count(text: str) -> Optional[int]:
        if not text:
            return None
        match = re.search(r"(somos|temos)\\s*(\\d{1,2})", text, re.IGNORECASE)
        if match:
            try:
                return int(match.group(2))
            except ValueError:
                return None
        word_match = re.search(r"(somos|temos)\\s*([a-záàâãéêíóôõúç]+)", _norm(text))
        if word_match:
            return number_words.get(word_match.group(2))
        inline_match = re.search(r"(\\d{1,2})\\s+jogadores", text, re.IGNORECASE)
        if inline_match:
            return int(inline_match.group(1))
        inline_word = re.search(r"([a-záàâãéêíóôõúç]+)\\s+jogadores", _norm(text))
        if inline_word:
            return number_words.get(inline_word.group(1))
        return None

    def _parse_players_list(text: str) -> List[Dict[str, Any]]:
        if not text:
            return []
        players = []
        pattern = r"jogador\\s*\\d+\\s*[:\\-]\\s*([A-Za-zÀ-ÿ' -]+)\\s*,\\s*(\\d{1,3})\\s*anos?"
        for line in text.splitlines():
            match = re.search(r"^\\s*[-•]?\\s*" + pattern, line, re.IGNORECASE)
            if match:
                name = match.group(1).strip().title()
                age = int(match.group(2))
                if 3 <= age <= 120:
                    players.append({"name": name, "age": age})
        if not players:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                name = match.group(1).strip().title()
                age = int(match.group(2))
                if 3 <= age <= 120:
                    players.append({"name": name, "age": age})
        return players

    def _get_player_profile() -> Dict[str, Any]:
        profile = {"age": None, "name": None, "count": None, "players": []}
        # Preferir o input atual
        profile["players"] = _parse_players_list(interaction_data.player_input or "")
        if profile["players"]:
            profile["count"] = len(profile["players"])
        profile["age"] = _extract_age(interaction_data.player_input or "")
        profile["name"] = _extract_player_name(interaction_data.player_input or "")
        if profile["count"] is None:
            profile["count"] = _extract_player_count(interaction_data.player_input or "")
        if (profile["players"] or (profile["age"] and profile["name"])) and profile["count"]:
            return profile
        previous = db.query(SessionInteraction).filter(
            SessionInteraction.session_id == session.id
        ).order_by(SessionInteraction.created_at.asc()).all()
        for interaction in previous:
            if not profile["players"]:
                profile["players"] = _parse_players_list(interaction.player_input or "")
                if profile["players"]:
                    profile["count"] = len(profile["players"])
            if profile["age"] is None:
                profile["age"] = _extract_age(interaction.player_input or "")
            if profile["name"] is None:
                profile["name"] = _extract_player_name(interaction.player_input or "")
            if profile["count"] is None:
                profile["count"] = _extract_player_count(interaction.player_input or "")
            if (profile["players"] or (profile["age"] and profile["name"])) and profile["count"]:
                break
        return profile

    def _scene_by_prefix(prefix: str) -> Optional[Scenario]:
        for scenario in scenarios:
            if _norm(scenario.name).startswith(_norm(prefix)):
                return scenario
        return None

    def _scene_by_contains(text: str) -> Optional[Scenario]:
        target = _norm(text)
        for scenario in scenarios:
            if target in _norm(scenario.name):
                return scenario
        return None

    def _selected_element(text: str) -> Optional[str]:
        normalized = _norm(text)
        if "agua" in normalized:
            return "agua"
        if "fogo" in normalized:
            return "fogo"
        if "terra" in normalized:
            return "terra"
        if "ar" in normalized:
            return "ar"
        return None

    def _is_completion(text: str) -> bool:
        normalized = _norm(text)
        return any(term in normalized for term in ["finalizei", "finalizar", "conclui", "concluir", "terminei", "terminar", "pronto"])

    current_scenario = None
    if session.current_scenario_id:
        current_scenario = db.query(Scenario).filter(Scenario.id == session.current_scenario_id).first()

    intro_scene = _scene_by_prefix("Introdução") or _scene_by_contains("Introducao")
    if is_first_interaction or not current_scenario:
        if intro_scene:
            session.current_scenario_id = intro_scene.id
            current_scenario = intro_scene
        elif scenarios:
            current_scenario = scenarios[0]

    # Fluxo determinístico baseado na seleção do elemento e ordem das cenas
    if current_scenario and intro_scene and current_scenario.id == intro_scene.id:
        element = _selected_element(interaction_data.player_input or "")
        if element:
            portal_scene = _scene_by_prefix(f"Cena 0A - Portal") and _scene_by_contains(f"Portal da {element}")
            if not portal_scene:
                portal_scene = _scene_by_contains(f"Cena 0A") or _scene_by_contains(f"Portal {element}")
            if portal_scene:
                session.current_scenario_id = portal_scene.id
                current_scenario = portal_scene
    elif current_scenario and _is_completion(interaction_data.player_input or ""):
        current_name = _norm(current_scenario.name)
        if current_name.startswith(_norm("Cena 0A")):
            next_scene = _scene_by_prefix("Cena 0B")
            if next_scene:
                session.current_scenario_id = next_scene.id
                current_scenario = next_scene
        elif current_name.startswith(_norm("Cena 0B")):
            next_scene = _scene_by_prefix("Cena 01 - Temperança") or _scene_by_prefix("Cena 01")
            if next_scene:
                session.current_scenario_id = next_scene.id
                current_scenario = next_scene
        else:
            number_match = re.search(r"cena\\s*(\\d{2})", current_name)
            if number_match:
                current_number = int(number_match.group(1))
                next_number = current_number + 1
                next_scene = _scene_by_prefix(f"Cena {next_number:02d}")
                if next_scene:
                    session.current_scenario_id = next_scene.id
                    current_scenario = next_scene
    
    llm_service = LLMService(db)
    context = llm_service.build_game_context(session.id, current_scenario, game_rules)
    system_prompt = "Você é um assistente de jogo interativo. Responda em português do Brasil de forma envolvente e imersiva."
    
    # Se for a primeira interação, iniciar sempre pela cena "Introdução"
    if is_first_interaction and current_scenario and current_scenario.file_content:
        system_prompt += "\n\nINÍCIO DO JOGO - CENA INTRODUÇÃO:\n"
        system_prompt += f"{current_scenario.file_content}\n\n"
        system_prompt += "Apresente este conteúdo ao jogador de forma envolvente e natural, como se estivesse narrando o início da história. Adapte o texto para uma conversa interativa."
    
    def _rule_group(rule: GameRule) -> int:
        title = _norm(rule.title)
        if "regras" in title or "mecanicas" in title or rule.rule_type in ["rule", "mechanic"]:
            return 1
        if "estrutura" in title and "cena" in title:
            return 2
        if "nivel" in title and "poder" in title:
            return 3
        return 9

    if is_first_interaction and game_rules:
        ordered = sorted(
            [r for r in game_rules if not _is_history_rule(r) and not _is_prompt_instruction(r)],
            key=_rule_group
        )
        ordered = [r for r in ordered if _rule_group(r) in [1, 2, 3]]
        if ordered:
            system_prompt += "\n\nELEMENTOS DO JOGO (APENAS NO INÍCIO):"
            for rule in ordered:
                file_content = (rule.content or {}).get("file_content")
                if file_content:
                    system_prompt += f"\n\n{rule.title}:\n{file_content}"

    prompt_instruction = next((r for r in game_rules if _is_prompt_instruction(r)), None)
    prompt_text = (prompt_instruction.content or {}).get("file_content") if prompt_instruction else ""
    if prompt_text:
        system_prompt += "\n\nPROMPT DE INSTRUÇÃO:\n"
        system_prompt += f"{prompt_text}\n"

    profile = _get_player_profile()
    if profile.get("count") or profile.get("name") or profile.get("age") or profile.get("players"):
        system_prompt += "\n\nINFORMAÇÕES DO JOGADOR (MANTER DURANTE TODO O JOGO):"
        if profile.get("players"):
            for idx, player in enumerate(profile["players"], start=1):
                system_prompt += f"\n- Jogador {idx}: {player.get('name')} ({player.get('age')} anos)"
        if profile.get("count"):
            system_prompt += f"\n- Quantidade de jogadores: {profile['count']}"
        if profile.get("name"):
            system_prompt += f"\n- Nome: {profile['name']}"
        if profile.get("age"):
            system_prompt += f"\n- Idade: {profile['age']}"
            system_prompt += "\n- Tom de linguagem deve ser adequado à idade do jogador."
        system_prompt += "\n- Não pergunte novamente por nome, idade ou quantidade de jogadores se já informado."

    # Incluir histórias apenas quando o jogador pedir detalhes de um reino específico
    normalized_input = _norm(interaction_data.player_input or "")
    asks_history = "historia" in normalized_input and "reino" in normalized_input
    if asks_history:
        history_rules = [r for r in game_rules if _is_history_rule(r)]
        if history_rules:
            system_prompt += "\n\nHISTÓRIA DO REINO (APENAS QUANDO SOLICITADA):"
            # tentar filtrar por termos da pergunta
            terms = [t for t in normalized_input.split() if len(t) > 3]
            matched = []
            for rule in history_rules:
                title = _norm(rule.title)
                if any(t in title for t in terms):
                    matched.append(rule)
            selected = matched or history_rules
            for rule in selected:
                file_content = (rule.content or {}).get("file_content")
                if file_content:
                    system_prompt += f"\n\n{rule.title}:\n{file_content}"

    if current_scenario and current_scenario.file_content:
        system_prompt += f"\n\nCENA ATUAL:\n{current_scenario.name}\n{current_scenario.file_content}"
    
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
    if current_user.role.value != "ADMIN" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    interactions = db.query(SessionInteraction).filter(SessionInteraction.session_id == session_id).order_by(SessionInteraction.created_at.desc()).offset(skip).limit(limit).all()
    return interactions

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import random
import re
import unicodedata
from pathlib import Path
from database import get_db
from models import GameSession, SessionInteraction, User, GameRule, Scenario, LLMConfiguration, PlayerGameAccess, UserRole, PlayerBoard, RoomMember
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

@router.get("/boards/{session_id}/order")
async def get_board_order(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if current_user.role.value != "ADMIN" and session.player_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")

    board = db.query(PlayerBoard).filter(PlayerBoard.session_id == session_id).first()
    state = board.board_state if board else {}
    order = state.get("order") if isinstance(state, dict) else None
    turn_index = int(state.get("turn_index") or 0) if isinstance(state, dict) else 0

    if not order:
        order = []
        if session.room_id:
            members = db.query(RoomMember).filter(RoomMember.room_id == session.room_id).all()
            member_users = db.query(User).filter(User.id.in_([m.user_id for m in members])).all()
            user_map = {u.id: u.username for u in member_users}
            for idx, member in enumerate(members):
                order.append({"slot": idx + 1, "name": user_map.get(member.user_id, f"Jogador {idx + 1}")})
        if not order:
            order = [{"slot": 1, "name": "Jogador 1"}]
        turn_index = 0

    current = order[turn_index % len(order)]
    next_player = order[(turn_index + 1) % len(order)] if len(order) > 1 else current
    return {"order": order, "current": current, "next": next_player}

@router.post("/interact", response_model=InteractionResponse)
async def interact_with_game(interaction_data: InteractionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    session = db.query(GameSession).filter(GameSession.id == interaction_data.session_id, GameSession.player_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if session.status != "active":
        if session.status == "paused":
            session.status = "active"
            session.last_activity = datetime.utcnow()
            db.add(session)
            db.commit()
            db.refresh(session)
        else:
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

    def _is_rules_rule(rule: GameRule) -> bool:
        title = _norm(rule.title)
        return "regras" in title or "mecanicas" in title or rule.rule_type in ["rule", "mechanic"]

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
        match = re.search(r"(me chamo|meu nome é|meu nome e|sou|chamo-me|nome\s*[:\-])\s*([A-Za-zÀ-ÿ' -]+)", text, re.IGNORECASE)
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
        pattern = r"jogador\\s*\\d+\\s*[:\\-]\\s*([A-Za-zÀ-ÿ' -]+?)\\s*(?:,|\\-|\\(|\\s)\\s*(\\d{1,3})\\s*anos?\\)?"
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
        if profile["count"] is None:
            if profile["players"]:
                profile["count"] = len(profile["players"])
            elif profile["age"] and profile["name"]:
                profile["count"] = 1
        if not profile["players"] and profile["age"] and profile["name"]:
            profile["players"] = [{"name": profile["name"], "age": profile["age"]}]
        return profile

    def _get_youngest_age(profile: Dict[str, Any]) -> Optional[int]:
        ages = []
        for player in profile.get("players") or []:
            if isinstance(player.get("age"), int):
                ages.append(player["age"])
        if isinstance(profile.get("age"), int):
            ages.append(profile["age"])
        return min(ages) if ages else None

    def _get_recent_interactions(limit: Optional[int] = None) -> List[SessionInteraction]:
        query = db.query(SessionInteraction).filter(
            SessionInteraction.session_id == session.id
        ).order_by(SessionInteraction.created_at.asc())
        if limit:
            query = query.limit(limit)
        return query.all()

    def _sanitize_scene_text(content: str) -> str:
        if not content:
            return ""
        lines: List[str] = []
        skip_block = False
        for line in content.splitlines():
            stripped = line.strip()
            if not stripped:
                if not skip_block:
                    lines.append(line)
                continue
            normalized = _norm(stripped)
            if normalized.startswith("nao exibir ao jogador"):
                skip_block = True
                continue
            if skip_block:
                continue
            if normalized.startswith("a partir daqui") or normalized.startswith("a ia ") or normalized.startswith("se for "):
                continue
            lines.append(line)
        return "\n".join(lines).strip()

    def _extract_rules_section(content: str, section_number: int) -> str:
        if not content:
            return ""
        pattern = rf"(?:se[cç][aã]o)\s*{section_number}\\b[:\\.\\-]*"
        normalized = _norm(content)
        match = re.search(pattern, normalized, re.IGNORECASE)
        if not match:
            return ""
        start = match.start()
        end_match = re.search(rf"(?:se[cç][aã]o)\s*{section_number + 1}\\b", normalized[start:])
        end_index = start + end_match.start() if end_match else len(content)
        return content[start:end_index].strip()

    def _sanitize_rules_text(content: str) -> str:
        if not content:
            return ""
        lines: List[str] = []
        blocked_terms = [
            "dado", "dados", "rolar", "rolagem", "anula", "anular", "substitui", "substituir",
            "impede", "avanca", "avanç", "cena", "elemento", "sombra", "luz", "jogador", "ia",
            "pode", "podem", "deve", "devem", "quando", "caso", "se ", "regras", "mecanica", "mecânica"
        ]
        for line in content.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            normalized = _norm(stripped)
            if normalized.startswith("seção") or normalized.startswith("secao"):
                continue
            if any(term in normalized for term in blocked_terms):
                continue
            if normalized[:1].isdigit():
                continue
            lines.append(line)
        return "\n".join(lines).strip()

    def _get_rules_file_content() -> str:
        for rule in game_rules:
            if not _is_rules_rule(rule):
                continue
            file_content = (rule.content or {}).get("file_content")
            if file_content:
                return file_content
        return ""

    def _is_dice_roll_request(text: str) -> bool:
        normalized = _norm(text)
        return "rolar dados" in normalized or "rolar os dados" in normalized or "rolar dado" in normalized

    def _get_or_create_board() -> PlayerBoard:
        board = db.query(PlayerBoard).filter(
            PlayerBoard.session_id == session.id,
            PlayerBoard.player_id == current_user.id
        ).first()
        if board:
            return board
        board = PlayerBoard(session_id=session.id, player_id=current_user.id, board_state={})
        db.add(board)
        db.commit()
        db.refresh(board)
        return board

    def _build_roll_order(profile_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        players = profile_data.get("players") or []
        if players:
            return [
                {"slot": idx + 1, "name": player.get("name") or f"Jogador {idx + 1}"}
                for idx, player in enumerate(players)
            ]
        count = profile_data.get("count") or 1
        return [{"slot": idx + 1, "name": f"Jogador {idx + 1}"} for idx in range(count)]

    def _apply_shadow_light_rules(slot_state: Dict[str, Any], element_key: str) -> Dict[str, Any]:
        counts = slot_state.get("counts") or {}
        effect: Dict[str, Any] = {}
        if element_key == "sombra":
            if int(counts.get("luz", 0)) > 0:
                counts["luz"] = int(counts.get("luz", 0)) - 1
                effect["shadow_canceled_light"] = True
            else:
                counts["sombra"] = int(counts.get("sombra", 0)) + 1
                effect["shadow_added"] = True
        elif element_key == "luz":
            if int(counts.get("sombra", 0)) > 0:
                counts["sombra"] = int(counts.get("sombra", 0)) - 1
                effect["light_canceled_shadow"] = True
            else:
                counts["luz"] = int(counts.get("luz", 0)) + 1
                effect["light_added"] = True
        else:
            counts[element_key] = int(counts.get(element_key, 0)) + 1
            effect["element_added"] = element_key
        slot_state["counts"] = counts
        return effect

    def _update_board_with_element(board: PlayerBoard, element_key: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        state = board.board_state or {}
        order = state.get("order") or _build_roll_order(profile_data)
        if not order:
            order = [{"slot": 1, "name": "Jogador 1"}]
        turn_index = int(state.get("turn_index") or 0)
        current_turn = order[turn_index % len(order)]
        slots = state.get("slots") or {}
        slot_key = str(current_turn["slot"])
        slot_state = slots.get(slot_key) or {}
        effect = _apply_shadow_light_rules(slot_state, element_key)
        history = slot_state.get("history") or []
        history.append({"element": element_key, "effect": effect, "at": datetime.utcnow().isoformat()})
        slot_state["history"] = history
        slots[slot_key] = slot_state
        state["slots"] = slots
        state["order"] = order
        state["turn_index"] = (turn_index + 1) % len(order)
        board.board_state = state
        db.add(board)
        return {"order": order, "current": current_turn, "next": order[state["turn_index"]]}

    def _format_board_status(session_id: int) -> str:
        board = db.query(PlayerBoard).filter(PlayerBoard.session_id == session_id).first()
        if not board or not isinstance(board.board_state, dict):
            return "Tabuleiro pessoal: sem registros."
        state = board.board_state or {}
        order = state.get("order") or []
        slots = state.get("slots") or {}
        label_map = {
            "agua": "Água",
            "ar": "Ar",
            "terra": "Terra",
            "fogo": "Fogo",
            "sombra": "Sombra",
            "luz": "Luz",
        }
        lines = ["Tabuleiro pessoal (status atual):"]
        if order:
            for item in order:
                slot_key = str(item.get("slot"))
                slot_state = slots.get(slot_key) or {}
                counts = slot_state.get("counts") or {}
                if not counts:
                    counts_text = "sem elementos registrados"
                else:
                    counts_text = ", ".join(
                        f"{label_map.get(key, key)}: {counts[key]}" for key in counts
                    )
                lines.append(f"- {item.get('name', f'Jogador {slot_key}')}: {counts_text}")
            return "\n".join(lines)
        # fallback para caso não exista ordem
        counts = state.get("counts") or {}
        if not counts:
            return "Tabuleiro pessoal: sem registros."
        counts_text = ", ".join(f"{label_map.get(key, key)}: {counts[key]}" for key in counts)
        return f"Tabuleiro pessoal (status atual): {counts_text}"

    def _split_scene_segments(content: str) -> List[str]:
        if not content:
            return []
        content = _sanitize_scene_text(content)
        if not content:
            return []
        segments: List[str] = []
        current: List[str] = []
        question_seen = False
        for line in content.splitlines():
            if question_seen and "?" in line:
                chunk = "\n".join(current).strip()
                if chunk:
                    segments.append(chunk)
                current = [line]
                question_seen = "?" in line
                continue
            current.append(line)
            if "?" in line:
                question_seen = True
        if current:
            chunk = "\n".join(current).strip()
            if chunk:
                segments.append(chunk)
        return segments

    def _get_scene_segments(scene: Optional[Scenario]) -> List[str]:
        if not scene or not scene.file_content:
            return []
        return _split_scene_segments(scene.file_content)

    def _is_intro_scene(scene: Scenario) -> bool:
        return _norm(scene.name).startswith(_norm("Introdução")) or _norm(scene.name).startswith(_norm("Introducao"))

    def _portal_scene_for_element(element: Optional[str]) -> Optional[Scenario]:
        if not element:
            return None
        targets = [
            f"Cena 0A - Portal da {element}",
            f"Cena 0A - Portal do {element}",
            f"Portal da {element}",
            f"Portal do {element}",
        ]
        for target in targets:
            scene = _scene_by_contains(target)
            if scene:
                return scene
        return None

    def _next_scene_by_order(scene: Scenario) -> Optional[Scenario]:
        current_name = _norm(scene.name)
        if current_name.startswith(_norm("Cena 0A")):
            return _scene_by_prefix("Cena 0B")
        if current_name.startswith(_norm("Cena 0B")):
            return _scene_by_prefix("Cena 01 - Temperança") or _scene_by_prefix("Cena 01")
        match = re.search(r"cena\s*(\d{2})", current_name)
        if match:
            current_number = int(match.group(1))
            next_number = current_number + 1
            return _scene_by_prefix(f"Cena {next_number:02d}")
        return None

    def _consume_segment_index(index: int, segments: List[str]) -> int:
        if segments and index < len(segments):
            return index + 1
        return index

    def _advance_state_for_input(scene: Optional[Scenario], index: int, player_input: str) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "scene": scene,
            "index": index,
            "scene_changed": False,
            "decision_reason": "manter_cena",
            "element": _selected_element(player_input),
        }
        if not scene:
            return result
        segments = _get_scene_segments(scene)
        if _is_intro_scene(scene) and result["element"]:
            portal_scene = _portal_scene_for_element(result["element"])
            if portal_scene:
                scene = portal_scene
                index = 0
                segments = _get_scene_segments(scene)
                result.update({
                    "scene": scene,
                    "index": index,
                    "scene_changed": True,
                    "decision_reason": "selecionou_elemento",
                })
        if not result["scene_changed"] and index >= len(segments):
            next_scene = _next_scene_by_order(scene)
            if next_scene:
                scene = next_scene
                index = 0
                segments = _get_scene_segments(scene)
                result.update({
                    "scene": scene,
                    "index": index,
                    "scene_changed": True,
                    "decision_reason": "fim_da_cena",
                })
        result["segments"] = segments
        result["next_segment"] = segments[index] if index < len(segments) else ""
        return result

    def _simulate_state(interactions: List[SessionInteraction], base_scene: Optional[Scenario]) -> Dict[str, Any]:
        scene = base_scene
        index = 0
        for interaction in interactions:
            decision = _advance_state_for_input(scene, index, interaction.player_input or "")
            scene = decision["scene"]
            segments = decision.get("segments") or _get_scene_segments(scene)
            index = decision["index"]
            index = _consume_segment_index(index, segments)
        return {"scene": scene, "index": index}

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
    if False and (is_first_interaction or not current_scenario):
        if intro_scene:
            session.current_scenario_id = intro_scene.id
            current_scenario = intro_scene
        elif scenarios:
            current_scenario = scenarios[0]

    # Fluxo determinístico baseado na seleção do elemento e ordem das cenas
    if False and current_scenario and intro_scene and current_scenario.id == intro_scene.id:
        element = _selected_element(interaction_data.player_input or "")
        if element:
            portal_scene = _scene_by_prefix(f"Cena 0A - Portal") and _scene_by_contains(f"Portal da {element}")
            if not portal_scene:
                portal_scene = _scene_by_contains(f"Cena 0A") or _scene_by_contains(f"Portal {element}")
            if portal_scene:
                session.current_scenario_id = portal_scene.id
                current_scenario = portal_scene
    elif False and current_scenario and _is_completion(interaction_data.player_input or ""):
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
    
    # Ciclo cognitivo do NPC (percepção -> memória -> decisão -> ação -> feedback)
    base_scene = intro_scene or current_scenario or (scenarios[0] if scenarios else None)
    if not base_scene:
        raise HTTPException(status_code=400, detail="Nenhuma cena ativa encontrada para esta sessão.")

    history_interactions = _get_recent_interactions()
    simulated_state = _simulate_state(history_interactions, base_scene)
    previous_scene = simulated_state.get("scene") or base_scene
    segment_index = session.current_scene_index if session.current_scene_index is not None else simulated_state.get("index", 0)

    decision = _advance_state_for_input(previous_scene, segment_index, interaction_data.player_input or "")
    decided_scene = decision.get("scene") or previous_scene
    scene_changed = decision.get("scene_changed", False)
    decision_reason = decision.get("decision_reason", "manter_cena")
    element_selected = decision.get("element")
    segments = decision.get("segments") or _get_scene_segments(decided_scene)
    next_segment = decision.get("next_segment") or ""
    next_index_for_storage = _consume_segment_index(decision.get("index", 0), segments)

    if decided_scene and decided_scene.id:
        session.current_scenario_id = decided_scene.id
        current_scenario = decided_scene
    session.current_scene_index = next_index_for_storage

    llm_service = LLMService(db)
    context = llm_service.build_game_context(session.id, current_scenario, game_rules)
    system_prompt = "Você é um assistente de jogo interativo. Responda em português do Brasil de forma envolvente e imersiva."
    system_prompt += (
        "\n\nINSTRUÇÕES DO JOGO (SEMPRE ENVIAR):"
        "\n- Os elementos do Jogo iniciados com o termo História, podem ser acessados apenas quando jogador pedir mais informações sobre a história de um reino específico."
        "\n- Inicie pela Cena intitulada Introdução. Nela será solicitado ao jogador que forneça nome, idade e quantidade de jogadores."
        "\n- Nesse ponto, considere diversas formas de receber esses dados, mas tenha como padrão o seguinte exemplo:"
        "\n- Jogador 1: Gabriel, 11 anos"
        "\n- Jogador 2: Sofia, 9 anos"
        "\n- O exemplo acima indica que temos 2 jogadores na sala sendo que o primeiro é o Gabriel de 11 anos e o segundo é a Sofia de 9 anos."
        "\n- Essa informação deve ser mantida durante todo o jogo, portanto a mantenha para interação com os jogadores da sala de jogo atual."
        "\n- A LLM sempre recebe esses dados como contexto antes de trazer a próxima cena do jogo. Dessa forma, ela mantém um diálogo educado sempre chamando o jogador pelo nome e com o tom de de comunicação adequado à idade do jogador ou jogadores. Se tiver mais de um jogador, sempre considere a idade do jogador mais novo para o tom da conversação."
        "\n- Uma vez tendo recebido os dados de nome do jogador, idade e quantidade de jogadores, sempre os mantenha no contexto enviado para a LLM e de modo a apoiar a seleção das próximas cenas, que também dependerão de respostas dos jogadores. Essas respostas devem ser registradas para manter o fluxo e saber para qual ponto retornar no fluxo do jogo e portanto, também devem sempre ser enviadas como contexto para LLM."
        "\n- Use o arquivo Introdução até que jogador selecione um dos elementos (Ar, Fogo, Água ou Terra)."
        "\n- Uma vez que nome, idade e quantidade de jogadores foi informado e um dos elementos selecionado (Ar, Fogo, Água ou Terra), passe para a sequência do arquivo de cena de acordo com o elemento selecionado."
        "\n- O elemento selecionado pelo jogador deve indicar qual Portal será aberto, em outras palavras se jogador selecionar elemento Água, o arquivo a ser aberto será Cena 0A - Portal da Água, se selecionar elemento Terra, o arquivo a ser aberto será Cena 0A - Portal da Terra, e assim por diante com todos os demais. Nesse caso, apenas uma das Cenas 0A será apresentada de acordo com a seleção do elemento ar, fogo, água ou terra."
        "\n- A partir disso, a interação segue o arquivo Cena 0A com o portal do elemento selecionado pelo jogador. Ao finalizar todo o fluxo deste arquivo a partir da conversa com o jogador e salvando suas respostas como contexto para a próxima interação com o jogador, siga para o arquivo cujo título inicia com Cena 0B."
        "\n- Após apresentar todo o conteúdo do arquivo cujo título inicia com Cena 0B siga para o arquivo cujo título inicia com Cena 01 - Temperança."
        "\n- A partir do arquivo de Cena 01-Temperança, siga em ordem crescente de cenas, ou seja, Cena 02 - Temperança, Cena 03 - Temperança, etc."
        "\n- Todas as cenas do jogo são selecionadas de acordo com a resposta do jogador. Uma vez tendo entrado num arquivo de cena só mude para a próxima cena quando passar por todo o fluxo da cena."
    )
    
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
        youngest_age = _get_youngest_age(profile)
        if youngest_age:
            system_prompt += f"\n- Idade de referência para o tom: {youngest_age} anos (mais novo)."
        if profile.get("age") or profile.get("players"):
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

    recent_interactions = _get_recent_interactions(limit=8)
    if recent_interactions:
        system_prompt += "\n\nHISTÓRICO RECENTE DA SESSÃO (MANTER CONTEXTO):"
        for interaction in recent_interactions:
            if interaction.player_input:
                system_prompt += f"\n- Jogador: {interaction.player_input}"
            if interaction.ai_response:
                system_prompt += f"\n- Narrador: {interaction.ai_response}"

    confidence = 0.4
    if profile.get("count") or profile.get("players") or (profile.get("name") and profile.get("age")):
        confidence += 0.2
    if element_selected:
        confidence += 0.2
    if next_segment:
        confidence += 0.1
    if scene_changed:
        confidence += 0.1
    confidence = min(confidence, 0.99)

    if current_scenario:
        system_prompt += "\n\nCICLO COGNITIVO DO NPC:"
        system_prompt += "\nPercepção:"
        system_prompt += f"\n- Input do jogador: {interaction_data.player_input}"
        system_prompt += f"\n- Ambiente: cena atual = {current_scenario.name}"
        system_prompt += f"\n- Próximo ponto de início: {next_segment or 'N/A'}"
        system_prompt += f"\n- Próximo ponto de fim: {next_segment or 'N/A'}"
        system_prompt += "\nMemória:"
        system_prompt += f"\n- Confiança: {confidence:.2f}"
        system_prompt += "\nDecisão:"
        system_prompt += f"\n- Cena atual: {current_scenario.name}"
        if scene_changed:
            system_prompt += f"\n- Transição aplicada: {decision_reason}"
        if element_selected:
            system_prompt += f"\n- Elemento identificado: {element_selected}"
        system_prompt += "\nAção:"
        system_prompt += "\n- Apresente apenas o trecho da cena correspondente ao próximo ponto de início/fim."
        system_prompt += "\nFeedback:"
        system_prompt += "\n- Responda ao jogador e finalize a interação para reiniciar o ciclo."

    if current_scenario and next_segment:
        system_prompt += f"\n\nTRECHO DA CENA ATUAL (APRESENTAR INTEGRALMENTE):\n{next_segment}"
    
    user_prompt = interaction_data.player_input

    if _is_dice_roll_request(interaction_data.player_input or ""):
        dice_elements = [
            {"key": "agua", "name": "Água", "icon": "💧"},
            {"key": "ar", "name": "Ar", "icon": "🌬️"},
            {"key": "terra", "name": "Terra", "icon": "🌱"},
            {"key": "fogo", "name": "Fogo", "icon": "🔥"},
            {"key": "sombra", "name": "Sombra", "icon": "🌑"},
            {"key": "luz", "name": "Luz", "icon": "✨"},
        ]
        selected = random.choice(dice_elements)
        rules_content = _get_rules_file_content()
        shadow_text = _sanitize_rules_text(_extract_rules_section(rules_content, 5))
        light_text = _sanitize_rules_text(_extract_rules_section(rules_content, 6))
        board = _get_or_create_board()
        turn_info = _update_board_with_element(board, selected["key"], profile)
        if selected["key"] == "sombra":
            outcome = shadow_text or "Uma sombra se move e aguarda sua resposta."
        elif selected["key"] == "luz":
            outcome = light_text or "Uma luz clara se revela e guia sua próxima escolha."
        else:
            outcome = f"O elemento {selected['name']} foi adicionado ao seu tabuleiro pessoal."
        response_text = (
            f"Resultado da rolagem: {selected['icon']} {selected['name']}\n"
            f"{outcome}"
        )
        if turn_info.get("order") and len(turn_info["order"]) > 1:
            order_text = ", ".join([f"{item['slot']}. {item['name']}" for item in turn_info["order"]])
            response_text = (
                f"Ordem de rolagem: {order_text}\n"
                f"Jogador a rolar agora: {turn_info['current']['name']}\n\n"
                f"{response_text}\n"
                f"Próximo jogador: {turn_info['next']['name']}"
            )
        response_text = f"{response_text}\n\n{_format_board_status(session.id)}"
        if next_segment:
            response_text = f"{response_text}\n\n{next_segment}"
        audio_url = None
        if interaction_data.include_audio_response:
            audio_service = AudioService()
            try:
                audio_path = await audio_service.text_to_speech(response_text)
                audio_url = f"/api/audio/{Path(audio_path).name}"
            except Exception:
                pass
        interaction = SessionInteraction(
            session_id=session.id,
            player_input=interaction_data.player_input,
            player_input_type=interaction_data.player_input_type,
            ai_response=response_text,
            ai_response_audio_url=audio_url,
            llm_provider="dice",
            llm_model="local",
            tokens_used=0,
            cost=0.0,
            response_time=0.0,
        )
        session.last_activity = datetime.utcnow()
        db.add(interaction)
        db.add(session)
        db.commit()
        db.refresh(interaction)
        return interaction
    
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

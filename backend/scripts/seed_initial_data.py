#!/usr/bin/env python3
"""
Seed inicial do projeto:
- cria admin (via env)
- cria jogo (via env)
- importa regras e cenas a partir de arquivos do projeto

Variáveis de ambiente esperadas:
ADMIN_EMAIL (obrigatório)
ADMIN_PASSWORD (obrigatório)
ADMIN_USERNAME (opcional; default: parte do email)

GAME_TITLE (default: "Nine")
GAME_DESCRIPTION (opcional)
GAME_COVER_FILENAME (opcional; arquivo dentro de game_covers)

SEED_RULES_DIR (opcional; default: RULE_FILES_DIR)
SEED_SCENARIOS_DIR (opcional; default: SCENARIO_FILES_DIR)
SEED_SCENARIO_IMAGES_DIR (opcional; default: SCENARIO_IMAGES_DIR)
SEED_SCENARIO_VIDEOS_DIR (opcional; default: SCENARIO_VIDEOS_DIR)
"""
import asyncio
import os
import re
import sys
import unicodedata
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Adicionar o diretório raiz do backend ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from auth import get_password_hash
from database import SessionLocal, engine, Base
from models import User, UserRole, Game, GameRule, Scenario
from services.file_service import FileService

load_dotenv()


def normalize_text(value: str) -> str:
    value = value.lower()
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"[^a-z0-9]+", "", value)
    return value.strip()


def clean_stem(stem: str) -> str:
    stem = re.sub(r"^(scenario|rule|game_cover)_\d{8}_\d{6}_", "", stem, flags=re.IGNORECASE)
    stem = re.sub(r"^(scenario|rule|game_cover)_\d+_", "", stem, flags=re.IGNORECASE)
    stem = re.sub(r"^\~\$", "", stem)
    stem = stem.replace("_", " ").strip()
    stem = re.sub(r"\s*-\s*\d+$", "", stem)
    stem = re.sub(r"\s+\d+$", "", stem)
    return stem.strip()


def clean_image_stem(stem: str) -> str:
    stem = clean_stem(stem)
    stem = re.sub(r"(?i)\s*-\s*imagem.*$", "", stem)
    stem = re.sub(r"(?i)\s*imagem.*$", "", stem)
    return stem.strip()


def find_best_match(name: str, candidates: dict) -> Optional[Path]:
    normalized = normalize_text(name)
    best = None
    best_len = 0
    for candidate_name, path in candidates.items():
        if normalized in candidate_name or candidate_name in normalized:
            score = min(len(normalized), len(candidate_name))
            if score > best_len:
                best = path
                best_len = score
    return best


def get_cover_url(file_service: FileService) -> Optional[str]:
    filename = os.getenv("GAME_COVER_FILENAME")
    if filename:
        file_path = file_service.game_covers_dir / filename
        if file_path.exists():
            return file_service.get_file_url(str(file_path), file_type="game_cover")

    covers = sorted(file_service.game_covers_dir.glob("*"))
    if not covers:
        return None
    return file_service.get_file_url(str(covers[-1]), file_type="game_cover")


async def seed_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    file_service = FileService()

    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    admin_username = os.getenv("ADMIN_USERNAME")

    if not admin_email:
        raise RuntimeError("ADMIN_EMAIL é obrigatório")
    if not admin_password:
        raise RuntimeError("ADMIN_PASSWORD é obrigatório")
    if not admin_username:
        admin_username = admin_email.split("@")[0]

    # Criar/ajustar admin
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        admin = User(
            username=admin_username,
            email=admin_email,
            hashed_password=get_password_hash(admin_password),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"Admin criado: {admin_email}")
    else:
        if admin.role != UserRole.ADMIN:
            admin.role = UserRole.ADMIN
            db.commit()
        print(f"Admin existente: {admin_email}")

    # Criar/ajustar jogo
    game_title = os.getenv("GAME_TITLE", "Nine")
    game_description = os.getenv("GAME_DESCRIPTION")
    cover_url = get_cover_url(file_service)

    game = db.query(Game).filter(Game.title == game_title).first()
    if not game:
        game = Game(
            title=game_title,
            description=game_description,
            cover_image_url=cover_url,
            is_active=True
        )
        db.add(game)
        db.commit()
        db.refresh(game)
        print(f"Jogo criado: {game_title}")
    else:
        if not game.cover_image_url and cover_url:
            game.cover_image_url = cover_url
            db.commit()
        print(f"Jogo existente: {game_title}")

    rules_dir = Path(os.getenv("SEED_RULES_DIR", str(file_service.rule_files_dir)))
    scenarios_dir = Path(os.getenv("SEED_SCENARIOS_DIR", str(file_service.upload_dir)))
    images_dir = Path(os.getenv("SEED_SCENARIO_IMAGES_DIR", str(file_service.scenario_images_dir)))
    videos_dir = Path(os.getenv("SEED_SCENARIO_VIDEOS_DIR", str(file_service.scenario_videos_dir)))

    image_candidates = {}
    for img in images_dir.glob("*"):
        if img.name.startswith("~$"):
            continue
        if img.suffix.lower() not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
            continue
        key = normalize_text(clean_image_stem(img.stem))
        if key:
            image_candidates[key] = img

    video_candidates = {}
    for vid in videos_dir.glob("*"):
        if vid.name.startswith("~$"):
            continue
        if vid.suffix.lower() not in [".mp4", ".webm", ".ogg"]:
            continue
        key = normalize_text(clean_stem(vid.stem))
        if key:
            video_candidates[key] = vid

    # Importar regras
    allowed_rule_exts = {".pdf", ".docx", ".doc", ".txt"}
    for file_path in sorted(rules_dir.glob("*")):
        if file_path.name.startswith("~$"):
            continue
        if file_path.suffix.lower() not in allowed_rule_exts:
            continue
        title = clean_stem(file_path.stem)
        existing = db.query(GameRule).filter(
            GameRule.game_id == game.id,
            GameRule.title == title
        ).first()
        if existing:
            continue

        file_content = await file_service.extract_text_from_file(str(file_path), file_path.suffix.lower())
        content = {
            "file_url": file_service.get_file_url(str(file_path), file_type="rule_file"),
            "file_name": file_path.name,
            "file_content": file_content
        }
        rule = GameRule(
            game_id=game.id,
            title=title,
            description="Importado do arquivo",
            rule_type="file",
            content=content,
            created_by=admin.id
        )
        db.add(rule)

    # Importar cenários
    allowed_scenario_exts = {".pdf", ".docx", ".doc", ".txt"}
    scenario_files = [
        f for f in sorted(scenarios_dir.glob("*"))
        if f.name.startswith("scenario_")
        and not f.name.startswith("~$")
        and f.suffix.lower() in allowed_scenario_exts
    ]

    for idx, file_path in enumerate(scenario_files):
        name = clean_stem(file_path.stem)
        existing = db.query(Scenario).filter(
            Scenario.game_id == game.id,
            Scenario.name == name
        ).first()
        if existing:
            continue

        file_content = await file_service.extract_text_from_file(str(file_path), file_path.suffix.lower())
        image_match = find_best_match(name, image_candidates)
        video_match = find_best_match(name, video_candidates)

        image_url = file_service.get_file_url(str(image_match), file_type="scenario_image") if image_match else None
        video_url = file_service.get_file_url(str(video_match), file_type="scenario_video") if video_match else None

        phase = 1
        order = idx
        if re.search(r"(?i)introdu", name):
            phase = 0
            order = 0

        order_match = re.search(r"(?i)cena\s*0?(\d+)", name)
        if order_match:
            order = int(order_match.group(1))

        scenario = Scenario(
            game_id=game.id,
            name=name,
            description=None,
            image_url=image_url,
            video_url=video_url,
            file_url=file_service.get_file_url(str(file_path)),
            file_content=file_content,
            phase=phase,
            order=order,
            is_active=True
        )
        db.add(scenario)

    db.commit()
    db.close()
    print("Seed concluído com sucesso.")


if __name__ == "__main__":
    asyncio.run(seed_data())

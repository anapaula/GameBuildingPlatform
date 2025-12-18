from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pathlib import Path
from database import get_db
from models import Game, User
from schemas import GameCreate, GameResponse
from auth import get_current_admin_user

router = APIRouter()

@router.post("/", response_model=GameResponse, status_code=201)
async def create_game(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    cover_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    cover_image_url = None
    
    # Processar imagem de capa se fornecida
    if cover_image and cover_image.filename:
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        file_ext = Path(cover_image.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Formato de imagem não suportado. Use: {', '.join(allowed_extensions)}")
        
        try:
            import os
            import aiofiles
            from pathlib import Path
            
            upload_dir = Path(os.getenv("GAME_COVERS_DIR", "./game_covers"))
            upload_dir.mkdir(parents=True, exist_ok=True)
            
            file_data = await cover_image.read()
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"game_{timestamp}_{cover_image.filename}"
            file_path = upload_dir / filename
            
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(file_data)
            
            cover_image_url = f"/api/admin/games/covers/{filename}"
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

@router.get("/", response_model=List[GameResponse])
async def list_games(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    games = db.query(Game).order_by(Game.created_at.desc()).offset(skip).limit(limit).all()
    return games

@router.get("/{game_id}", response_model=GameResponse)
async def get_game(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    return game

@router.put("/{game_id}", response_model=GameResponse)
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
    
    # Processar nova imagem se fornecida
    if cover_image and cover_image.filename:
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        file_ext = Path(cover_image.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Formato de imagem não suportado. Use: {', '.join(allowed_extensions)}")
        
        try:
            import os
            import aiofiles
            from pathlib import Path
            
            upload_dir = Path(os.getenv("GAME_COVERS_DIR", "./game_covers"))
            upload_dir.mkdir(parents=True, exist_ok=True)
            
            file_data = await cover_image.read()
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"game_{timestamp}_{cover_image.filename}"
            file_path = upload_dir / filename
            
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(file_data)
            
            game.cover_image_url = f"/api/admin/games/covers/{filename}"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao processar imagem: {str(e)}")
    
    game.title = title
    game.description = description
    
    db.commit()
    db.refresh(game)
    return game

@router.delete("/{game_id}")
async def delete_game(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    
    db.delete(game)
    db.commit()
    return {"message": "Jogo deletado com sucesso"}

@router.get("/covers/{filename}")
async def get_game_cover(
    filename: str,
    current_user: User = Depends(get_current_admin_user)
):
    """Serve imagens de capa dos jogos"""
    from fastapi.responses import FileResponse
    import os
    from pathlib import Path
    
    upload_dir = Path(os.getenv("GAME_COVERS_DIR", "./game_covers"))
    file_path = upload_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Imagem não encontrada")
    
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
    
    return FileResponse(str(file_path), media_type=media_type)


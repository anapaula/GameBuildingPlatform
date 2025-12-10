from fastapi import APIRouter, File, UploadFile, HTTPException
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

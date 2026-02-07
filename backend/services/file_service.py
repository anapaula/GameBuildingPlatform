import os
import io
import mimetypes
from pathlib import Path
from typing import Optional

import aiofiles
import PyPDF2
from docx import Document
from supabase import create_client

class FileService:
    def __init__(self):
        self.upload_dir = Path(os.getenv("SCENARIO_FILES_DIR", "./scenario_files"))
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        # Diretório para capas de jogos
        self.game_covers_dir = Path(os.getenv("GAME_COVERS_DIR", "./game_covers"))
        self.game_covers_dir.mkdir(parents=True, exist_ok=True)
        # Diretório para imagens de cenários
        self.scenario_images_dir = Path(os.getenv("SCENARIO_IMAGES_DIR", "./scenario_images"))
        self.scenario_images_dir.mkdir(parents=True, exist_ok=True)
        # Diretório para vídeos de cenários
        self.scenario_videos_dir = Path(os.getenv("SCENARIO_VIDEOS_DIR", "./scenario_videos"))
        self.scenario_videos_dir.mkdir(parents=True, exist_ok=True)
        # Diretório para arquivos de elementos do jogo (regras/mecânicas/etc.)
        self.rule_files_dir = Path(os.getenv("RULE_FILES_DIR", "./rule_files"))
        self.rule_files_dir.mkdir(parents=True, exist_ok=True)

        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.supabase_bucket = os.getenv("SUPABASE_STORAGE_BUCKET")
        self.supabase_client = None
        if self.supabase_url and self.supabase_key and self.supabase_bucket:
            self.supabase_client = create_client(self.supabase_url, self.supabase_key)
    
    async def save_uploaded_file(self, file_data: bytes, filename: str, file_type: str = "scenario") -> str:
        """Salva arquivo enviado e retorna o caminho
        file_type: 'scenario', 'game_cover', 'scenario_image', 'scenario_video' ou 'rule_file'
        """
        if file_type == "game_cover":
            file_path = self.game_covers_dir / filename
        elif file_type == "scenario_image":
            file_path = self.scenario_images_dir / filename
        elif file_type == "scenario_video":
            file_path = self.scenario_videos_dir / filename
        elif file_type == "rule_file":
            file_path = self.rule_files_dir / filename
        else:
            file_path = self.upload_dir / filename
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_data)
        return str(file_path)

    def _get_storage_path(self, file_type: str, filename: str) -> str:
        folder_map = {
            "game_cover": "game_covers",
            "scenario_image": "scenario_images",
            "scenario_video": "scenario_videos",
            "rule_file": "rule_files",
            "scenario": "scenario_files",
        }
        folder = folder_map.get(file_type, "scenario_files")
        return f"{folder}/{filename}"

    def _upload_to_supabase(self, file_path: str, file_type: str) -> Optional[str]:
        if not self.supabase_client or not self.supabase_bucket:
            return None
        if not file_path or not Path(file_path).exists():
            return None

        filename = Path(file_path).name
        storage_path = self._get_storage_path(file_type, filename)
        content_type, _ = mimetypes.guess_type(filename)
        with open(file_path, "rb") as f:
            self.supabase_client.storage.from_(self.supabase_bucket).upload(
                storage_path,
                f,
                file_options={
                    "content-type": content_type or "application/octet-stream",
                    "upsert": True,
                },
            )
        return self.supabase_client.storage.from_(self.supabase_bucket).get_public_url(storage_path)
    
    async def extract_text_from_file(self, file_path: str, file_extension: str) -> str:
        """Extrai texto de arquivos PDF, DOCX ou TXT"""
        try:
            if file_extension.lower() == '.pdf':
                return await self._extract_from_pdf(file_path)
            elif file_extension.lower() in ['.docx', '.doc']:
                # python-docx não é async, então chamamos diretamente
                return self._extract_from_docx(file_path)
            elif file_extension.lower() == '.txt':
                return await self._extract_from_txt(file_path)
            else:
                raise ValueError(f"Formato de arquivo não suportado: {file_extension}")
        except Exception as e:
            raise Exception(f"Erro ao extrair texto do arquivo: {str(e)}")
    
    async def _extract_from_pdf(self, file_path: str) -> str:
        """Extrai texto de arquivo PDF"""
        text = ""
        async with aiofiles.open(file_path, 'rb') as f:
            file_data = await f.read()
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_data))
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text.strip()
    
    def _extract_from_docx(self, file_path: str) -> str:
        """Extrai texto de arquivo DOCX"""
        doc = Document(file_path)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text.strip()
    
    async def _extract_from_txt(self, file_path: str) -> str:
        """Extrai texto de arquivo TXT"""
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            text = await f.read()
        return text.strip()
    
    def get_file_url(self, file_path: str, file_type: str = "scenario") -> str:
        """Retorna URL relativa para acessar o arquivo
        file_type: 'scenario', 'game_cover', 'scenario_image', 'scenario_video' ou 'rule_file'
        """
        if file_path and (file_path.startswith("http://") or file_path.startswith("https://")):
            return file_path

        supabase_url = self._upload_to_supabase(file_path, file_type)
        if supabase_url:
            return supabase_url

        filename = Path(file_path).name
        if file_type == "game_cover":
            return f"/api/admin/games/covers/{filename}"
        if file_type == "scenario_image":
            return f"/api/admin/scenarios/images/{filename}"
        if file_type == "scenario_video":
            return f"/api/admin/scenarios/videos/{filename}"
        if file_type == "rule_file":
            return f"/api/admin/rules/files/{filename}"
        return f"/api/admin/scenarios/files/{filename}"


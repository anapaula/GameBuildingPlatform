import os
import aiofiles
from pathlib import Path
from typing import Optional
import PyPDF2
from docx import Document
import io

class FileService:
    def __init__(self):
        self.upload_dir = Path(os.getenv("SCENARIO_FILES_DIR", "./scenario_files"))
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        # Diretório para capas de jogos
        self.game_covers_dir = Path(os.getenv("GAME_COVERS_DIR", "./game_covers"))
        self.game_covers_dir.mkdir(parents=True, exist_ok=True)
    
    async def save_uploaded_file(self, file_data: bytes, filename: str, file_type: str = "scenario") -> str:
        """Salva arquivo enviado e retorna o caminho
        file_type: 'scenario' ou 'game_cover'
        """
        if file_type == "game_cover":
            file_path = self.game_covers_dir / filename
        else:
            file_path = self.upload_dir / filename
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_data)
        return str(file_path)
    
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
        file_type: 'scenario' ou 'game_cover'
        """
        filename = Path(file_path).name
        if file_type == "game_cover":
            return f"/api/admin/games/covers/{filename}"
        return f"/api/admin/scenarios/files/{filename}"


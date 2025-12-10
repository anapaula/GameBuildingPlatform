from typing import Optional
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

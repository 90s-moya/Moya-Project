# app/utils/stt.py
import whisper
import tempfile
import os

# Whisper 모델 초기화 (서버 시작 시 1회 로드)
model = whisper.load_model("medium")

def save_uploadfile_to_temp(upload_file) -> str:
    """
    FastAPI UploadFile을 임시 wav 파일로 저장 후 경로 반환
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
        contents = upload_file.file.read()
        tmp_file.write(contents)
        return tmp_file.name

def transcribe_audio_from_path(file_path: str) -> str:
    """
    Whisper STT: 파일 경로 기반 추론
    """
    result = model.transcribe(file_path)
    return result["text"]

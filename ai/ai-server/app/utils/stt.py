# app/utils/stt.py
import whisper
import tempfile
import os

# whisper 모델 초기화 (최초 1회 로딩)
model = whisper.load_model("medium")

def transcribe_audio(file_obj) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
        contents = file_obj.file.read()  # 한 번에 전체 읽기
        tmp_file.write(contents)         # 전체 쓰기
        tmp_file_path = tmp_file.name

    try:
        result = model.transcribe(tmp_file_path)
        return result["text"]
    finally:
        os.remove(tmp_file_path)

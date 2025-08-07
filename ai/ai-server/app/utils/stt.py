# # app/utils/stt.py
# import whisper
# import tempfile
# import os

# # Whisper 모델 초기화 (서버 시작 시 1회 로드)
# model = whisper.load_model("medium")

# def save_uploadfile_to_temp(upload_file) -> str:
#     """
#     FastAPI UploadFile을 임시 wav 파일로 저장 후 경로 반환
#     """
#     with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
#         contents = upload_file.file.read()
#         tmp_file.write(contents)
#         return tmp_file.name

# def transcribe_audio_from_path(file_path: str) -> str:
#     """
#     Whisper STT: 파일 경로 기반 추론
#     """
#     result = model.transcribe(file_path)
#     return result["text"]

import whisper
import tempfile
import os
import traceback

print("[Whisper] 모델 로딩 시작: base")
model = whisper.load_model("base")
print("[Whisper] 모델 로딩 완료")

def save_uploadfile_to_temp(upload_file) -> str:
    """
    FastAPI UploadFile을 임시 wav 파일로 저장 후 경로 반환
    """
    try:
        print("[Whisper] UploadFile → temp 저장 시작")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            contents = upload_file.file.read()
            tmp_file.write(contents)
            print(f"[Whisper] UploadFile 저장 완료: {tmp_file.name}")
            return tmp_file.name
    except Exception as e:
        print(f"[Whisper] 파일 저장 오류: {e}")
        traceback.print_exc()
        raise

def transcribe_audio_from_path(file_path: str) -> str:
    """
    Whisper STT: 파일 경로 기반 추론
    """
    try:
        print(f"[Whisper] STT 추론 시작: {file_path}")
        result = model.transcribe(file_path)
        print("[Whisper] STT 추론 완료")
        return result["text"]
    except Exception as e:
        print(f"[Whisper] STT 추론 중 오류: {e}")
        traceback.print_exc()
        raise

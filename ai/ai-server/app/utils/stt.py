import tempfile
import os
import httpx
from decouple import config
from fastapi import UploadFile
import asyncio

GMS_API_KEY = config('GMS_API_KEY')
GMS_API_URL = config('GMS_BASE_URL')


async def transcribe_audio_async(upload_file: UploadFile) -> str:
    """
    Whisper STT: GMS API 호출 기반 비동기 추론
    """
    # 파일 내용 읽기
    contents = await upload_file.read()

    # 임시 파일로 저장 (디버깅 또는 오류 대응용, 원치 않으면 제거 가능)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
        tmp_file.write(contents)
        temp_path = tmp_file.name

    print(f"[Whisper] UploadFile 저장 완료: {temp_path}")

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            files = {
                "file": (upload_file.filename, contents, upload_file.content_type or "audio/wav"),
                "model": (None, "whisper-1")
            }
            response = await client.post(
                f"{GMS_API_URL.rstrip('/')}/audio/transcriptions",
                headers={
                    "Authorization": f"Bearer {GMS_API_KEY}",
                },
                files=files
            )
            response.raise_for_status()
            return response.json()["text"]
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def save_uploadfile_to_temp(upload_file: UploadFile) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(upload_file.file.read())
        return tmp.name
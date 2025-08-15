# utils/stt.py
import tempfile
import os
import re
import httpx
from decouple import config
from fastapi import UploadFile
import numpy as np
import webrtcvad
import soundfile as sf
from dataclasses import dataclass

GMS_API_KEY = config('GMS_API_KEY')
GMS_API_URL = config('GMS_BASE_URL')

# VAD 기본 설정
FRAME_MS = 30      # 10/20/30ms
VAD_AGGR = 2       # 0(느슨)~3(공격적)

# -------------------------------
# 빠른 경로: 최소 STT (bytes 기반)
# -------------------------------
async def transcribe_audio_bytes(contents: bytes, filename: str = "audio.wav", content_type: str = "audio/wav") -> str:
    import asyncio
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                files = {
                    "file": (filename, contents, content_type),
                    "model": (None, "whisper-1")
                }
                response = await client.post(
                    f"{GMS_API_URL.rstrip('/')}/audio/transcriptions",
                    headers={"Authorization": f"Bearer {GMS_API_KEY}"},
                    files=files
                )
                response.raise_for_status()
                return response.json()["text"]
        except httpx.HTTPStatusError as e:
            print(f"[STT] API 호출 실패 (시도 {attempt + 1}/{max_retries}): {e}")
            if attempt == max_retries - 1:
                # 마지막 시도에서 실패하면 기본값 반환
                print("[STT] 모든 재시도 실패, 기본 응답 반환")
                return "[음성 인식 실패]"
            # 재시도 전 대기
            await asyncio.sleep(1)
        except Exception as e:
            print(f"[STT] 예상치 못한 오류 (시도 {attempt + 1}/{max_retries}): {e}")
            if attempt == max_retries - 1:
                return "[음성 인식 실패]"
            await asyncio.sleep(1)

# -------------------------------
# (레거시) UploadFile 기반 함수들 — 필요 시 유지
# -------------------------------
async def transcribe_audio_async(upload_file: UploadFile) -> str:
    """
    Whisper STT: GMS API 호출 기반 비동기 추론
    """
    contents = await upload_file.read()

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

# 발화 속도 분석 코드
@dataclass
class _Frame:
    bytes: bytes
    timestamp: float
    duration: float

def _frame_generator(frame_ms: int, pcm: bytes, sample_rate: int):
    bytes_per_frame = int(sample_rate * frame_ms / 1000) * 2  # 16-bit mono => 2 bytes/sample
    ts = 0.0
    dur = frame_ms / 1000.0
    for offset in range(0, len(pcm) - bytes_per_frame + 1, bytes_per_frame):
        yield _Frame(pcm[offset:offset + bytes_per_frame], ts, dur)
        ts += dur

def _collect_vad_segments(pcm: bytes, sample_rate: int, frame_ms: int, aggressiveness: int):
    vad = webrtcvad.Vad(aggressiveness)
    segments = []
    cur_start = None
    last_end = None
    for fr in _frame_generator(frame_ms, pcm, sample_rate):
        voiced = vad.is_speech(fr.bytes, sample_rate)
        if voiced:
            if cur_start is None:
                cur_start = fr.timestamp
            last_end = fr.timestamp + fr.duration
        else:
            if cur_start is not None and last_end is not None:
                segments.append((cur_start, last_end))
                cur_start, last_end = None, None
    if cur_start is not None and last_end is not None:
        segments.append((cur_start, last_end))
    return segments

def _merge_intervals(intervals, eps=1e-6):
    if not intervals:
        return []
    intervals = sorted(intervals)
    merged = [intervals[0]]
    for s, e in intervals[1:]:
        ms, me = merged[-1]
        if s <= me + eps:  # 겹치거나 거의 붙어있으면 병합
            merged[-1] = (ms, max(me, e))
        else:
            merged.append((s, e))
    return merged

def _intersect_intervals(a_list, b_list):
    a_list = _merge_intervals(a_list)
    b_list = _merge_intervals(b_list)
    i = j = 0
    out = []
    while i < len(a_list) and j < len(b_list):
        a_s, a_e = a_list[i]
        b_s, b_e = b_list[j]
        s = max(a_s, b_s)
        e = min(a_e, b_e)
        if e > s:
            out.append((s, e))
        if a_e < b_e:
            i += 1
        else:
            j += 1
    return out

def _classify_speed(syll_art, speaking_ratio, avg_pause):
    # 판정 기준(필요시 조정)
      # 판정 이유 넣어줄 리스트
    reason_parts = []
    # 기본 등급(0~4)
    if syll_art < 3.6:
        level = 0
    elif syll_art < 4.0:
        level = 1
    elif syll_art < 4.6:
        level = 2
    elif syll_art < 5.2:
        level = 3
    else:
        level = 4

    reason_parts.append(f"{syll_art:.2f}")
    
    labels_ko = ["SLOW", "SLIGHTLY SLOW", "NORMAL", "SLIGHTLY FAST", "FAST"]
    return labels_ko[level], "/".join(reason_parts)

async def transcribe_and_analyze(contents: bytes) -> dict:
    """
    (레거시) 업로드된 오디오를 Whisper API(segments 포함)로 STT 후,
    webrtcvad와 교집합을 계산하여 발화/속도 지표를 반환.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
        tmp_file.write(contents)
        temp_path = tmp_file.name

    try:
        # 1) Whisper API 호출 (segments를 받기 위해 verbose_json 요청)
        async with httpx.AsyncClient(timeout=120) as client:
            files = {
                "file": ("audio.wav", contents, "audio/wav"),
                "model": (None, "whisper-1"),
                "response_format": (None, "verbose_json"),
                "temperature": (None, "0"),
            }
            resp = await client.post(
                f"{GMS_API_URL.rstrip('/')}/audio/transcriptions",
                headers={"Authorization": f"Bearer {GMS_API_KEY}"},
                files=files
            )
            resp.raise_for_status()
            whisper_data = resp.json()

        text = whisper_data.get("text", "").strip()

        w_segments = []
        for seg in whisper_data.get("segments", []) or []:
            try:
                s = float(seg.get("start", 0))
                e = float(seg.get("end", 0))
                if e > s:
                    w_segments.append((s, e))
            except (TypeError, ValueError):
                continue

        # 2) 오디오 로딩 (float32, mono)
        audio_f32, sr = sf.read(temp_path, dtype="float32", always_2d=True)
        if audio_f32.shape[1] > 1:
            audio_f32 = audio_f32.mean(axis=1)  # 스테레오 → 모노
        else:
            audio_f32 = np.squeeze(audio_f32)
        total_time = len(audio_f32) / sr if sr > 0 else 0.0

        # 3) PCM(int16) 변환 for VAD
        audio_i16 = np.clip(audio_f32 * 32767.0, -32768, 32767).astype(np.int16)
        pcm_bytes = audio_i16.tobytes()

        # 4) VAD 세그먼트
        v_segments = _collect_vad_segments(pcm_bytes, sr, FRAME_MS, VAD_AGGR)

        # 5) Whisper × VAD 교집합
        iv_segments = _intersect_intervals(w_segments, v_segments)
        iv_segments = _merge_intervals(iv_segments)

        speech_time_iv = sum(e - s for (s, e) in iv_segments)

        # 6) pause 통계
        pauses = []
        for i in range(1, len(iv_segments)):
            prev_end = iv_segments[i - 1][1]
            cur_start = iv_segments[i][0]
            if cur_start > prev_end:
                pauses.append(cur_start - prev_end)
        
        avg_pause = (sum(pauses) / len(pauses)) if pauses else 0.0
        
        # 텍스트 기반 카운트
        syllable_count = len(re.findall(r"[가-힣]", text))

        # 속도
        syll_art = (syllable_count / speech_time_iv) if speech_time_iv > 0 else 0.0
        speaking_ratio = (speech_time_iv / total_time) if total_time > 0 else 0.0
        
        label_ko, reason = _classify_speed(syll_art, speaking_ratio, avg_pause)

        return {
           "label": label_ko,
            "reason": reason        
        }

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
# app/services/gaze_service.py
from __future__ import annotations

import sys
import io
import os
import tempfile
import importlib
from pathlib import Path
from functools import lru_cache
from typing import Callable, Optional, Any, Dict


# === Gaze_TR_pro 경로 등록 ===
# gaze_service.py는 ai-server/app/services/ 에 있고
# Gaze_TR_pro는 ai-server/Gaze_TR_pro/ 에 있음
# 따라서 parents[2]로 ai-server 디렉토리로 이동한 후 Gaze_TR_pro 찾기
AI_SERVER_ROOT = Path(__file__).resolve().parents[2]  # ai-server 디렉토리
GAZE_DIR = AI_SERVER_ROOT / "Gaze_TR_pro"
sys.path.append(str(GAZE_DIR))

# 이 중에서 먼저 발견되는 모듈/함수를 엔트리로 사용
ENTRY_MODULES = [
    "gaze_wrapper",      # 외부 서비스용 래퍼 모듈 (우선)
    "gaze_tracking",     # 시선 추적 메인 모듈
    "gaze_calibration",  # 캘리브레이션 모듈
    "run_simple_gui",    # 실행기
]
ENTRY_FUNCS = [
    "infer_gaze",        # gaze_wrapper.infer_gaze (메인 함수)
    "run_gaze_once",     # gaze_wrapper.run_gaze_once
    "process_video_file", # gaze_wrapper.process_video_file
    "main",
    "run",
]


def _find_entrypoint() -> Callable[..., Any]:
    """Gaze_TR_pro 내부에서 실행 함수(엔트리포인트) 자동 탐색."""
    last_err = None
    for modname in ENTRY_MODULES:
        try:
            mod = importlib.import_module(modname)
        except Exception as e:
            last_err = e
            continue

        # 1) 모듈에 위 후보 함수명이 있으면 그걸 사용
        for fname in ENTRY_FUNCS:
            fn = getattr(mod, fname, None)
            if callable(fn):
                return fn

        # 2) 모듈에 CLI 스타일 main이 있고, input_path/비디오를 받는 형태면 그걸로 시도
        if hasattr(mod, "__call__") and callable(mod):
            return mod  # type: ignore

    raise ImportError(
        f"gaze entrypoint not found. tried modules={ENTRY_MODULES}, funcs={ENTRY_FUNCS}, last_err={last_err}"
    )


@lru_cache(maxsize=1)
def get_gaze_runtime(calib_path: Optional[str] = None) -> Dict[str, Any]:
    """
    런타임 준비 (캘리브 파일 등). 필요 없으면 그대로 둬도 됨.
    """
    # 시선 추적 캘리브레이션 파일 찾기 (calibration_data 폴더에서)
    default_calib_dir = GAZE_DIR / "calibration_data"
    default_calib = None
    if default_calib_dir.exists():
        # JSON 캘리브레이션 파일만 찾기 (시선 추적용)
        cand = next(default_calib_dir.glob("*.json"), None)
        if cand:
            default_calib = str(cand)

    return {
        "ready": True,
        "calib_path": calib_path or default_calib,
        "entrypoint": _find_entrypoint(),
    }


def _call_entry(fn: Callable[..., Any], input_path: str, calib_path: Optional[str]) -> Any:
    """
    엔트리 함수 시그니처가 제각각일 수 있으니, 흔한 패턴들을 순서대로 시도.
    gaze_wrapper.infer_gaze(video_path, calib_path) 시그니처를 우선으로 한다.
    """
    # gaze_wrapper 모듈의 표준 시그니처
    try:
        return fn(video_path=input_path, calib_path=calib_path)
    except TypeError:
        pass

    try:
        return fn(video_path=input_path)
    except TypeError:
        pass

    # 다른 일반적인 케이스들
    try:
        return fn(input_path=input_path, calib_path=calib_path)
    except TypeError:
        pass

    try:
        return fn(input_path)
    except TypeError:
        pass

    try:
        return fn(input_path, calib_path)
    except TypeError:
        pass

    # 마지막으로 인자 없이 동작하는 경우
    return fn()


def infer_gaze(video_bytes: bytes, calib_path: Optional[str] = None) -> Dict[str, Any]:
    """
    업로드된 비디오 바이트 -> 임시 파일 저장 -> Gaze_TR_pro 엔트리 호출 -> 결과 반환
    반환 타입은 엔트리 함수가 주는 구조를 그대로 감싸서 돌려줍니다.
    """
    rt = get_gaze_runtime(calib_path=calib_path)
    fn = rt["entrypoint"]

    # 임시 mp4 파일 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(video_bytes)
        input_path = tmp.name

    try:
        result = _call_entry(fn, input_path=input_path, calib_path=rt["calib_path"])
        # 결과가 None/비구조면 간단히 래핑
        if result is None or isinstance(result, (str, bytes)):
            return {"ok": True, "result": result}
        if not isinstance(result, dict):
            return {"ok": True, "result": repr(result)}
        return {"ok": True, **result}
    finally:
        try:
            os.remove(input_path)
        except Exception:
            pass

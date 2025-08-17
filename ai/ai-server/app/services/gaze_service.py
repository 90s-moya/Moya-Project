# app/services/gaze_service.py
# - 기존 옵셔널 임포트/싱글톤(_calibrator_instance, _tracker_instance) 유지
# - GAZE_BACKEND=auto|native|lite, DISABLE_GAZE=1 지원
# - 네이티브 모듈(gaze_calibration, gaze_tracking) 있으면 사용
#   없거나 초기화 실패하면 라이트 백엔드로 폴백( GAZE_STRICT=1 이면 폴백 금지 )
# - MARK 파일 경로는 GAZE_MARK_PATH 로 전달, 없으면 경고만
# - CPU 부담 최소화를 위해 기본은 프레임 카운트/경량 통계만 수행

from __future__ import annotations
import os, tempfile
from typing import Iterable, Optional, Dict, Any

import cv2

# ----- optional native modules -----
import sys
from pathlib import Path

# 모듈 경로 설정
try:
    current_file = Path(__file__)
    project_root = current_file.resolve().parents[2]  # app/services/gaze_service.py -> project root
    gaze_dir = project_root / "Gaze_TR_pro"
    
    if str(gaze_dir) not in sys.path:
        sys.path.insert(0, str(gaze_dir))
        print(f"[gaze] Added to sys.path: {gaze_dir}")
except Exception as e:
    print(f"[gaze] Failed to add gaze directory to path: {e}")

try:
    from gaze_calibration import GazeCalibrator as NativeCalibrator  # type: ignore
    print(f"[gaze] Successfully imported GazeCalibrator")
except Exception as e:
    print(f"[gaze] import warning (calibrator): {e}")
    NativeCalibrator = None  # type: ignore

try:
    from gaze_tracking import GazeTracker as NativeTracker  # type: ignore
    print(f"[gaze] Successfully imported GazeTracker")
except Exception as e:
    print(f"[gaze] import warning (tracker): {e}")
    NativeTracker = None  # type: ignore

# singletons (복원)
_calibrator_instance: Any | None = None
_tracker_instance: Any | None = None


# ----- lite fallback implementations -----
class LiteCalibrator:
    def __init__(self):
        print("[gaze][lite] Calibrator ready (no-op)")

    def fit(self, calib_data: Dict[str, Any] | None) -> Dict[str, Any]:
        # 실제 보정 대신 입력 메타만 에코
        return {
            "status": "ok",
            "points": len((calib_data or {}).get("calibration_points", [])) if calib_data else 0,
            "vectors": len((calib_data or {}).get("calibration_vectors", [])) if calib_data else 0,
            "screen": (calib_data or {}).get("screen_settings"),
        }


class LiteTracker:
    def __init__(self, mark_path: Optional[str] = None):
        # MARK 파일이 꼭 필요하지 않도록 처리
        if mark_path and not os.path.exists(mark_path):
            print("[gaze][lite] MARK path provided but not found; continuing without it")
        print("[gaze][lite] Tracker ready")

    def infer_frames(self, frames: Iterable[Any], calib_data: Dict[str, Any] | None = None) -> Dict[str, Any]:
        # 프레임 전체를 한 번만 순회하여 카운트
        count = 0
        for _ in frames:
            count += 1
        return {
            "status": "ok",
            "frames": int(count),
            "calibration": {
                "has_data": bool(calib_data),
                "points": len((calib_data or {}).get("calibration_points", [])) if calib_data else 0,
                "vectors": len((calib_data or {}).get("calibration_vectors", [])) if calib_data else 0,
                "screen": (calib_data or {}).get("screen_settings"),
            }
        }


# ----- helpers -----
def _env_true(name: str, default: str = "0") -> bool:
    v = os.getenv(name, default)
    return str(v).lower() in ("1", "true", "yes", "on")


def _backend_choice() -> str:
    # auto | native | lite
    return os.getenv("GAZE_BACKEND", "auto").lower()


def _strict_fail() -> bool:
    # 네이티브 실패 시 폴백 금지
    return _env_true("GAZE_STRICT", "0")


def _mark_path() -> Optional[str]:
    return os.getenv("GAZE_MARK_PATH")


# ----- singletons getters -----
def get_calibrator() -> Any:
    """GazeCalibrator 싱글톤 반환 (네이티브 우선, 실패 시 라이트)"""
    global _calibrator_instance
    if _calibrator_instance is not None:
        return _calibrator_instance

    choice = _backend_choice()
    if choice in ("native", "auto") and NativeCalibrator is not None:
        try:
            _calibrator_instance = NativeCalibrator()  # type: ignore[call-arg]
            print("[gaze] using native Calibrator")
            return _calibrator_instance
        except Exception as e:
            print(f"[gaze] native Calibrator init failed: {e}")
            if _strict_fail():
                raise
            # fall through to lite

    # lite fallback
    _calibrator_instance = LiteCalibrator()
    print("[gaze] using lite Calibrator")
    return _calibrator_instance


def get_tracker() -> Any:
    """GazeTracker 싱글톤 반환 (네이티브 우선, 실패 시 라이트)"""
    global _tracker_instance
    if _tracker_instance is not None:
        return _tracker_instance

    choice = _backend_choice()
    mark = _mark_path()

    if choice in ("native", "auto") and NativeTracker is not None:
        try:
            # mark_path 인자를 지원할 수도, 안 할 수도 있으므로 안전하게 시도
            try:
                _tracker_instance = NativeTracker(mark_path=mark)  # type: ignore[call-arg]
            except TypeError:
                _tracker_instance = NativeTracker()  # type: ignore[call-arg]
            # MARK 유효성 체크(과거 "could not find MARK" 대응)
            if mark and not os.path.exists(mark):
                raise FileNotFoundError("could not find MARK")
            print("[gaze] using native Tracker")
            return _tracker_instance
        except Exception as e:
            print(f"[gaze] native Tracker init failed: {e}")
            if _strict_fail():
                raise
            # fall through to lite

    # lite fallback
    _tracker_instance = LiteTracker(mark_path=mark)
    print("[gaze] using lite Tracker")
    return _tracker_instance


# ----- public APIs (analysis_service 가 호출) -----
def run_calibration(calib_data: Dict[str, Any] | None) -> Dict[str, Any]:
    """선택적: 보정 단계가 따로 필요하면 사용"""
    if _env_true("DISABLE_GAZE", "0"):
        return {"status": "disabled", "reason": "env"}
    calibrator = get_calibrator()
    # 메소드 이름이 구현마다 다를 수 있으니 유연하게 호출
    for name in ("fit", "calibrate", "run"):
        if hasattr(calibrator, name):
            fn = getattr(calibrator, name)
            try:
                return fn(calib_data)
            except TypeError:
                # 시그니처가 다른 경우 (예: fit(points, vectors, ...))
                break
    # 마지막 수단: 라이트 결과
    return LiteCalibrator().fit(calib_data)


def infer_gaze_frames(frames: Iterable[Any], calib_data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """프레임 이터러블 입력(단일 순회)"""
    if _env_true("DISABLE_GAZE", "0"):
        return {"status": "disabled", "reason": "env"}
    tracker = get_tracker()

    # 네이티브/라이트 공통으로 처리될 수 있게 메소드 탐색
    for name in ("process_frames", "infer_frames", "track_frames", "infer", "run"):
        if hasattr(tracker, name):
            fn = getattr(tracker, name)
            try:
                return fn(frames, calib_data=calib_data)
            except TypeError:
                # 시그니처가 다르면 인자 축소해서 재시도
                try:
                    return fn(frames)
                except Exception as e:
                    raise

    # 마지막 수단: 라이트 추론
    return LiteTracker(_mark_path()).infer_frames(frames, calib_data=calib_data)


def infer_gaze(file_bytes: bytes, calib_data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """바이트 입력(임시파일 디코드) — CPU 부담이 커서 frames 경로 권장"""
    if _env_true("DISABLE_GAZE", "0"):
        return {"status": "disabled", "reason": "env"}
    # bytes → 임시 mp4 → 프레임 카운트만
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(file_bytes)
        path = tmp.name
    try:
        cap = cv2.VideoCapture(path)
        count = 0
        while True:
            ok, _ = cap.read()
            if not ok:
                break
            count += 1
        cap.release()
        return {
            "status": "ok",
            "frames": int(count),
            "calibration": {
                "has_data": bool(calib_data),
                "points": len((calib_data or {}).get("calibration_points", [])) if calib_data else 0,
                "vectors": len((calib_data or {}).get("calibration_vectors", [])) if calib_data else 0,
                "screen": (calib_data or {}).get("screen_settings"),
            }
        }
    finally:
        try:
            os.remove(path)
        except Exception:
            pass

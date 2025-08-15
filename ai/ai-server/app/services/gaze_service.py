# app/services/gaze_service.py
from __future__ import annotations

import sys
import os
import tempfile
import json
import cv2
from pathlib import Path
from typing import Optional, Any, Dict

# === Gaze_TR_pro 경로 등록 ===
AI_SERVER_ROOT = Path(__file__).resolve().parents[2]  # ai-server 디렉토리
GAZE_DIR = AI_SERVER_ROOT / "Gaze_TR_pro"
sys.path.append(str(GAZE_DIR))

try:
    from gaze_calibration import GazeCalibrator
    from gaze_tracking import GazeTracker
except ImportError as e:
    print(f"Warning: Could not import gaze modules: {e}")
    GazeCalibrator = None
    GazeTracker = None

# 전역 싱글톤 인스턴스
_calibrator_instance = None
_tracker_instance = None


def get_calibrator(screen_width=1920, screen_height=1080, window_width=1344, window_height=756) -> 'GazeCalibrator':
    global _calibrator_instance
    if _calibrator_instance is None:
        if GazeCalibrator is None:
            raise ImportError("GazeCalibrator not available")
        _calibrator_instance = GazeCalibrator(screen_width, screen_height, window_width, window_height)
    return _calibrator_instance


def get_tracker(screen_width=1920, screen_height=1080, window_width=1344, window_height=756) -> 'GazeTracker':
    global _tracker_instance
    if _tracker_instance is None:
        if GazeTracker is None:
            raise ImportError("GazeTracker not available")
        _tracker_instance = GazeTracker(screen_width, screen_height, window_width, window_height)
    return _tracker_instance


# === 캘리브레이션 ===
def start_calibration(screen_width=1920, screen_height=1080, window_width=1344, window_height=756) -> Dict[str, Any]:
    try:
        calibrator = get_calibrator(screen_width, screen_height, window_width, window_height)
        return {
            "status": "success",
            "message": "Calibration initialized",
            "targets": calibrator.calib_targets
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


def add_calibration_point(gaze_vector: list, target_point: tuple) -> Dict[str, Any]:
    try:
        calibrator = get_calibrator()
        calibrator.add_calibration_point(gaze_vector, target_point)
        return {
            "status": "success",
            "message": f"Added calibration point: {target_point}",
            "total_points": len(calibrator.calib_points)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


def run_calibration(mode="quick") -> Dict[str, Any]:
    try:
        calibrator = get_calibrator()
        result = calibrator.run_calibration(mode=mode)
        return {"status": "success", "calibration_result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def save_calibration(filename: Optional[str] = None) -> Dict[str, Any]:
    try:
        calibrator = get_calibrator()
        filepath = calibrator.save_calibration_data(filename)
        return {"status": "success", "filepath": filepath}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def list_calibrations() -> Dict[str, Any]:
    try:
        calib_dir = GAZE_DIR / "calibration_data"
        if not calib_dir.exists():
            return {"status": "success", "calibrations": []}
        calibrations = [
            {
                "filename": file.name,
                "filepath": str(file),
                "created": file.stat().st_mtime
            }
            for file in calib_dir.glob("*.json")
        ]
        return {"status": "success", "calibrations": calibrations}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# === 로컬 스토리지에서 캘리브레이션 불러오기 ===
def load_calibration_from_localstorage() -> Dict[str, Any]:
    try:
        frontend_root = AI_SERVER_ROOT.parent / "frontend"
        calib_file_patterns = ["gaze_calibration_data.json", "calibration_data_*.json"]

        calib_path = None
        for pattern in calib_file_patterns:
            files = list(frontend_root.glob(pattern))
            if files:
                calib_path = max(files, key=lambda f: f.stat().st_mtime)
                break

        if not calib_path or not calib_path.exists():
            for pattern in calib_file_patterns:
                files = list(Path.cwd().glob(pattern))
                if files:
                    calib_path = max(files, key=lambda f: f.stat().st_mtime)
                    break

        if not calib_path:
            return {"status": "error", "message": "No calibration data found in local storage"}

        with open(calib_path, 'r', encoding='utf-8') as f:
            calib_data = json.load(f)

        required_fields = ['calibration_vectors', 'calibration_points', 'transform_method']
        for field in required_fields:
            if field not in calib_data:
                return {"status": "error", "message": f"Missing required field: {field}"}

        return {
            "status": "success",
            "message": "Calibration data loaded from local storage",
            "data": calib_data,
            "file_path": str(calib_path)
        }
    except Exception as e:
        return {"status": "error", "message": f"Failed to load calibration from local storage: {str(e)}"}


def load_calibration_for_tracking(calib_path: str = None, calib_data: dict = None) -> Dict[str, Any]:
    try:
        tracker = get_tracker()
        if calib_data is None:
            if calib_path is None:
                return {"status": "error", "message": "No calibration data or path provided"}
            with open(calib_path, 'r') as f:
                calib_data = json.load(f)

        tracker.calib_vectors = calib_data.get('calibration_vectors', [])
        tracker.calib_points = calib_data.get('calibration_points', [])
        tracker.transform_matrix = calib_data.get('transform_matrix')
        tracker.transform_method = calib_data.get('transform_method')

        return {"status": "success", "message": "Calibration loaded for tracking"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# === 시선 추적 (프레임 기반 처리) ===
def infer_gaze(
    video_bytes: bytes,
    calib_path: Optional[str] = None,
    calib_data: Optional[dict] = None,
    use_localstorage: bool = True
) -> Dict[str, Any]:
    """
    업로드된 비디오 바이트에서 시선 추적 수행 (프레임 기반)
    MARK chunk 문제를 피하기 위해 process_frames 사용
    """
    print(f"[DEBUG] infer_gaze called with video_bytes length: {len(video_bytes)}")
    print(f"[DEBUG] calib_data provided: {calib_data is not None}")
    print(f"[DEBUG] use_localstorage: {use_localstorage}")

    try:
        tracker = get_tracker()
        calibration_loaded = False
        calibration_source = "none"

        # 1. 외부에서 calib_data 직접 전달
        if calib_data is not None:
            load_result = load_calibration_for_tracking(calib_data=calib_data)
            if load_result["status"] == "success":
                calibration_loaded = True
                calibration_source = "provided_data"

        # 2. 로컬 스토리지 자동 로드
        elif use_localstorage:
            localstorage_result = load_calibration_from_localstorage()
            if localstorage_result["status"] == "success":
                load_result = load_calibration_for_tracking(calib_data=localstorage_result["data"])
                if load_result["status"] == "success":
                    calibration_loaded = True
                    calibration_source = "local_storage"

        # 3. 파일 경로 제공
        elif calib_path:
            load_result = load_calibration_for_tracking(calib_path=calib_path)
            if load_result["status"] == "success":
                calibration_loaded = True
                calibration_source = "provided_path"

        # === 프레임 추출 ===
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name

        cap = cv2.VideoCapture(tmp_path)
        frames = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frames.append(frame)
        cap.release()
        os.remove(tmp_path)

        if not frames:
            return {"ok": False, "error": "No frames extracted from video"}

        print(f"[DEBUG] Extracted {len(frames)} frames, starting gaze tracking...")

        result = tracker.process_frames(frames)

        return {
            "ok": True,
            "result": result,
            "calibration_status": {
                "loaded": calibration_loaded,
                "source": calibration_source,
                "message": "Calibration applied successfully" if calibration_loaded
                           else "No calibration applied - using default mapping"
            }
        }

    except Exception as e:
        return {"ok": False, "error": str(e)}

# app/services/gaze_service.py
from __future__ import annotations

import sys, os, json, tempfile
import cv2
from pathlib import Path
from typing import Optional, Any, Dict, List

AI_SERVER_ROOT = Path(__file__).resolve().parents[2]
GAZE_DIR = AI_SERVER_ROOT / "Gaze_TR_pro"
sys.path.append(str(GAZE_DIR))

try:
    from gaze_calibration import GazeCalibrator
    from gaze_tracking import GazeTracker
except ImportError as e:
    print(f"Warning: Could not import gaze modules: {e}")
    GazeCalibrator = None
    GazeTracker = None

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

# ---- 캘리브레이션 유틸 동일 (생략 없이 유지) ----
def start_calibration(screen_width=1920, screen_height=1080, window_width=1344, window_height=756) -> Dict[str, Any]:
    c = get_calibrator(screen_width, screen_height, window_width, window_height)
    return {"status":"success","message":"Calibration initialized","targets": c.calib_targets}

def add_calibration_point(gaze_vector: list, target_point: tuple) -> Dict[str, Any]:
    c = get_calibrator()
    c.add_calibration_point(gaze_vector, target_point)
    return {"status":"success","total_points": len(c.calib_points)}

def run_calibration(mode="quick") -> Dict[str, Any]:
    c = get_calibrator()
    result = c.run_calibration(mode=mode)
    return {"status":"success","calibration_result": result}

def save_calibration(filename: Optional[str] = None) -> Dict[str, Any]:
    c = get_calibrator()
    path = c.save_calibration_data(filename)
    return {"status":"success","filepath": path}

def list_calibrations() -> Dict[str, Any]:
    calib_dir = GAZE_DIR / "calibration_data"
    if not calib_dir.exists():
        return {"status":"success","calibrations":[]}
    items = []
    for f in calib_dir.glob("*.json"):
        items.append({"filename": f.name, "filepath": str(f), "created": f.stat().st_mtime})
    return {"status":"success","calibrations": items}

def load_calibration_from_localstorage() -> Dict[str, Any]:
    try:
        frontend_root = AI_SERVER_ROOT.parent / "frontend"
        patterns = ["gaze_calibration_data.json", "calibration_data_*.json"]
        path = None
        for p in patterns:
            files = list(frontend_root.glob(p))
            if files:
                path = max(files, key=lambda x: x.stat().st_mtime)
                break
        if not path:
            for p in patterns:
                files = list(Path.cwd().glob(p))
                if files:
                    path = max(files, key=lambda x: x.stat().st_mtime)
                    break
        if not path:
            return {"status":"error","message":"No calibration data found"}
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {"status":"success","data": data, "file_path": str(path)}
    except Exception as e:
        return {"status":"error","message": str(e)}

def load_calibration_for_tracking(calib_path: str = None, calib_data: dict = None) -> Dict[str, Any]:
    t = get_tracker()
    if calib_data is None:
        if not calib_path: return {"status":"error","message":"No calibration data/path"}
        with open(calib_path, "r", encoding="utf-8") as f:
            calib_data = json.load(f)
    t.calib_vectors = calib_data.get("calibration_vectors", [])
    t.calib_points  = calib_data.get("calibration_points", [])
    t.transform_matrix = calib_data.get("transform_matrix")
    t.transform_method = calib_data.get("transform_method")
    return {"status":"success"}

# ---- 프레임 기반 시선 추적 ----
def infer_gaze_frames(
    frames_bgr: List["np.ndarray"],
    calib_path: Optional[str] = None,
    calib_data: Optional[dict] = None,
    use_localstorage: bool = True
) -> Dict[str, Any]:
    t = get_tracker()
    calibration_loaded = False
    source = "none"

    if calib_data is not None:
        if load_calibration_for_tracking(calib_data=calib_data)["status"] == "success":
            calibration_loaded = True
            source = "provided_data"
    elif use_localstorage:
        lr = load_calibration_from_localstorage()
        if lr.get("status") == "success":
            if load_calibration_for_tracking(calib_data=lr["data"])["status"] == "success":
                calibration_loaded = True
                source = "local_storage"
    elif calib_path:
        if load_calibration_for_tracking(calib_path=calib_path)["status"] == "success":
            calibration_loaded = True
            source = "provided_path"

    result = t.process_frames(frames_bgr)
    return {
        "ok": True,
        "result": result,
        "calibration_status": {
            "loaded": calibration_loaded,
            "source": source
        }
    }

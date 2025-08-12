
# app/main.py
from fastapi import FastAPI
from app.api.routes import router
import sys
from pathlib import Path
from app.api import report_router   # 경로 맞는지 확인!

app = FastAPI()

app.include_router(router, prefix="")  # or prefix="/api"
app.include_router(report_router.router)
PROJECT_ROOT = Path(__file__).resolve().parents[1]  # repo 루트
FACE_DIR = PROJECT_ROOT / "Face_Resnet"
GAZE_DIR = PROJECT_ROOT / "Gaze_TR_pro"

sys.path.append(str(FACE_DIR))
sys.path.append(str(GAZE_DIR))

# app/main.py
from fastapi import FastAPI
from app.api.routes import router
import sys
from pathlib import Path
app = FastAPI()

app.include_router(router, prefix="")  # or prefix="/api"
PROJECT_ROOT = Path(__file__).resolve().parents[1]  # repo 루트
FACE_DIR = PROJECT_ROOT / "Face_Resnet"
GAZE_DIR = PROJECT_ROOT / "Gaze_TR_pro"

sys.path.append(str(FACE_DIR))
sys.path.append(str(GAZE_DIR))
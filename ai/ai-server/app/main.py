
# app/main.py
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import json
from app.api.routes import router
import sys
from pathlib import Path
from app.api import report_router   # 경로 맞는지 확인!
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()
# 전체 Origin 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # 모든 Origin 허용
    allow_credentials=True,
    allow_methods=["*"],        # 모든 HTTP 메서드 허용
    allow_headers=["*"],        # 모든 헤더 허용
)


@app.get("/test")
def test():
    return {"msg": "CORS OK!"}


# JSON 응답을 압축하도록 기본 설정
@app.middleware("http")
async def compress_json_middleware(request, call_next):
    response = await call_next(request)
    
    # JSON 응답인 경우 압축 처리
    if (hasattr(response, 'media_type') and response.media_type == "application/json" and 
        hasattr(response, 'body')):
        try:
            # 응답 본문을 압축
            body = response.body.decode('utf-8')
            if '"heatmap_data":' in body:
                # JSON을 파싱한 후 다시 압축
                data = json.loads(body)
                compressed_body = json.dumps(data, separators=(',', ':'), ensure_ascii=False)
                response.body = compressed_body.encode('utf-8')
                response.headers['content-length'] = str(len(response.body))
        except:
            pass  # 실패하면 원본 응답 유지
    
    return response

app.include_router(router, prefix="")  # or prefix="/api"
app.include_router(report_router.router)
PROJECT_ROOT = Path(__file__).resolve().parents[1]  # repo 루트
FACE_DIR = PROJECT_ROOT / "Face_Resnet"
GAZE_DIR = PROJECT_ROOT / "Gaze_TR_pro"

sys.path.append(str(FACE_DIR))
sys.path.append(str(GAZE_DIR))
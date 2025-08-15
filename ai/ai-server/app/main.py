
# app/main.py
import os
# PyTorch 호환성을 위한 환경변수 설정 (PTGaze 라이브러리 호환)
os.environ['TORCH_WEIGHTS_ONLY'] = 'FALSE'

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import json

# 커스텀 JSON 응답 클래스
class CompactJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        # 히트맵 데이터를 압축 포맷으로 변환
        def format_heatmap_data(obj):
            if isinstance(obj, dict):
                if 'heatmap_data' in obj and obj['heatmap_data'] is not None:
                    heatmap = obj['heatmap_data']
                    if isinstance(heatmap, list) and len(heatmap) > 0 and isinstance(heatmap[0], list):
                        # 각 행을 한 줄로 포맷팅
                        formatted_rows = []
                        for row in heatmap:
                            formatted_rows.append('[' + ','.join(map(str, row)) + ']')
                        obj['heatmap_data'] = '[\n' + ',\n'.join(formatted_rows) + '\n]'
                
                for key, value in obj.items():
                    obj[key] = format_heatmap_data(value)
            elif isinstance(obj, list):
                return [format_heatmap_data(item) for item in obj]
            return obj
        
        # 컨텐츠 포맷팅
        formatted_content = format_heatmap_data(content)
        
        return json.dumps(
            formatted_content,
            ensure_ascii=False,
            allow_nan=False,
            indent=2,
            separators=(',', ': ')
        ).encode('utf-8')
from app.api.routes import router
import sys
from pathlib import Path
from app.api import report_router   # 경로 맞는지 확인!
from fastapi.middleware.cors import CORSMiddleware

# PyTorch torch.load 기본값 수정
try:
    import torch
    # torch.load의 기본 weights_only를 False로 설정하는 monkey patch
    original_load = torch.load
    def patched_load(*args, **kwargs):
        if 'weights_only' not in kwargs:
            kwargs['weights_only'] = False
        return original_load(*args, **kwargs)
    torch.load = patched_load
except ImportError:
    pass
# from app.api.demo_router import router as demo_router
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


# JSON 응답 포맷팅 미들웨어 (비활성화됨)
# @app.middleware("http")
# async def format_json_middleware(request, call_next):
#     response = await call_next(request)
#     return response

app.include_router(router, prefix="")  # or prefix="/api"
app.include_router(report_router.router)
# app.include_router(demo_router,        prefix="/api",             tags=["demo"])

PROJECT_ROOT = Path(__file__).resolve().parents[1]  # repo 루트
FACE_DIR = PROJECT_ROOT / "Face_Resnet"
GAZE_DIR = PROJECT_ROOT / "Gaze_TR_pro"

sys.path.append(str(FACE_DIR))
sys.path.append(str(GAZE_DIR))
# app/services/analysis_service.py
from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import cv2
import tempfile
from datetime import datetime
import httpx
from fastapi import HTTPException
from app.utils.posture import analyze_video_bytes
from app.services.gaze_service import infer_gaze ## 추후 gaze 관련 복구 바랍니다.
from app.services.face_service import infer_face_video

def preprocess_video(video_bytes: bytes, target_fps: int = 30, max_frames: int = 1800, resize_to=(960, 540)) -> bytes:
    """영상 FPS 제한, 해상도 축소, 최대 프레임 제한"""
    import os
    
    tmp_path = None
    out_path = None
    
    try:
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name

        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="비디오 파일을 읽을 수 없습니다")
            
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frame_interval = max(1, int(fps / target_fps))

        out_path = tmp_path + "_processed.mp4"
        # 더 안정적인 코덱들을 순서대로 시도
        codecs_to_try = ['H264', 'XVID', 'MJPG', 'mp4v']
        fourcc = None
        out_writer = None
        
        for codec in codecs_to_try:
            try:
                fourcc = cv2.VideoWriter_fourcc(*codec)
                break
            except:
                continue
        
        if fourcc is None:
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")  # fallback

        frame_count = 0
        processed_frames = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % frame_interval == 0:
                if resize_to:
                    frame = cv2.resize(frame, resize_to)

                if out_writer is None:
                    h, w = frame.shape[:2]
                    # VideoWriter 생성을 여러 코덱으로 시도
                    for codec in codecs_to_try:
                        try:
                            test_fourcc = cv2.VideoWriter_fourcc(*codec)
                            out_writer = cv2.VideoWriter(out_path, test_fourcc, target_fps, (w, h))
                            if out_writer.isOpened():
                                print(f"[VideoWriter] {codec} 코덱으로 성공적으로 초기화")
                                break
                            else:
                                out_writer.release()
                                out_writer = None
                        except Exception as e:
                            print(f"[VideoWriter] {codec} 코덱 실패: {e}")
                            if out_writer:
                                out_writer.release()
                                out_writer = None
                            continue
                    
                    # 모든 코덱이 실패한 경우
                    if out_writer is None or not out_writer.isOpened():
                        raise HTTPException(status_code=500, detail="비디오 인코더 초기화 실패")

                out_writer.write(frame)
                processed_frames += 1

                if processed_frames >= max_frames:
                    break

            frame_count += 1

        cap.release()
        if out_writer:
            out_writer.release()

        # 처리된 파일이 존재하는지 확인
        if not os.path.exists(out_path):
            raise HTTPException(status_code=500, detail="비디오 처리 중 오류가 발생했습니다")

        with open(out_path, "rb") as f:
            processed_bytes = f.read()

        return processed_bytes
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"비디오 처리 실패: {str(e)}")
    finally:
        # 임시 파일들 정리
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except:
                pass
        if out_path and os.path.exists(out_path):
            try:
                os.unlink(out_path)
            except:
                pass


# ======================
# 2. 분석 함수
# ======================
def analyze_all(
    video_bytes: bytes,
    device: str = "cpu",
    stride: int = 5,
    return_points: bool = False,
    calib_data: dict = None,
):
    """하나의 업로드 영상으로 Posture + Emotion + Gaze 동시 실행"""
    
    # (전처리 적용: 30fps / 1분 제한 / 960x540)
    video_bytes = preprocess_video(video_bytes, target_fps=30, max_frames=1800, resize_to=(960, 540))

    # 1) Posture 분석
    posture = analyze_video_bytes(video_bytes)

    # 2) Emotion 분석
    face = infer_face_video(video_bytes, device, stride, None, return_points)

    # 3) Gaze 분석
    gaze = infer_gaze(video_bytes, calib_data=calib_data)

    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "device": device,
        "stride": stride,
        "posture": posture,   # 자세 리포트
        "emotion": face,      # 감정 분석
        "gaze": gaze,         # 시선 추적 결과
    }


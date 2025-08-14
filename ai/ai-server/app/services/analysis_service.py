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
    cap = None
    out_writer = None
    
    try:
        # 비디오 바이트에서 파일 형식 추정
        if video_bytes.startswith(b'RIFF') and b'WEBP' in video_bytes[:50]:
            suffix = ".webm"
        elif video_bytes.startswith(b'\x00\x00\x00') and b'ftyp' in video_bytes[:50]:
            suffix = ".mp4"
        else:
            suffix = ".mp4"  # 기본값
            
        # 임시 파일 생성
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name

        print(f"[VideoProcess] 임시 파일 생성: {tmp_path}")

        # OpenCV로 비디오 읽기 시도
        cap = cv2.VideoCapture(tmp_path)
        
        # 다양한 방법으로 비디오 열기 시도
        if not cap.isOpened():
            print("[VideoProcess] 기본 VideoCapture 실패, FFMPEG 백엔드 시도")
            cap.release()
            try:
                cap = cv2.VideoCapture(tmp_path, cv2.CAP_FFMPEG)
            except:
                cap = cv2.VideoCapture(tmp_path)
                
        # 실제 프레임 읽기 테스트
        if cap.isOpened():
            ret, test_frame = cap.read()
            if not ret or test_frame is None:
                print("[VideoProcess] 프레임 읽기 실패")
                cap.release()
                cap = None
            else:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # 처음으로 되돌리기
                
        if cap is None or not cap.isOpened():
            raise HTTPException(status_code=400, detail="비디오 파일을 읽을 수 없습니다")
            
        # 비디오 정보 획득
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0 or fps > 1000:  # 비정상적인 FPS 값 처리
            fps = 30
            
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        print(f"[VideoProcess] 원본 비디오: FPS={fps}, 총 프레임={total_frames}")
        
        frame_interval = max(1, int(fps / target_fps))
        out_path = tmp_path.replace(suffix, "_processed.mp4")
        
        # VideoWriter 초기화
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        frame_count = 0
        processed_frames = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % frame_interval == 0:
                # 크기 조정
                if resize_to:
                    try:
                        frame = cv2.resize(frame, resize_to)
                    except Exception as e:
                        print(f"[VideoProcess] 프레임 리사이즈 실패: {e}")
                        continue

                # VideoWriter 초기화 (첫 프레임에서)
                if out_writer is None:
                    h, w = frame.shape[:2]
                    out_writer = cv2.VideoWriter(out_path, fourcc, target_fps, (w, h))
                    
                    if not out_writer.isOpened():
                        print("[VideoProcess] VideoWriter 초기화 실패")
                        raise HTTPException(status_code=500, detail="비디오 인코더 초기화 실패")
                    
                    print(f"[VideoProcess] VideoWriter 초기화 성공: {w}x{h}")

                # 프레임 쓰기
                try:
                    out_writer.write(frame)
                    processed_frames += 1
                except Exception as e:
                    print(f"[VideoProcess] 프레임 쓰기 실패: {e}")
                    continue

                if processed_frames >= max_frames:
                    print(f"[VideoProcess] 최대 프레임 수({max_frames}) 도달")
                    break

            frame_count += 1

        print(f"[VideoProcess] 처리 완료: 총 {frame_count} 프레임 중 {processed_frames} 프레임 처리")

        # 리소스 해제
        if cap:
            cap.release()
        if out_writer:
            out_writer.release()

        # 처리된 파일 확인
        if not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
            raise HTTPException(status_code=500, detail="비디오 처리 결과 파일이 생성되지 않았습니다")

        # 처리된 비디오 읽기
        with open(out_path, "rb") as f:
            processed_bytes = f.read()
            
        if len(processed_bytes) == 0:
            raise HTTPException(status_code=500, detail="처리된 비디오 파일이 비어있습니다")

        print(f"[VideoProcess] 성공: 처리된 파일 크기 {len(processed_bytes)} bytes")
        return processed_bytes
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[VideoProcess] 예상치 못한 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"비디오 처리 실패: {str(e)}")
    finally:
        # 리소스 정리
        if cap:
            try:
                cap.release()
            except:
                pass
        if out_writer:
            try:
                out_writer.release()
            except:
                pass
                
        # 임시 파일 정리
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
                print(f"[VideoProcess] 임시 파일 삭제: {tmp_path}")
            except:
                pass
        if out_path and os.path.exists(out_path):
            try:
                os.unlink(out_path)
                print(f"[VideoProcess] 처리된 파일 삭제: {out_path}")
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
    
    try:
        print(f"[AnalyzeAll] 시작: 비디오 크기={len(video_bytes)} bytes, device={device}")
        
        # 입력 검증
        if not video_bytes or len(video_bytes) < 100:
            raise HTTPException(status_code=400, detail="유효하지 않은 비디오 데이터")
            
        # (전처리 적용: 30fps / 1분 제한 / 960x540)
        try:
            processed_bytes = preprocess_video(video_bytes, target_fps=30, max_frames=1800, resize_to=(960, 540))
            print(f"[AnalyzeAll] 전처리 완료: {len(processed_bytes)} bytes")
        except Exception as e:
            print(f"[AnalyzeAll] 전처리 실패: {e}")
            raise HTTPException(status_code=500, detail=f"비디오 전처리 실패: {str(e)}")

        results = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "device": device,
            "stride": stride,
            "posture": None,
            "emotion": None,
            "gaze": None,
        }

        # 1) Posture 분석
        try:
            print("[AnalyzeAll] Posture 분석 시작")
            posture = analyze_video_bytes(processed_bytes)
            results["posture"] = posture
            print("[AnalyzeAll] Posture 분석 완료")
        except Exception as e:
            print(f"[AnalyzeAll] Posture 분석 실패: {e}")
            results["posture"] = {"error": f"Posture 분석 실패: {str(e)}"}

        # 2) Emotion 분석
        try:
            print("[AnalyzeAll] Face/Emotion 분석 시작")
            face = infer_face_video(processed_bytes, device, stride, None, return_points)
            results["emotion"] = face
            print("[AnalyzeAll] Face/Emotion 분석 완료")
        except Exception as e:
            print(f"[AnalyzeAll] Face/Emotion 분석 실패: {e}")
            results["emotion"] = {"error": f"Face/Emotion 분석 실패: {str(e)}"}

        # 3) Gaze 분석
        try:
            print("[AnalyzeAll] Gaze 분석 시작")
            gaze = infer_gaze(processed_bytes, calib_data=calib_data)
            results["gaze"] = gaze
            print("[AnalyzeAll] Gaze 분석 완료")
        except Exception as e:
            print(f"[AnalyzeAll] Gaze 분석 실패: {e}")
            results["gaze"] = {"error": f"Gaze 분석 실패: {str(e)}"}

        print("[AnalyzeAll] 모든 분석 완료")
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AnalyzeAll] 전체 분석 실패: {e}")
        raise HTTPException(status_code=500, detail=f"분석 실패: {str(e)}")


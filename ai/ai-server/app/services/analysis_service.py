# app/services/video_pipeline.py
import os
import shutil
import subprocess
import tempfile
from datetime import datetime

from app.utils.posture import analyze_video_bytes
from app.services.gaze_service import infer_gaze
from app.services.face_service import infer_face_video


def _which_ffmpeg() -> str:
    """ffmpeg 실행 파일 경로 확인"""
    path = shutil.which("ffmpeg")
    if not path:
        raise RuntimeError("ffmpeg 실행 파일을 찾을 수 없습니다. 컨테이너/호스트에 ffmpeg를 설치하세요.")
    return path


def _pick_encoder(ffmpeg_path: str) -> str:
    """
    가능한 경우 하드웨어 인코더 사용.
    없으면 libx264로 폴백.
    """
    try:
        out = subprocess.check_output(
            [ffmpeg_path, "-hide_banner", "-v", "error", "-encoders"], text=True
        )
    except Exception:
        return "libx264"

    # 우선순위: NVIDIA → Intel QSV → (macOS는 컨테이너에 보통 해당 없음) → CPU
    if "h264_nvenc" in out:
        return "h264_nvenc"
    if "h264_qsv" in out:
        return "h264_qsv"
    # (videotoolbox는 리눅스 컨테이너 환경에 일반적으로 없음)
    return "libx264"


def preprocess_video_ffmpeg(
    video_bytes: bytes,
    target_fps: int = 30,
    max_frames: int = 1800,
    resize_to: tuple[int, int] | None = (320, 240),
    keep_aspect: bool = False,
    crf: int = 23,
) -> bytes:
    """
    FFmpeg 기반 전처리:
    - webm → mp4 변환
    - FPS 제한
    - 리사이즈 (고정/비율 유지 택1)
    - 프레임 수 제한
    - 가능한 경우 하드웨어 인코딩(NVENC/QSV)
    """
    ffmpeg = _which_ffmpeg()
    encoder = _pick_encoder(ffmpeg)

    # 1) 입력 바이트 임시 파일 저장
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
        tmp_in.write(video_bytes)
        in_path = tmp_in.name
    out_path = in_path + "_processed.mp4"

    try:
        vf_filters = []
        if target_fps and target_fps > 0:
            vf_filters.append(f"fps={int(target_fps)}")

        if resize_to:
            w, h = int(resize_to[0]), int(resize_to[1])
            if keep_aspect:
                # 종횡비 유지 축소
                vf_filters.append(
                    f"scale='if(gt(a,{w}/{h}),{w},-2)':'if(gt(a,{w}/{h}),-2,{h})'"
                )
            else:
                # 고정 리사이즈
                vf_filters.append(f"scale={w}:{h}")

        vf = ",".join(vf_filters) if vf_filters else "null"

        cmd = [
            ffmpeg,
            "-hide_banner",
            "-loglevel", "error",
            "-y",
            "-i", in_path,
            "-an",                         # 오디오 제거(불필요하면)
            "-vf", vf,
            "-frames:v", str(int(max_frames)),
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-c:v", encoder,
        ]

        # 인코더별 기본 파라미터
        if encoder == "libx264":
            cmd += ["-preset", "veryfast", "-crf", str(int(crf))]
        elif encoder == "h264_nvenc":
            cmd += ["-preset", "fast"]
        elif encoder == "h264_qsv":
            cmd += ["-preset", "fast"]

        cmd += [out_path]
        subprocess.run(cmd, check=True)

        with open(out_path, "rb") as f:
            return f.read()

    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"FFmpeg 전처리에 실패했습니다: {e}") from e
    finally:
        for p in (in_path, out_path):
            try:
                if p and os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass


def analyze_all(
    video_bytes: bytes,
    device: str = "cuda",
    stride: int = 5,
    return_points: bool = False,
    calib_data: dict | None = None,
):
    """
    하나의 업로드 영상으로 Posture + Emotion + Gaze 동시 실행 (FFmpeg 전처리 버전)
    """
    # FFmpeg 기반 전처리 (webm→mp4, 30FPS, 320x240, 최대 1800프레임)
    processed_bytes = preprocess_video_ffmpeg(
        video_bytes,
        target_fps=30,
        max_frames=1800,
        resize_to=(320, 240),
        keep_aspect=False,   # 원본 비율 유지 원하면 True
    )

    # 각 서브모듈은 바이트(mp4) 입력을 받아야 함
    posture = analyze_video_bytes(processed_bytes)
    face = infer_face_video(processed_bytes, device, stride, None, return_points)
    gaze = infer_gaze(processed_bytes, calib_data=calib_data)

    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "device": device,
        "stride": stride,
        "posture": posture,
        "emotion": face,
        "gaze": gaze,
    }

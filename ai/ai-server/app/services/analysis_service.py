# app/services/video_pipeline.py (패치 버전 핵심만)
import os
import shutil
import subprocess
import tempfile
from datetime import datetime

from app.utils.posture import analyze_video_bytes
from app.services.gaze_service import infer_gaze
from app.services.face_service import infer_face_video


def _which_ffmpeg() -> str:
    path = shutil.which(os.getenv("FFMPEG_BIN", "ffmpeg"))
    if not path:
        raise RuntimeError("ffmpeg 실행 파일을 찾을 수 없습니다. 컨테이너/호스트에 ffmpeg를 설치하세요.")
    return path


def _pick_encoder(ffmpeg_path: str) -> str:
    """가능하면 NVENC/QSV, 아니면 libx264"""
    try:
        out = subprocess.check_output(
            [ffmpeg_path, "-hide_banner", "-v", "error", "-encoders"], text=True
        )
    except Exception:
        return "libx264"
    if "h264_nvenc" in out:
        return "h264_nvenc"
    if "h264_qsv" in out:
        return "h264_qsv"
    return "libx264"


def _run_ffmpeg(cmd: list[str]) -> None:
    """실행 + 에러 로그 그대로 끌어와서 예외에 담기"""
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(
            f"FFmpeg 실패 (code={res.returncode})\n"
            f"CMD: {' '.join(cmd)}\n"
            f"STDERR:\n{res.stderr.strip()}"
        )


def preprocess_video_ffmpeg(
    video_bytes: bytes,
    target_fps: int = 30,
    max_frames: int = 1800,
    resize_to: tuple[int, int] | None = (320, 240),
    keep_aspect: bool = False,
    crf: int = 23,
) -> bytes:
    """
    FFmpeg 전처리:
    - webm → mp4, fps 제한, 리사이즈, 최대 프레임 제한
    - NVENC/QSV 시도 후 실패 시 libx264로 자동 폴백
    """
    ffmpeg = _which_ffmpeg()
    preferred_encoder = _pick_encoder(ffmpeg)

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
        tmp_in.write(video_bytes)
        in_path = tmp_in.name
    out_path = in_path + "_processed.mp4"

    vf_filters = []
    if target_fps and target_fps > 0:
        vf_filters.append(f"fps={int(target_fps)}")
    if resize_to:
        w, h = int(resize_to[0]), int(resize_to[1])
        if keep_aspect:
            vf_filters.append(
                f"scale='if(gt(a,{w}/{h}),{w},-2)':'if(gt(a,{w}/{h}),-2,{h})'"
            )
        else:
            vf_filters.append(f"scale={w}:{h}")
    vf = ",".join(vf_filters) if vf_filters else "null"

    def build_cmd(encoder: str) -> list[str]:
        cmd = [
            ffmpeg, "-hide_banner", "-loglevel", "error",
            "-y", "-i", in_path, "-an",
            "-vf", vf,
            "-frames:v", str(int(max_frames)),
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-c:v", encoder,
        ]
        if encoder == "libx264":
            cmd += ["-preset", "veryfast", "-crf", str(int(crf))]
        elif encoder in ("h264_nvenc", "h264_qsv"):
            cmd += ["-preset", "fast"]
        cmd += [out_path]
        return cmd

    try:
        # 1차 시도: 선호 인코더(NVENC/QSV/CPU)
        try:
            _run_ffmpeg(build_cmd(preferred_encoder))
        except RuntimeError as e:
            # NVENC/QSV 실패 시 CPU로 자동 폴백
            if preferred_encoder != "libx264":
                _run_ffmpeg(build_cmd("libx264"))
            else:
                raise e

        with open(out_path, "rb") as f:
            return f.read()

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
    processed_bytes = preprocess_video_ffmpeg(
        video_bytes, target_fps=30, max_frames=1800, resize_to=(320, 240), keep_aspect=False
    )
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

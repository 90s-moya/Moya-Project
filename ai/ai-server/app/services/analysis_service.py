# app/services/analysis_service.py
# 목적:
# - WebM/MP4 입력을 임시로 MP4(H.264, yuv420p)로 변환해 모델에 전달
# - NVDEC(디코더) 강제 금지: libnvcuvid.so.1 미노출 환경에서도 안전 동작
# - 가능하면 GPU 스케일(scale_cuda) + NVENC 인코딩 사용 → CPU 사용 절감
# - ffprobe가 실행 불가/실패(127 등)여도 소프트 폴백으로 계속 진행
# - 변환 파일은 즉시 삭제(영구 저장 X)
# - analyze_all: 단일 디코딩(프레임 기반) 자동 사용, 불가 시 bytes 경로로 폴백

from __future__ import annotations

import os
import json
import shutil
import subprocess
import tempfile
from datetime import datetime
from typing import Optional, Tuple, Dict, Any, Iterable, List

# 기존 bytes 기반 API (호환)
from app.utils.posture import analyze_video_bytes
from app.services.gaze_service import infer_gaze
from app.services.face_service import infer_face_video

# 프레임 기반 API가 있으면 단일 디코딩 사용(auto)
try:
    from app.utils.posture import analyze_video_frames  # (frames: Iterable[np.ndarray]) -> Any
except Exception:
    analyze_video_frames = None  # type: ignore

try:
    from app.services.gaze_service import infer_gaze_frames  # (frames: Iterable[np.ndarray], calib_data: dict|None) -> Any
except Exception:
    infer_gaze_frames = None  # type: ignore

try:
    from app.services.face_service import infer_face_frames  # (frames: Iterable[np.ndarray], device: str, stride: int, return_points: bool) -> Any
except Exception:
    infer_face_frames = None  # type: ignore


# ---------------- FFmpeg / FFprobe 유틸 ----------------

def _which(ffbin_env: str, fallback_names: list[str]) -> str:
    """환경변수 또는 후보 이름들 중에서 실행 파일 탐색."""
    cand = []
    envv = os.getenv(ffbin_env)
    if envv:
        cand.append(envv)
    cand += fallback_names
    for name in cand:
        path = name if "/" in name else shutil.which(name or "")
        if path:
            return path
    raise RuntimeError(f"{ffbin_env} / ff binary not found among: {cand}")

def _which_ffmpeg() -> str:
    return _which("FFMPEG_BIN", [
        "/usr/local/bin/ffmpeg", "/opt/ffmpeg/bin/ffmpeg",
        "ffmpeg", "/usr/bin/ffmpeg"
    ])

def _which_ffprobe_soft() -> Optional[str]:
    """ffprobe 경로 소프트 탐색(없어도 됨)."""
    for name in [os.getenv("FFPROBE_BIN"),
                 "/usr/local/bin/ffprobe", "/opt/ffmpeg/bin/ffprobe",
                 "ffprobe", "/usr/bin/ffprobe"]:
        if not name:
            continue
        path = name if "/" in name else shutil.which(name)
        if path:
            return path
    return None

def _run_ffmpeg(cmd: list[str]) -> None:
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(
            f"FFmpeg 실패(code={res.returncode})\nCMD: {' '.join(cmd)}\nSTDERR:\n{res.stderr.strip()}"
        )

def _ffprobe_soft(in_path: str) -> dict:
    """ffprobe를 소프트하게 실행. 실패하면 {} 반환."""
    ffprobe = _which_ffprobe_soft()
    if not ffprobe:
        return {}
    args = [ffprobe, "-v", "error", "-show_streams", "-show_format",
            "-select_streams", "v:0", "-of", "json", in_path]
    try:
        out = subprocess.check_output(args, text=True)
        return json.loads(out)
    except Exception:
        return {}

def _has(ffmpeg: str, kind: str, name: str) -> bool:
    """ffmpeg 기능 보유 여부(encoder/filter) 확인."""
    try:
        if kind == "encoder":
            out = subprocess.check_output([ffmpeg, "-v", "error", "-encoders"], text=True)
        elif kind == "filter":
            out = subprocess.check_output([ffmpeg, "-v", "error", "-filters"], text=True)
        else:
            return False
        return name in out
    except Exception:
        return False

def _parse_fps(r_frame_rate: Optional[str]) -> float:
    if not r_frame_rate:
        return 0.0
    try:
        num, den = r_frame_rate.split("/")
        num_i, den_i = int(num), int(den)
        return (num_i / den_i) if den_i else 0.0
    except Exception:
        return 0.0

def _can_remux_to_mp4_without_reencode(info: dict,
                                       want_size: Optional[Tuple[int, int]],
                                       want_fps: Optional[int]) -> bool:
    """입력이 mp4/h264/yuv420p이고 해상도·fps도 일치하면 copy 가능."""
    fmt = (info.get("format") or {}).get("format_name", "")
    v = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), {})
    if not v:
        return False
    is_mp4_like = any(x in fmt for x in ("mp4", "mov", "m4a"))
    is_h264 = (v.get("codec_name") == "h264")
    is_420 = (v.get("pix_fmt") == "yuv420p")
    if not (is_mp4_like and is_h264 and is_420):
        return False
    if want_size:
        w, h = want_size
        if v.get("width") != int(w) or v.get("height") != int(h):
            return False
    if want_fps:
        cur = int(round(_parse_fps(v.get("r_frame_rate", "0/1"))))
        if cur != int(want_fps):
            return False
    return True


# --------------- 전처리(임시 파일 사용, 즉시 삭제) ---------------

def preprocess_video_to_mp4_file(
    video_bytes: bytes,
    target_fps: int = 15,              # 메모리/연산 절감
    max_frames: Optional[int] = 1500,  # 최대 프레임 수
    resize_to: Optional[Tuple[int, int]] = (288, 216),
    keep_aspect: bool = False,
    drop_audio: bool = True,
) -> tuple[str, Dict[str, Any]]:
    """
    입력 바이트를 MP4(H.264, yuv420p)로 변환해 임시 파일 경로 반환 + debug 딕셔너리.
    호출자가 사용 후 파일 삭제를 책임짐(analyze_all에서 즉시 삭제 보장).
    - NVDEC(디코더) 강제하지 않음( -hwaccel / *_cuvid 미사용 )
    - scale_cuda 있으면 GPU 스케일 + NVENC, 아니면 CPU 스케일 + NVENC
    - NVENC 없으면 libx264(veryfast/CRF)로 폴백
    """
    ffmpeg = _which_ffmpeg()
    # Tesla T4 (4 vCPU) 최적화 설정
    threads = os.getenv("FFMPEG_THREADS", "1")
    filter_threads = os.getenv("FFMPEG_FILTER_THREADS", "1")
    x264_preset = os.getenv("X264_PRESET", "veryfast")
    x264_crf = int(os.getenv("X264_CRF", "28"))

    # NVENC 설정
    nvenc_preset = os.getenv("NVENC_PRESET", "p1")
    nvenc_tune = os.getenv("NVENC_TUNE", "ull")
    nvenc_rc = os.getenv("NVENC_RC", "cbr")
    nvenc_bitrate = os.getenv("NVENC_BITRATE", "1.5M")
    nvenc_maxrate = os.getenv("NVENC_MAXRATE", "1.5M")
    nvenc_bufsize = os.getenv("NVENC_BUFSIZE", "3M")

    # 입력을 임시 파일로 기록
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
        tmp_in.write(video_bytes)
        in_path = tmp_in.name
    out_path = in_path + "_processed.mp4"

    info = _ffprobe_soft(in_path)
    has_nvenc = _has(ffmpeg, "encoder", "h264_nvenc")
    has_scale_cuda = _has(ffmpeg, "filter", "scale_cuda") or _has(ffmpeg, "filter", "scale_npp")

    def _scale_vf():
        if not resize_to:
            return None
        w, h = int(resize_to[0]), int(resize_to[1])
        if keep_aspect:
            # 필요시 force_original_aspect_ratio=decrease 등으로 확장 가능
            return f"scale={w}:{h}:flags=fast_bilinear"
        return f"scale={w}:{h}:flags=fast_bilinear"

    vf_scale_cpu = _scale_vf()

    def build_copy_cmd() -> list[str]:
        cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", in_path]
        if drop_audio:
            cmd += ["-an"]
        else:
            cmd += ["-c:a", "copy"]
        cmd += ["-c:v", "copy", "-movflags", "+faststart", out_path]
        return cmd

    def build_nvenc_cmd() -> list[str]:
        # CPU decode -> (hwupload_cuda) -> (scale_cuda/scale_npp) -> h264_nvenc
        cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin",
               "-y", "-i", in_path, "-threads", threads, "-filter_threads", filter_threads]

        vf_parts = []
        if resize_to and has_scale_cuda:
            vf_parts.append("hwupload_cuda")
            w, h = int(resize_to[0]), int(resize_to[1])
            scaler = "scale_cuda" if _has(ffmpeg, "filter", "scale_cuda") else "scale_npp"
            vf_parts.append(f"{scaler}={w}:{h}")
        elif resize_to:
            vf_parts.append(vf_scale_cpu)

        if vf_parts:
            cmd += ["-vf", ",".join(vf_parts)]

        if target_fps and target_fps > 0:
            cmd += ["-r", str(int(target_fps))]
        if max_frames is not None:
            cmd += ["-frames:v", str(int(max_frames))]
        if drop_audio:
            cmd += ["-an"]

        cmd += [
            "-movflags", "+faststart",
            "-c:v", "h264_nvenc",
            "-preset", nvenc_preset,
            "-tune", nvenc_tune,
            "-rc", nvenc_rc,
            "-b:v", nvenc_bitrate,
            "-maxrate", nvenc_maxrate,
            "-bufsize", nvenc_bufsize,
            "-gpu", "0",
            "-delay", "0",
            "-zerolatency", "1",
            "-forced-idr", "1",
            "-aq-strength", "1",
            "-extra_hw_frames", "8",
            out_path
        ]
        return cmd

    def build_x264_cmd() -> list[str]:
        vf_parts = []
        if vf_scale_cpu:
            vf_parts.append(vf_scale_cpu)
        cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin",
               "-y", "-i", in_path, "-threads", threads, "-filter_threads", filter_threads]
        if vf_parts:
            cmd += ["-vf", ",".join(vf_parts)]
        if target_fps and target_fps > 0:
            cmd += ["-r", str(int(target_fps))]
        if max_frames is not None:
            cmd += ["-frames:v", str(int(max_frames))]
        if drop_audio:
            cmd += ["-an"]
        cmd += [
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-c:v", "libx264",
            "-preset", x264_preset,
            "-crf", str(int(x264_crf)),
            out_path
        ]
        return cmd

    debug: Dict[str, Any] = {
        "ffmpeg": ffmpeg,
        "ffprobe_ok": bool(info),
        "has_nvenc": has_nvenc,
        "has_scale_cuda": has_scale_cuda,
        "target_fps": target_fps,
        "resize_to": resize_to,
        "max_frames": max_frames,
        "pipeline": None,
        "encoder": None,
        "decoder": "cpu",
        "scale": None,
    }

    try:
        can_copy = False
        if info and not resize_to and (not target_fps or target_fps <= 0) and (max_frames is None):
            can_copy = _can_remux_to_mp4_without_reencode(info, None, None)

        if can_copy:
            _run_ffmpeg(build_copy_cmd())
            debug.update({"pipeline": "copy", "encoder": "copy", "scale": "n/a"})
        else:
            nvenc_success = False
            if has_nvenc:
                try:
                    _run_ffmpeg(build_nvenc_cmd())
                    nvenc_success = True
                    if resize_to and has_scale_cuda:
                        scaler = "scale_cuda" if _has(ffmpeg, "filter", "scale_cuda") else "scale_npp"
                        debug.update({
                            "pipeline": "cpu-dec+gpu-scale+gpu-enc",
                            "encoder": "h264_nvenc",
                            "scale": scaler,
                            "memory_path": "cpu->gpu->gpu"
                        })
                    else:
                        debug.update({
                            "pipeline": "cpu-dec+cpu-scale+gpu-enc",
                            "encoder": "h264_nvenc",
                            "scale": "scale(cpu)" if resize_to else None,
                            "memory_path": "cpu->cpu->gpu"
                        })
                except RuntimeError as e:
                    debug["nvenc_error"] = str(e)

            if not nvenc_success:
                _run_ffmpeg(build_x264_cmd())
                debug.update({
                    "pipeline": "cpu" + ("-fallback" if has_nvenc else ""),
                    "encoder": "libx264",
                    "scale": "scale(cpu)" if resize_to else None
                })

        return out_path, debug

    except Exception:
        # 실패 시 임시 파일 정리
        try:
            if os.path.exists(out_path):
                os.remove(out_path)
        except Exception:
            pass
        raise
    finally:
        # 입력 파일은 즉시 삭제
        try:
            if os.path.exists(in_path):
                os.remove(in_path)
        except Exception:
            pass


def preprocess_video_to_mp4_bytes(
    video_bytes: bytes,
    target_fps: int = 15,
    max_frames: Optional[int] = 1500,
    resize_to: Optional[Tuple[int, int]] = (288, 216),
    keep_aspect: bool = False,
    drop_audio: bool = True,
) -> tuple[bytes, Dict[str, Any]]:
    """
    호환 경로: 변환 mp4를 bytes로 반환(임시 파일은 이 함수 내부에서 생성/삭제).
    """
    out_path, debug = preprocess_video_to_mp4_file(
        video_bytes=video_bytes,
        target_fps=target_fps,
        max_frames=max_frames,
        resize_to=resize_to,
        keep_aspect=keep_aspect,
        drop_audio=drop_audio,
    )
    try:
        with open(out_path, "rb") as f:
            processed = f.read()
        return processed, debug
    finally:
        try:
            if os.path.exists(out_path):
                os.remove(out_path)
        except Exception:
            pass


# ---------------- 프레임 리더(단일 디코딩) ----------------

class VideoFrameIterator:
    """
    단일 디코딩을 위해 cv2 또는 PyAV로 mp4 파일을 순회하며 프레임(ndarray, RGB)을 yield.
    - stride: 매 N번째 프레임만 반환
    """
    def __init__(self, mp4_path: str, stride: int = 5):
        self.mp4_path = mp4_path
        self.stride = max(1, int(stride))

    def __iter__(self):
        # 1) OpenCV 우선
        try:
            import cv2  # type: ignore
            cap = cv2.VideoCapture(self.mp4_path)
            if not cap.isOpened():
                raise RuntimeError("cv2.VideoCapture open failed")
            i = 0
            try:
                while True:
                    ok, bgr = cap.read()
                    if not ok:
                        break
                    if (i % self.stride) == 0:
                        yield bgr[..., ::-1]  # BGR->RGB
                    i += 1
            finally:
                cap.release()
            return
        except Exception:
            pass

        # 2) PyAV 폴백
        try:
            import av  # type: ignore
            i = 0
            with av.open(self.mp4_path) as c:
                for frame in c.decode(video=0):
                    if (i % self.stride) == 0:
                        yield frame.to_ndarray(format="rgb24")
                    i += 1
            return
        except Exception as e:
            raise RuntimeError(f"VideoFrameIterator failed: {e}")


# ---------------- 분석 파이프라인(모델 호출) ----------------

def analyze_all(
    video_bytes: bytes,
    device: Optional[str] = None,
    stride: int = 5,  # bytes 경로에서 face stride로도 사용
    return_points: bool = False,
    calib_data: Optional[dict] = None,
    # 전처리 파라미터
    target_fps: int = 15,
    resize_to: Tuple[int, int] = (288, 216),
    max_frames: int = 1500,
    return_debug: bool = False,
    # 선택: 단일 디코딩(auto), 강제 프레임/강제 바이트
    stream_mode: str = "auto",  # "auto" | "frames" | "bytes"
):
    """
    - 입력을 MP4(H.264, yuv420p, target_fps, resize_to)로 맞춘 뒤 모델 실행.
    - stream_mode="auto": *_frames API가 모두 있으면 단일 디코딩, 아니면 bytes 경로 폴백.
      "frames": 프레임 기반 강제(없으면 예외).
      "bytes": 항상 기존(bytes) 경로 사용.
    - debug 요청 시 전처리/실행 파이프라인 정보 포함.
    """
    # 디바이스 확정
    if device is None:
        try:
            import torch  # type: ignore
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            device = "cpu"

    # 1) 전처리: 파일 경로로 받아서 프레임 순회 후 삭제
    mp4_path, dbg = preprocess_video_to_mp4_file(
        video_bytes=video_bytes,
        target_fps=target_fps,
        max_frames=max_frames,
        resize_to=resize_to,
        keep_aspect=False,
        drop_audio=True,
    )

    frames_api_ok = (analyze_video_frames is not None) and \
                    (infer_face_frames is not None) and \
                    (infer_gaze_frames is not None)

    def _run_frames_path() -> tuple[Any, Any, Any]:
        # 단일 디코딩: 간단하게 리스트 캐싱 후 세 모델 호출
        frames = list(VideoFrameIterator(mp4_path, stride=stride))
        posture = analyze_video_frames(frames)  # type: ignore
        face = infer_face_frames(frames, device=device, stride=stride, return_points=return_points)  # type: ignore
        gaze = infer_gaze_frames(frames, calib_data=calib_data)  # type: ignore
        return posture, face, gaze

    def _run_bytes_path() -> tuple[Any, Any, Any]:
        # 기존 방식: 변환된 mp4를 bytes로 읽어서 각 서비스 호출(최대 3번 디코딩)
        with open(mp4_path, "rb") as f:
            processed_bytes = f.read()
        posture = analyze_video_bytes(processed_bytes)
        face = infer_face_video(processed_bytes, device, stride, None, return_points)
        gaze = infer_gaze(processed_bytes, calib_data=calib_data)
        return posture, face, gaze

    try:
        use_frames = False
        if stream_mode == "frames":
            if not frames_api_ok:
                raise RuntimeError(
                    "stream_mode='frames'로 지정했지만, *_frames API가 모두 존재하지 않습니다."
                )
            use_frames = True
        elif stream_mode == "auto":
            use_frames = frames_api_ok
        else:  # "bytes"
            use_frames = False

        if use_frames:
            posture, face, gaze = _run_frames_path()
            dbg.update({
                "analyze_mode": "single-decode/frames",
                "frames_api": True,
                "stride": stride
            })
        else:
            posture, face, gaze = _run_bytes_path()
            dbg.update({
                "analyze_mode": "bytes(compat)",
                "frames_api": False,
                "stride": stride
            })

        out: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "device": device,
            "stride": stride,
            "posture": posture,
            "emotion": face,
            "gaze": gaze,
        }
        if return_debug:
            out["debug"] = dbg
        return out

    finally:
        # 변환 파일은 즉시 삭제(영구 저장 X)
        try:
            if os.path.exists(mp4_path):
                os.remove(mp4_path)
        except Exception:
            pass

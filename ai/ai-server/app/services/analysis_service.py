# app/services/video_pipeline.py
# 목적:
# - WebM/MP4 입력을 임시로 MP4(H.264, yuv420p)로 변환해 모델에 전달
# - NVDEC(디코더) 강제 금지: libnvcuvid.so.1 미노출 환경에서도 안전 동작
# - 가능하면 GPU 스케일(scale_cuda) + NVENC 인코딩 사용 → CPU 사용 절감
# - ffprobe가 실행 불가/실패(127 등)여도 소프트 폴백으로 계속 진행
# - 변환 파일은 즉시 삭제(영구 저장 X)

from __future__ import annotations

import os
import json
import shutil
import subprocess
import tempfile
from datetime import datetime
from typing import Optional, Tuple, Dict, Any

from app.utils.posture import analyze_video_bytes
from app.services.gaze_service import infer_gaze
from app.services.face_service import infer_face_video


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

def preprocess_video_to_mp4_bytes(
    video_bytes: bytes,
    target_fps: int = 15,  # Tesla T4 메모리 절약을 위해 25fps로 감소
    max_frames: Optional[int] = 1500,  # 최대 프레임 수 감소 (60초 * 25fps)
    resize_to: Optional[Tuple[int, int]] = (288, 216),  # 16:12 비율로 메모리 절약
    keep_aspect: bool = False,  # 현재는 고정 리사이즈 사용(필요시 확장)
    drop_audio: bool = True,
) -> tuple[bytes, Dict[str, Any]]:
    """
    입력 바이트를 MP4(H.264, yuv420p)로 변환해 bytes 반환 + debug 딕셔너리 제공.
    - NVDEC(디코더) 강제하지 않음( -hwaccel / *_cuvid 미사용 )
    - scale_cuda 있으면 GPU 스케일 + NVENC, 아니면 CPU 스케일 + NVENC
    - NVENC 없으면 libx264(ultrafast)로 폴백
    """
    ffmpeg = _which_ffmpeg()
    # Tesla T4 (4 vCPU) 최적화 설정
    threads = os.getenv("FFMPEG_THREADS", "3")      # 4 vCPU 중 3개 사용 (1개는 시스템용)
    filter_threads = os.getenv("FFMPEG_FILTER_THREADS", "2")  # 필터 스레드 증가
    x264_preset = os.getenv("X264_PRESET", "veryfast")  # ultrafast보다 약간 느리지만 품질 개선
    x264_crf = int(os.getenv("X264_CRF", "28"))     # 품질 약간 낮춰서 속도 향상
    
    # Tesla T4 NVENC 7세대 최적화 옵션들
    nvenc_preset = os.getenv("NVENC_PRESET", "p1")  # 최고 속도
    nvenc_tune = os.getenv("NVENC_TUNE", "ull")     # 초저지연 (Tesla T4에서 지원)
    nvenc_rc = os.getenv("NVENC_RC", "cbr")         # 일정 비트레이트
    nvenc_bitrate = os.getenv("NVENC_BITRATE", "1.5M")  # 메모리 절약을 위해 낮춤
    nvenc_maxrate = os.getenv("NVENC_MAXRATE", "1.5M")
    nvenc_bufsize = os.getenv("NVENC_BUFSIZE", "3M")     # 버퍼 크기 줄임

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
        tmp_in.write(video_bytes)
        in_path = tmp_in.name
    out_path = in_path + "_processed.mp4"

    info = _ffprobe_soft(in_path)
    has_nvenc = _has(ffmpeg, "encoder", "h264_nvenc")
    has_scale_cuda = _has(ffmpeg, "filter", "scale_cuda") or _has(ffmpeg, "filter", "scale_npp")

    # 리사이즈 필터 문자열(keep_aspect 옵션 확장 여지)
    def _scale_vf():
        if not resize_to:
            return None
        w, h = int(resize_to[0]), int(resize_to[1])
        if keep_aspect:
            # 필요시 확장: 현재는 고정 리사이즈로 운용
            return f"scale={w}:{h}:flags=fast_bilinear"
        return f"scale={w}:{h}:flags=fast_bilinear"

    vf_scale_cpu = _scale_vf()
    w, h = (int(resize_to[0]), int(resize_to[1])) if resize_to else (None, None)

    def build_copy_cmd() -> list[str]:
        cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", in_path]
        if drop_audio:
            cmd += ["-an"]
        else:
            cmd += ["-c:a", "copy"]
        cmd += ["-c:v", "copy", "-movflags", "+faststart", out_path]
        return cmd

    def build_nvenc_cmd() -> list[str]:
        """
        수정된 파이프라인: CPU 디코드 -> GPU 업로드 -> GPU 스케일 -> GPU 인코드
        """
        cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin",
               "-y", "-i", in_path, "-threads", threads, "-filter_threads", filter_threads]

        vf_parts = []
        # GPU 스케일이 가능하고, 리사이즈가 필요한 경우
        if resize_to and has_scale_cuda:
            # 1. CPU에서 디코딩된 프레임을 GPU 메모리로 업로드
            vf_parts.append("hwupload_cuda")
            
            # 2. GPU를 사용하여 프레임 리사이즈
            w, h = int(resize_to[0]), int(resize_to[1])
            scaler = "scale_cuda" if _has(ffmpeg, "filter", "scale_cuda") else "scale_npp"
            vf_parts.append(f"{scaler}={w}:{h}")
            
            # 3. h264_nvenc는 GPU 메모리를 직접 처리 가능 (hwdownload 불필요)

        # GPU 스케일이 불가능하거나, 리사이즈가 필요 없는 경우 CPU 스케일로 폴백
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
            
        # GPU 필터 체인의 출력은 h264_nvenc가 바로 처리할 수 있음
        cmd += [
            "-movflags", "+faststart",
            "-c:v", "h264_nvenc",
            "-preset", nvenc_preset,
            "-tune", nvenc_tune,
            "-rc", nvenc_rc,
            "-b:v", nvenc_bitrate,
            "-maxrate", nvenc_maxrate,
            "-bufsize", nvenc_bufsize,
            "-gpu", "0",              # Tesla T4 GPU 명시적 지정
            "-delay", "0",            # 지연 제거
            "-zerolatency", "1",      # 제로 레이턴시 모드
            "-forced-idr", "1",       # 강제 IDR 프레임
            "-aq-strength", "1",      # 적응형 양자화 최소화 (속도 우선)
            "-extra_hw_frames", "8",  # GPU 메모리 프레임 버퍼
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
        "decoder": "cpu",  # NVDEC 강제 사용 안 함
        "scale": None,
    }

    try:
        # copy 가능 조건 충족 시(드물지만) 재인코딩 없이 처리
        can_copy = False
        if info and not resize_to and (not target_fps or target_fps <= 0):
            # 리사이즈/프레임 제한이 없을 때만 copy 고려
            can_copy = _can_remux_to_mp4_without_reencode(info, None, None)

        if can_copy:
            _run_ffmpeg(build_copy_cmd())
            debug.update({"pipeline": "copy", "encoder": "copy", "scale": "n/a"})
        else:
            # NVENC 먼저 시도, 실패시 libx264로 폴백
            nvenc_success = False
            if has_nvenc:
                try:
                    _run_ffmpeg(build_nvenc_cmd())
                    nvenc_success = True
                    # GPU 스케일링 사용 여부에 따른 파이프라인 정보 업데이트
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
                    # NVENC 실패시 로그 남기고 libx264로 폴백
                    debug["nvenc_error"] = str(e)
            
            if not nvenc_success:
                _run_ffmpeg(build_x264_cmd())
                debug.update({
                    "pipeline": "cpu" + ("-fallback" if has_nvenc else ""),
                    "encoder": "libx264",
                    "scale": "scale(cpu)" if resize_to else None
                })

        with open(out_path, "rb") as f:
            processed = f.read()
        return processed, debug

    finally:
        for p in (in_path, out_path):
            try:
                if p and os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass


# ---------------- 분석 파이프라인(모델 호출) ----------------

def analyze_all(
    video_bytes: bytes,
    device: Optional[str] = None,
    stride: int = 5,
    return_points: bool = False,
    calib_data: Optional[dict] = None,
    # Tesla T4 최적화 변환 파라미터
    target_fps: int = 15,
    resize_to: Tuple[int, int] = (288, 216),
    max_frames: int = 1500,
    return_debug: bool = False,
):
    """
    - 입력을 MP4(H.264, yuv420p, target_fps, resize_to)로 맞춘 뒤
      자세/표정/시선 모델 실행 결과 반환.
    - debug 요청 시 전처리 파이프라인 정보 포함.
    """
    if device is None:
        try:
            import torch  # type: ignore
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            device = "cpu"

    processed_bytes, dbg = preprocess_video_to_mp4_bytes(
        video_bytes=video_bytes,
        target_fps=target_fps,
        max_frames=max_frames,
        resize_to=resize_to,
        keep_aspect=False,
        drop_audio=True,
    )

    posture = analyze_video_bytes(processed_bytes)
    face = infer_face_video(processed_bytes, device, stride, None, return_points)
    gaze = infer_gaze(processed_bytes, calib_data=calib_data)

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
# app/services/video_pipeline.py
# 목적:
# - WebM/MP4 입력을 임시로 MP4(H.264, yuv420p, 15fps)로 변환
# - OpenCV로 "한 번만" 디코드하여 자세/얼굴/시선을 동시 처리(스트리밍)
# - 얼굴/시선은 GPU, 자세는 CPU(MediaPipe Pose)
# - 프론트 싱크를 위해 초 단위 + 30fps 프레임 기준을 함께 리턴

from __future__ import annotations

import os
import json
import shutil
import subprocess
import tempfile
from datetime import datetime
from typing import Optional, Tuple, Dict, Any, List

import cv2
import numpy as np

# 자세 분석 유틸(라벨링/세그먼트 압축 재사용)
from app.utils.posture import (
    mp as mp_mediapipe,   # mediapipe root
    _extract_feedbacks,
    _choose_label,
    _compress_runs,
)

from app.services.gaze_service import infer_gaze  # (백호환 용도로 남겨둠)
from app.services.face_service import infer_face_video  # (백호환 용도로 남겨둠)

# ---------------- OpenCV/BLAS 스레드 제한(과점유 방지) ----------------
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
cv2.setNumThreads(1)

# ---------------- FFmpeg / FFprobe 유틸 ----------------

def _which(ffbin_env: str, fallback_names: list[str]) -> str:
    cand = []
    envv = os.getenv(ffbin_env)
    if envv: cand.append(envv)
    cand += fallback_names
    for name in cand:
        path = name if "/" in name else shutil.which(name or "")
        if path: return path
    raise RuntimeError(f"{ffbin_env} / ff binary not found among: {cand}")

def _which_ffmpeg() -> str:
    return _which("FFMPEG_BIN", [
        "/usr/local/bin/ffmpeg", "/opt/ffmpeg/bin/ffmpeg",
        "ffmpeg", "/usr/bin/ffmpeg"
    ])

def _which_ffprobe_soft() -> Optional[str]:
    for name in [os.getenv("FFPROBE_BIN"),
                 "/usr/local/bin/ffprobe", "/opt/ffmpeg/bin/ffprobe",
                 "ffprobe", "/usr/bin/ffprobe"]:
        if not name: continue
        path = name if "/" in name else shutil.which(name)
        if path: return path
    return None

def _run_ffmpeg(cmd: list[str]) -> None:
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(
            f"FFmpeg 실패(code={res.returncode})\nCMD: {' '.join(cmd)}\nSTDERR:\n{res.stderr.strip()}"
        )

def _ffprobe_soft(in_path: str) -> dict:
    ffprobe = _which_ffprobe_soft()
    if not ffprobe: return {}
    args = [ffprobe, "-v", "error", "-show_streams", "-show_format",
            "-select_streams", "v:0", "-of", "json", in_path]
    try:
        out = subprocess.check_output(args, text=True)
        return json.loads(out)
    except Exception:
        return {}

def _has(ffmpeg: str, kind: str, name: str) -> bool:
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
    if not r_frame_rate: return 0.0
    try:
        num, den = r_frame_rate.split("/")
        num_i, den_i = int(num), int(den)
        return (num_i / den_i) if den_i else 0.0
    except Exception:
        return 0.0

def _can_remux_to_mp4_without_reencode(info: dict,
                                       want_size: Optional[Tuple[int, int]],
                                       want_fps: Optional[int]) -> bool:
    fmt = (info.get("format") or {}).get("format_name", "")
    v = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), {})
    if not v: return False
    is_mp4_like = any(x in fmt for x in ("mp4", "mov", "m4a"))
    is_h264 = (v.get("codec_name") == "h264")
    is_420 = (v.get("pix_fmt") == "yuv420p")
    if not (is_mp4_like and is_h264 and is_420): return False
    if want_size:
        w, h = want_size
        if v.get("width") != int(w) or v.get("height") != int(h): return False
    if want_fps:
        cur = int(round(_parse_fps(v.get("r_frame_rate", "0/1"))))
        if cur != int(want_fps): return False
    return True

# --------------- 전처리(임시 파일 사용, 즉시 삭제) ---------------

def preprocess_video_to_mp4_bytes(
    video_bytes: bytes,
    target_fps: int = 15,                    # ★ 15fps 다운샘플
    max_frames: Optional[int] = 1500,
    resize_to: Optional[Tuple[int, int]] = None,  # 스트리밍에선 프레임별 리사이즈 권장
    keep_aspect: bool = False,
    drop_audio: bool = True,
) -> tuple[bytes, Dict[str, Any]]:
    ffmpeg = _which_ffmpeg()
    threads = os.getenv("FFMPEG_THREADS", "3")
    filter_threads = os.getenv("FFMPEG_FILTER_THREADS", "2")
    x264_preset = os.getenv("X264_PRESET", "veryfast")
    x264_crf = int(os.getenv("X264_CRF", "28"))

    nvenc_preset = os.getenv("NVENC_PRESET", "p1")
    nvenc_tune = os.getenv("NVENC_TUNE", "ull")
    nvenc_rc = os.getenv("NVENC_RC", "cbr")
    nvenc_bitrate = os.getenv("NVENC_BITRATE", "1.5M")
    nvenc_maxrate = os.getenv("NVENC_MAXRATE", "1.5M")
    nvenc_bufsize = os.getenv("NVENC_BUFSIZE", "3M")

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
        tmp_in.write(video_bytes)
        in_path = tmp_in.name
    out_path = in_path + "_processed.mp4"

    info = _ffprobe_soft(in_path)
    has_nvenc = _has(ffmpeg, "encoder", "h264_nvenc")
    has_scale_cuda = _has(ffmpeg, "filter", "scale_cuda") or _has(ffmpeg, "filter", "scale_npp")

    def _scale_vf():
        if not resize_to: return None
        w, h = int(resize_to[0]), int(resize_to[1])
        return f"scale={w}:{h}:flags=fast_bilinear"

    vf_scale_cpu = _scale_vf()

    def build_copy_cmd() -> list[str]:
        cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", in_path]
        if drop_audio: cmd += ["-an"]
        else: cmd += ["-c:a", "copy"]
        cmd += ["-c:v", "copy", "-movflags", "+faststart", out_path]
        return cmd

    def build_nvenc_cmd() -> list[str]:
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
        if vf_parts: cmd += ["-vf", ",".join(vf_parts)]
        if target_fps and target_fps > 0: cmd += ["-r", str(int(target_fps))]
        if max_frames is not None: cmd += ["-frames:v", str(int(max_frames))]
        if drop_audio: cmd += ["-an"]
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
            "-pix_fmt", "yuv420p",
            out_path
        ]
        return cmd

    def build_x264_cmd() -> list[str]:
        vf_parts = []
        if vf_scale_cpu: vf_parts.append(vf_scale_cpu)
        cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin",
               "-y", "-i", in_path, "-threads", threads, "-filter_threads", filter_threads]
        if vf_parts: cmd += ["-vf", ",".join(vf_parts)]
        if target_fps and target_fps > 0: cmd += ["-r", str(int(target_fps))]
        if max_frames is not None: cmd += ["-frames:v", str(int(max_frames))]
        if drop_audio: cmd += ["-an"]
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
        if info and not resize_to and (not target_fps or target_fps <= 0):
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
                    debug.update({"pipeline": "gpu-enc", "encoder": "h264_nvenc"})
                except RuntimeError as e:
                    debug["nvenc_error"] = str(e)
            if not nvenc_success:
                _run_ffmpeg(build_x264_cmd())
                debug.update({"pipeline": "cpu-enc", "encoder": "libx264"})

        with open(out_path, "rb") as f:
            processed = f.read()
        return processed, debug

    finally:
        for p in (in_path, out_path):
            try:
                if p and os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass

# ---------------- 얼굴/시선 스트리밍 어댑터 ----------------

class FaceStream:
    """
    스트리밍 배치 추론 어댑터 (GPU)
    필요한 최소 훅(예시, face_service에 구현):
      - load_face_model(device) -> model
      - infer_face_batch(model, batch_tensor, return_points) -> list[dict]
      - finalize_face(accum_outputs) -> dict
    """
    def __init__(self, device: str = "cuda", stride: int = 1, return_points: bool = False, batch: int = 16):
        self.device = device
        self.stride = max(1, int(stride))
        self.return_points = return_points
        self.batch = batch
        self._frames: List[np.ndarray] = []
        self._idxs: List[int] = []
        self._ts: List[float] = []
        self.outputs: List[dict] = []

        self.ok = True
        self.model = None
        try:
            from app.services.face_service import load_face_model  # type: ignore
            self.model = load_face_model(self.device)
        except Exception as e:
            # 스트리밍 미구현 시에도 전체 파이프라인은 동작하게 함(결과는 비움)
            self.ok = False
            self.err = f"FaceStream disabled: {e}"

    def push(self, frame_rgb: np.ndarray, frame_idx: int, t_sec: float):
        if not self.ok: return
        if frame_idx % self.stride != 0: return
        self._frames.append(frame_rgb)
        self._idxs.append(frame_idx)
        self._ts.append(t_sec)
        if len(self._frames) >= self.batch:
            self._flush()

    def _flush(self):
        if not self.ok or not self._frames: return
        try:
            import torch
            arr = np.stack(self._frames, axis=0)  # (N,H,W,C)
            tens = torch.from_numpy(arr).permute(0,3,1,2).contiguous().to(self.device, non_blocking=True)
            tens = tens.half() if hasattr(tens, "half") else tens
            with torch.inference_mode():
                from app.services.face_service import infer_face_batch  # type: ignore
                outs = infer_face_batch(self.model, tens, self.return_points)
            # outs는 len == N인 list[dict] 형태라고 가정
            for i, o in enumerate(outs):
                o["frame_idx"] = int(self._idxs[i])
                o["t_sec"] = float(self._ts[i])
                self.outputs.append(o)
        except Exception as e:
            self.ok = False
            self.err = f"FaceStream flush error: {e}"
        finally:
            self._frames.clear()
            self._idxs.clear()
            self._ts.clear()

    def finalize(self) -> dict:
        if not self.ok:
            return {"enabled": False, "reason": getattr(self, "err", ""), "results": []}
        self._flush()
        try:
            from app.services.face_service import finalize_face  # type: ignore
            return finalize_face(self.outputs)
        except Exception:
            # 간단 요약으로 대체
            return {"enabled": True, "results": self.outputs}


class GazeStream:
    """
    스트리밍 배치 추론 어댑터 (GPU)
    필요한 최소 훅(예시, gaze_service에 구현):
      - load_gaze_model(device, calib_data) -> model
      - infer_gaze_batch(model, batch_tensor) -> list[dict]
      - finalize_gaze(accum_outputs) -> dict
    """
    def __init__(self, device: str = "cuda", stride: int = 1, calib_data: Optional[dict] = None, batch: int = 16):
        self.device = device
        self.stride = max(1, int(stride))
        self.batch = batch
        self.calib_data = calib_data or {}
        self._frames: List[np.ndarray] = []
        self._idxs: List[int] = []
        self._ts: List[float] = []
        self.outputs: List[dict] = []

        self.ok = True
        self.model = None
        try:
            from app.services.gaze_service import load_gaze_model  # type: ignore
            self.model = load_gaze_model(self.device, self.calib_data)
        except Exception as e:
            self.ok = False
            self.err = f"GazeStream disabled: {e}"

    def push(self, frame_rgb: np.ndarray, frame_idx: int, t_sec: float):
        if not self.ok: return
        if frame_idx % self.stride != 0: return
        self._frames.append(frame_rgb)
        self._idxs.append(frame_idx)
        self._ts.append(t_sec)
        if len(self._frames) >= self.batch:
            self._flush()

    def _flush(self):
        if not self.ok or not self._frames: return
        try:
            import torch
            arr = np.stack(self._frames, axis=0)
            tens = torch.from_numpy(arr).permute(0,3,1,2).contiguous().to(self.device, non_blocking=True)
            tens = tens.half() if hasattr(tens, "half") else tens
            with torch.inference_mode():
                from app.services.gaze_service import infer_gaze_batch  # type: ignore
                outs = infer_gaze_batch(self.model, tens)
            for i, o in enumerate(outs):
                o["frame_idx"] = int(self._idxs[i])
                o["t_sec"] = float(self._ts[i])
                self.outputs.append(o)
        except Exception as e:
            self.ok = False
            self.err = f"GazeStream flush error: {e}"
        finally:
            self._frames.clear()
            self._idxs.clear()
            self._ts.clear()

    def finalize(self) -> dict:
        if not self.ok:
            return {"enabled": False, "reason": getattr(self, "err", ""), "results": []}
        self._flush()
        try:
            from app.services.gaze_service import finalize_gaze  # type: ignore
            return finalize_gaze(self.outputs)
        except Exception:
            return {"enabled": True, "results": self.outputs}

# ---------------- 스트리밍 분석(단일 디코드) ----------------

def analyze_all_onepass(
    video_bytes: bytes,
    device: Optional[str] = None,
    # 스트라이드: posture는 낮게, face/gaze는 높게
    posture_stride: int = 2,   # 15fps → ~7.5fps
    face_stride: int = 1,      # 15fps → 15fps
    gaze_stride: int = 1,      # 15fps → 15fps
    # 리사이즈: posture는 작게, face/gaze는 크게
    posture_size: Tuple[int, int] = (288, 216),
    face_size: Tuple[int, int] = (512, 384),
    # 전처리 파라미터
    target_fps: int = 15,
    max_frames: int = 1500,
    return_debug: bool = False,
    reported_fps: int = 30,     # 프론트 표기를 위한 프레임 기준
    calib_data: Optional[dict] = None,
    return_points: bool = False,
) -> Dict[str, Any]:
    """
    - FFmpeg로 15fps 변환 → OpenCV로 1회 디코드
    - 루프 내에서 자세/얼굴/시선을 동시 처리
    - 결과는 초 + reported_fps(30fps) 프레임 기준도 함께 리턴
    """
    # 디바이스 확정
    if device is None:
        try:
            import torch  # type: ignore
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            device = "cpu"

    processed_bytes, dbg = preprocess_video_to_mp4_bytes(
        video_bytes=video_bytes,
        target_fps=target_fps,
        max_frames=max_frames,
        resize_to=None,       # 스트리밍에서 프레임별로 리사이즈
        keep_aspect=False,
        drop_audio=True,
    )

    # 임시 파일 저장 후 단일 VideoCapture
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(processed_bytes)
        path = tmp.name

    cap = cv2.VideoCapture(path)

    # MediaPipe Pose (CPU)
    pose_ctx = mp_mediapipe.solutions.pose.Pose(
        static_image_mode=False,
        min_detection_confidence=0.5,
        model_complexity=0,
        enable_segmentation=False,
        smooth_landmarks=True,
        min_tracking_confidence=0.5
    )

    # 얼굴/시선 스트리머(GPU)
    face_stream = FaceStream(device=device, stride=face_stride, return_points=return_points, batch=16)
    gaze_stream = GazeStream(device=device, stride=gaze_stride, calib_data=calib_data, batch=16)

    # 자세 결과 버퍼(프레임/라벨)
    sampled_frames: List[int] = []
    per_frame_labels: List[str] = []

    total_frames_read = 0
    analyzed_fps = float(target_fps)

    try:
        frame_idx = 0
        while True:
            ret, frame_bgr = cap.read()
            if not ret:
                break
            total_frames_read += 1

            # 타임스탬프(초)
            t_sec = frame_idx / analyzed_fps

            # posture (낮은 해상도/낮은 stride)
            if frame_idx % posture_stride == 0:
                f_small = cv2.resize(frame_bgr, posture_size, interpolation=cv2.INTER_LINEAR)
                rgb_small = cv2.cvtColor(f_small, cv2.COLOR_BGR2RGB)
                results = pose_ctx.process(rgb_small)
                feedbacks = []
                if results.pose_landmarks:
                    feedbacks = _extract_feedbacks(results.pose_landmarks.landmark, mp_mediapipe)
                label = _choose_label(feedbacks)
                sampled_frames.append(frame_idx)
                per_frame_labels.append(label)

            # face/gaze (GPU, 높은 해상도/stride)
            if (frame_idx % face_stride == 0) or (frame_idx % gaze_stride == 0):
                f_face = cv2.resize(frame_bgr, face_size, interpolation=cv2.INTER_LINEAR)
                rgb = cv2.cvtColor(f_face, cv2.COLOR_BGR2RGB)
                face_stream.push(rgb, frame_idx, t_sec)
                gaze_stream.push(rgb, frame_idx, t_sec)

            frame_idx += 1

    finally:
        cap.release()
        pose_ctx.close()
        try: os.remove(path)
        except Exception: pass

    # 자세 구간 압축
    if sampled_frames:
        posture_segments = _compress_runs(sampled_frames, per_frame_labels, step=posture_stride)
        # 초/30fps 변환
        def f2s(fr): return fr / analyzed_fps
        def f30(fr): return int(round(f2s(fr) * reported_fps))
        detailed_logs_seconds = [{
            "label": seg["label"],
            "start_s": f2s(seg["start_frame"]),
            "end_s": f2s(seg["end_frame"]),
        } for seg in posture_segments]
        detailed_logs_frames_reported = [{
            "label": seg["label"],
            "start_frame": f30(seg["start_frame"]),
            "end_frame": f30(seg["end_frame"]),
        } for seg in posture_segments]
        frame_distribution = {k: int(v) for k, v in dict(zip(per_frame_labels, [per_frame_labels.count(x) for x in per_frame_labels])).items()}
    else:
        posture_segments = []
        detailed_logs_seconds = []
        detailed_logs_frames_reported = []
        frame_distribution = {}

    # 얼굴/시선 최종화
    face_out = face_stream.finalize()   # dict
    gaze_out = gaze_stream.finalize()   # dict

    duration_s = total_frames_read / analyzed_fps if analyzed_fps else None
    total_frames_reported = int(round(duration_s * reported_fps)) if (duration_s and reported_fps) else None

    out: Dict[str, Any] = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "device": device,
        "posture": {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "total_frames": int(total_frames_read),
            "frame_distribution": frame_distribution,
            "detailed_logs": posture_segments,                  # 분석 프레임 기준
            "detailed_logs_seconds": detailed_logs_seconds,     # 초 기준
            "detailed_logs_frames_reported": detailed_logs_frames_reported,  # 30fps 기준
            "meta": {
                "analyzed_fps": analyzed_fps,
                "reported_fps": reported_fps,
                "posture_stride": posture_stride,
                "duration_s": duration_s
            },
            "total_frames_reported": total_frames_reported
        },
        "emotion": face_out,   # FaceStream.finalize() 포맷
        "gaze": gaze_out,      # GazeStream.finalize() 포맷
    }
    if return_debug:
        out["debug"] = {"preprocess": dbg}
    return out

# ---------------- (기존) 멀티 디코드 방식: 유지 ----------------

def analyze_all(
    video_bytes: bytes,
    device: Optional[str] = None,
    stride: int = 5,
    return_points: bool = False,
    calib_data: Optional[dict] = None,
    target_fps: int = 15,
    resize_to: Tuple[int, int] = (288, 216),
    max_frames: int = 1500,
    return_debug: bool = False,
):
    """
    기존 경로(참조용/백호환). 단, 디코드가 중복될 수 있음.
    """
    if device is None:
        try:
            import torch  # type: ignore
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            device = "cpu"

    processed_bytes, dbg = preprocess_video_to_mp4_bytes(
        video_bytes=video_bytes,
        target_fps=target_fps,
        max_frames=max_frames,
        resize_to=resize_to,
        keep_aspect=False,
        drop_audio=True,
    )

    # (기존 함수들은 내부에서 다시 디코드할 수 있음)
    from app.utils.posture import analyze_video_bytes as posture_bytes
    posture = posture_bytes(
        processed_bytes,
        mode="segments",
        sample_every=2,
        analyzed_fps=float(target_fps),
        reported_fps=30
    )
    face = infer_face_video(processed_bytes, device, stride, None, return_points)
    gaze = infer_gaze(processed_bytes, calib_data=calib_data)

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

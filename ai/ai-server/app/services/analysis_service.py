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
    target_fps: int = 30,
    max_frames: Optional[int] = 1800,
    resize_to: Optional[Tuple[int, int]] = (320, 240),
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
    threads = os.getenv("FFMPEG_THREADS", "2")
    filter_threads = os.getenv("FFMPEG_FILTER_THREADS", "1")
    x264_preset = os.getenv("X264_PRESET", "ultrafast")
    x264_crf = int(os.getenv("X264_CRF", "26"))
    
    # NVENC 최적화 옵션들
    nvenc_preset = os.getenv("NVENC_PRESET", "p1")  # p1(빠름) ~ p7(느림)
    nvenc_tune = os.getenv("NVENC_TUNE", "ll")      # ll(저지연), hq(고품질), ull(초저지연)
    nvenc_rc = os.getenv("NVENC_RC", "cbr")         # cbr, vbr, cqp
    nvenc_bitrate = os.getenv("NVENC_BITRATE", "2M")
    nvenc_maxrate = os.getenv("NVENC_MAXRATE", "2M")
    nvenc_bufsize = os.getenv("NVENC_BUFSIZE", "4M")

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
        # CPU 디코드 → (가능하면) hwupload_cuda, scale_cuda → NVENC
        vf_parts = []
        if resize_to and has_scale_cuda:
            vf_parts.append(f"hwupload_cuda,scale_cuda={w}:{h}")
        elif vf_scale_cpu:
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
            "-c:v", "h264_nvenc",
            "-preset", nvenc_preset,
            "-tune", nvenc_tune,
            "-rc", nvenc_rc,
            "-b:v", nvenc_bitrate,
            "-maxrate", nvenc_maxrate,
            "-bufsize", nvenc_bufsize,
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
            if has_nvenc:
                _run_ffmpeg(build_nvenc_cmd())
                debug.update({
                    "pipeline": "gpu-scale+enc" if has_scale_cuda else "gpu-enc",
                    "encoder": "h264_nvenc",
                    "scale": "scale_cuda" if has_scale_cuda else ("scale(cpu)" if resize_to else None),
                })
            else:
                _run_ffmpeg(build_x264_cmd())
                debug.update({"pipeline": "cpu", "encoder": "libx264", "scale": "scale(cpu)" if resize_to else None})

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
    # 변환 파라미터
    target_fps: int = 30,
    resize_to: Tuple[int, int] = (320, 240),
    max_frames: int = 1800,
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

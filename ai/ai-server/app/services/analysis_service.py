# - 직렬 처리(병렬 X)로 CPU 경합 최소
# - 해상도 960x540, 기본 fps 30
# - posture/face/gaze 모두 전 프레임 사용(stride=1)
# - CPU thread 1 강제 (OpenMP/MKL/BLAS/OpenCV/TensorFlow/PyTorch)
# - NVDEC -> scale_cuda/npp -> NVENC 우선, CPU fallback은 ALLOW_CPU_FALLBACK=1일 때만 허용
from __future__ import annotations

import os, json, shutil, subprocess, tempfile, time
from datetime import datetime
from typing import Optional, Tuple, Dict, Any, List

# ===== CPU thread caps (가능한 이른 시점) =====
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
os.environ.setdefault("TF_NUM_INTRAOP_THREADS", "1")
os.environ.setdefault("TF_NUM_INTEROP_THREADS", "1")

# bytes 경로 (호환)
from app.utils.posture import analyze_video_bytes
from app.services.gaze_service import infer_gaze, infer_gaze_frames
from app.services.face_service import infer_face_video, infer_face_frames

# frames 경로 지원 여부 확인
try:
    from app.utils.posture import analyze_video_frames  # type: ignore
except Exception:
    analyze_video_frames = None  # type: ignore


# ---------- helpers ----------
def _ts() -> str:
    return datetime.now().strftime("%H:%M:%S")

def _env_true(name: str, default: str = "0") -> bool:
    v = os.getenv(name, default)
    return str(v).lower() in ("1", "true", "yes", "on")


# ---------- ffmpeg utils ----------
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
        return (int(num) / int(den)) if int(den) else 0.0
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


# ---------- preprocess NVDEC→(scale_cuda/npp)→NVENC ----------
def preprocess_video_to_mp4_file(
    video_bytes: bytes,
    target_fps: int = 30,
    max_frames: Optional[int] = None,
    resize_to: Optional[Tuple[int, int]] = (960, 540),
    keep_aspect: bool = False,
    drop_audio: bool = True,
) -> tuple[str, Dict[str, Any]]:
    ffmpeg = _which_ffmpeg()
    threads = os.getenv("FFMPEG_THREADS", "1")
    filter_threads = os.getenv("FFMPEG_FILTER_THREADS", "1")
    x264_preset = os.getenv("X264_PRESET", "veryfast")
    x264_crf = int(os.getenv("X264_CRF", "28"))
    ff_loglvl = os.getenv("FFMPEG_LOGLEVEL", "error")

    nvenc_preset = os.getenv("NVENC_PRESET", "p1")
    nvenc_tune   = os.getenv("NVENC_TUNE", "ull")
    nvenc_rc     = os.getenv("NVENC_RC", "cbr")
    nvenc_bitrate= os.getenv("NVENC_BITRATE", "2.5M")
    nvenc_maxrate= os.getenv("NVENC_MAXRATE", "2.5M")
    nvenc_bufsize= os.getenv("NVENC_BUFSIZE", "5M")

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
        tmp_in.write(video_bytes)
        in_path = tmp_in.name
    out_path = in_path + "_processed.mp4"

    info = _ffprobe_soft(in_path)
    has_nvenc = _has(ffmpeg, "encoder", "h264_nvenc")
    has_scale_cuda = _has(ffmpeg, "filter", "scale_cuda") or _has(ffmpeg, "filter", "scale_npp")
    allow_cpu_fallback = _env_true("ALLOW_CPU_FALLBACK", "0")

    def _scale_vf():
        if not resize_to: return None
        w, h = int(resize_to[0]), int(resize_to[1])
        if keep_aspect:
            return f"scale={w}:{h}:flags=fast_bilinear"
        return f"scale={w}:{h}:flags=fast_bilinear"

    vf_scale_cpu = _scale_vf()

    def build_copy_cmd() -> list[str]:
        cmd = [ffmpeg, "-hide_banner", "-loglevel", ff_loglvl, "-nostdin", "-y", "-i", in_path]
        if drop_audio: cmd += ["-an"]
        else: cmd += ["-c:a", "copy"]
        cmd += ["-c:v", "copy", "-movflags", "+faststart", out_path]
        return cmd

    def build_nvenc_cmd() -> list[str]:
        cmd = [ffmpeg, "-hide_banner", "-loglevel", ff_loglvl, "-nostdin",
               "-hwaccel", "cuda", "-hwaccel_output_format", "cuda",
               "-y", "-i", in_path, "-threads", threads, "-filter_threads", filter_threads]
        vf_parts: List[str] = []
        if resize_to:
            w, h = int(resize_to[0]), int(resize_to[1])
            scaler = "scale_cuda" if _has(ffmpeg, "filter", "scale_cuda") else "scale_npp"
            vf_parts.append(f"{scaler}={w}:{h}")
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
            "-zerolatency", "1",
            "-forced-idr", "1",
            out_path
        ]
        return cmd

    def build_x264_cmd() -> list[str]:
        vf_parts: List[str] = []
        if vf_scale_cpu: vf_parts.append(vf_scale_cpu)
        cmd = [ffmpeg, "-hide_banner", "-loglevel", ff_loglvl, "-nostdin",
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
        "decoder": None,
        "scale": None,
        "cmd": None,
        "notes": [],
        "cpu_fallback_allowed": allow_cpu_fallback,
        "cpu_threads_caps": {
            "OMP": os.getenv("OMP_NUM_THREADS"),
            "MKL": os.getenv("MKL_NUM_THREADS"),
            "OPENBLAS": os.getenv("OPENBLAS_NUM_THREADS"),
            "NUMEXPR": os.getenv("NUMEXPR_NUM_THREADS"),
            "TF_INTRA": os.getenv("TF_NUM_INTRAOP_THREADS"),
            "TF_INTER": os.getenv("TF_NUM_INTEROP_THREADS"),
        },
    }

    try:
        can_copy = False
        if info and not resize_to and (not target_fps or target_fps <= 0) and (max_frames is None):
            can_copy = _can_remux_to_mp4_without_reencode(info, None, None)

        if can_copy:
            cmd = build_copy_cmd()
            debug.update({"pipeline": "copy", "encoder": "copy", "decoder": "copy", "scale": "n/a", "cmd": " ".join(cmd)})
            _run_ffmpeg(cmd)
        else:
            nvenc_success = False
            if has_nvenc:
                cmd = build_nvenc_cmd()
                debug.update({
                    "pipeline": "nvdec+scale_cuda+nvenc" if has_scale_cuda and resize_to else "nvdec+nvenc",
                    "encoder": "h264_nvenc",
                    "decoder": "nvdec",
                    "scale": ("scale_cuda/npp" if resize_to else None),
                    "cmd": " ".join(cmd)
                })
                try:
                    _run_ffmpeg(cmd); nvenc_success = True
                except RuntimeError as e:
                    debug["nvenc_error"] = str(e)

            if not nvenc_success:
                if allow_cpu_fallback:
                    cmd = build_x264_cmd()
                    debug.update({
                        "pipeline": "cpu-fallback",
                        "encoder": "libx264",
                        "decoder": "cpu",
                        "scale": "scale(cpu)" if resize_to else None,
                        "cmd": " ".join(cmd)
                    })
                    _run_ffmpeg(cmd)
                else:
                    debug.update({
                        "pipeline": "no-transcode (nvenc-missing, cpu-fallback-disabled)",
                        "encoder": "n/a",
                        "decoder": "n/a",
                        "scale": None,
                        "cmd": None,
                        "notes": debug.get("notes", []) + ["skipped transcode to avoid CPU usage"]
                    })
                    return in_path, debug

        return out_path, debug

    except Exception:
        debug.setdefault("notes", []).append("transcode failed; using original")
        return in_path, debug


# ---------- single-decode iterator ----------
class VideoFrameIterator:
    def __init__(self, mp4_path: str, stride: int = 1):
        self.mp4_path = mp4_path
        self.stride = max(1, int(stride))
    def __iter__(self):
        try:
            import cv2
            try: cv2.setNumThreads(0)
            except Exception: pass
            cap = cv2.VideoCapture(self.mp4_path)
            if not cap.isOpened(): raise RuntimeError("cv2.VideoCapture open failed")
            i = 0
            try:
                while True:
                    ok, bgr = cap.read()
                    if not ok: break
                    if (i % self.stride) == 0:
                        yield bgr[..., ::-1]  # BGR->RGB
                    i += 1
            finally:
                cap.release()
            return
        except Exception:
            pass
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


# ---------- meta fix ----------
def _fix_posture_meta(posture: Dict[str, Any], decoded_frames: int, fps_used: float) -> None:
    try:
        meta = posture.get("meta", {}) or {}
        meta["sample_every"] = 1
        meta["analyzed_fps"] = float(fps_used)
        meta["duration_s"] = float(decoded_frames / max(1e-6, fps_used))
        posture["meta"] = meta
    except Exception as e:
        print(f"[{_ts()}][POSTURE] meta fix skipped: {e}")


# ---------- orchestration (직렬 실행) ----------
def analyze_all(
    video_bytes: bytes,
    device: Optional[str] = None,
    stride: int = 1,
    return_points: bool = False,
    calib_data: Optional[dict] = None,
    target_fps: int = 30,
    resize_to: Tuple[int, int] = (960, 540),
    max_frames: Optional[int] = None,
    return_debug: bool = False,
    stream_mode: str = "auto",
):
    if device is None:
        try:
            import torch  # type: ignore
            device = "cuda" if torch.cuda.is_available() else "cpu"
            try: torch.set_num_threads(1)
            except Exception: pass
        except Exception:
            device = "cpu"

    mp4_path, dbg = preprocess_video_to_mp4_file(
        video_bytes=video_bytes,
        target_fps=target_fps,
        max_frames=max_frames,
        resize_to=resize_to,
        keep_aspect=False,
        drop_audio=True,
    )

    disable_gaze = _env_true("DISABLE_GAZE", "0")
    if disable_gaze:
        dbg.setdefault("notes", []).append("gaze: disabled via env")

    frames_api_ok = (analyze_video_frames is not None) and (infer_face_frames is not None)

    try:
        t0 = time.time()

        if stream_mode == "frames" or (stream_mode == "auto" and frames_api_ok):
            frames_all = list(VideoFrameIterator(mp4_path, stride=1))
            n_all = len(frames_all)
            fps_used = float(target_fps) if target_fps else 0.0

            posture = analyze_video_frames(frames_all)  # type: ignore
            _fix_posture_meta(posture, decoded_frames=n_all, fps_used=fps_used)

            face = infer_face_frames(frames_all, device=device, stride=1, return_points=return_points)  # type: ignore

            if disable_gaze:
                print(f"[{_ts()}][GAZE] disabled via env DISABLE_GAZE=1")
                gaze = {"status": "disabled", "reason": "env", "count": n_all}
            else:
                if calib_data:
                    dbg["gaze_calib_meta"] = {
                        "points": len(calib_data.get("calibration_points", [])),
                        "vectors": len(calib_data.get("calibration_vectors", [])),
                        "screen": calib_data.get("screen_settings") or {},
                    }
                    print(f"[{_ts()}][GAZE] enabled; calib points={dbg['gaze_calib_meta']['points']}, "
                          f"vectors={dbg['gaze_calib_meta']['vectors']}, "
                          f"screen={dbg['gaze_calib_meta']['screen']}")
                else:
                    print(f"[{_ts()}][GAZE] enabled; calib=NONE (will fallback)")
                try:
                    gaze = infer_gaze_frames(frames_all, calib_data=calib_data)  # type: ignore
                except Exception as e:
                    print(f"[{_ts()}][GAZE] disabled (exception): {e}")
                    gaze = {"status": "disabled", "error": str(e)}

            dbg.update({
                "analyze_mode": "single-decode/frames",
                "frames_api": True,
                "stride_face_gaze": 1,
                "postprocess_fps": target_fps,
                "effective_fps_face_gaze": target_fps,
                "frames_total_decoded": n_all,
                "timings_s": {"total": time.time() - t0},
                "parallel": False
            })

        else:
            with open(mp4_path, "rb") as f:
                processed_bytes = f.read()

            posture = analyze_video_bytes(processed_bytes)
            face = infer_face_video(processed_bytes, device, 1, None, return_points)

            if disable_gaze:
                print(f"[{_ts()}][GAZE] disabled via env DISABLE_GAZE=1")
                gaze = {"status": "disabled", "reason": "env"}
            else:
                if calib_data:
                    dbg["gaze_calib_meta"] = {
                        "points": len(calib_data.get("calibration_points", [])),
                        "vectors": len(calib_data.get("calibration_vectors", [])),
                        "screen": calib_data.get("screen_settings") or {},
                    }
                try:
                    gaze = infer_gaze(processed_bytes, calib_data=calib_data)
                except Exception as e:
                    print(f"[{_ts()}][GAZE] disabled (exception): {e}")
                    gaze = {"status": "disabled", "error": str(e)}

            dbg.update({
                "analyze_mode": "bytes(compat)",
                "frames_api": False,
                "stride_face_gaze": 1,
                "postprocess_fps": target_fps,
                "effective_fps_face_gaze": target_fps,
                "timings_s": {"total": time.time() - t0},
                "parallel": False
            })

        out: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "device": device,
            "stride": 1,
            "posture": posture,
            "emotion": face,
            "gaze": gaze,
        }
        if return_debug:
            out["debug"] = dbg
        return out

    finally:
        try:
            if os.path.exists(mp4_path): os.remove(mp4_path)
        except Exception:
            pass

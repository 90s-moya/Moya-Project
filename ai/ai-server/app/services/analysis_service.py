r# - GPU 디코드(NVDEC) → GPU 스케일(scale_cuda/npp) → NVENC
# - 직렬 처리(병렬 X)로 CPU 경합 최소
# - 기본 해상도 960x540, 기본 fps 30
# - posture/face 모두 전 프레임(stride=1)
# - CPU thread 1 강제 (OpenMP/MKL/BLAS/OpenCV/TensorFlow/PyTorch)
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
# [CPU-LOW] ffmpeg 스레드도 1로 고정
os.environ.setdefault("FFMPEG_THREADS", "1")
os.environ.setdefault("FFMPEG_FILTER_THREADS", "1")

# ====== logging helpers ======
_DEF_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()  # DEBUG | INFO | WARN | ERROR


def _ts() -> str:
    return datetime.now().strftime("%H:%M:%S")


def _log(level: str, tag: str, msg: str) -> None:
    levels = ["DEBUG", "INFO", "WARN", "ERROR"]
    cur = levels.index(_DEF_LOG_LEVEL) if _DEF_LOG_LEVEL in levels else 1
    want = levels.index(level) if level in levels else 1
    if want >= cur:
        print(f"[{_ts()}][{tag}][{level}] {msg}")


_log("INFO", "BOOT", f"OMP={os.getenv('OMP_NUM_THREADS')} MKL={os.getenv('MKL_NUM_THREADS')} "
                        f"OPENBLAS={os.getenv('OPENBLAS_NUM_THREADS')} TF_INTRA={os.getenv('TF_NUM_INTRAOP_THREADS')} "
                        f"TF_INTER={os.getenv('TF_NUM_INTEROP_THREADS')}")

# bytes 경로 (호환)
from app.utils.posture import analyze_video_bytes
# [GAZE-REMOVED] from app.services.gaze_service import infer_gaze, infer_gaze_frames
from app.services.face_service import infer_face_video, infer_face_frames

# frames 경로 지원 여부 확인
try:
    from app.utils.posture import analyze_video_frames  # type: ignore
    _log("INFO", "IMPORT", "analyze_video_frames FOUND")
except Exception as e:
    analyze_video_frames = None  # type: ignore
    _log("WARN", "IMPORT", f"analyze_video_frames NOT FOUND ({e})")


# ---------- helpers ----------
def _env_true(name: str, default: str = "0") -> bool:
    v = os.getenv(name, default)
    return str(v).lower() in ("1", "true", "yes", "on")


# ---------- ffmpeg helpers ----------
_ffmpeg_cap_cache: Dict[str, Dict[str, bool]] = {"encoder": {}, "filter": {}, "decoder": {}}
_ffmpeg_version_cache: Optional[str] = None


def _which(ffbin_env: str, fallback_names: list[str]) -> str:
    cand = []
    envv = os.getenv(ffbin_env)
    if envv:
        cand.append(envv)
    cand += fallback_names
    for name in cand:
        path = name if "/" in name else shutil.which(name or "")
        if path:
            _log("INFO", "FFMPEG", f"{ffbin_env} -> {path}")
            return path
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
        if not name:
            continue
        path = name if "/" in name else shutil.which(name)
        if path:
            _log("INFO", "FFPROBE", f"-> {path}")
            return path
    _log("WARN", "FFPROBE", "not found (soft)")
    return None


def _ffmpeg_version_once(ffmpeg: str) -> str:
    global _ffmpeg_version_cache
    if _ffmpeg_version_cache:
        return _ffmpeg_version_cache
    try:
        out = subprocess.check_output([ffmpeg, "-hide_banner", "-version"], text=True, stderr=subprocess.STDOUT)
        _ffmpeg_version_cache = (out.splitlines() or [""])[0]
        _log("INFO", "FFMPEG", f"version: {_ffmpeg_version_cache}")
    except Exception as e:
        _ffmpeg_version_cache = f"version: unknown ({e})"
        _log("WARN", "FFMPEG", _ffmpeg_version_cache)
    return _ffmpeg_version_cache


def _run_ffmpeg(cmd: list[str]) -> None:
    _log("INFO", "FFMPEG", f"RUN: {' '.join(cmd)}")
    t0 = time.time()
    res = subprocess.run(cmd, capture_output=True, text=True)
    dt = time.time() - t0
    if res.returncode != 0:
        stderr = (res.stderr or "").strip()
        if stderr:
            _log("ERROR", "FFMPEG", f"STDERR (last 40 lines) ->\n" + "\n".join(stderr.splitlines()[-40:]))
        raise RuntimeError(
            f"FFmpeg 실패(code={res.returncode}, {dt:.3f}s)\nCMD: {' '.join(cmd)}\nSTDERR:\n{stderr}"
        )
    if (res.stderr or "").strip():
        _log("DEBUG", "FFMPEG", "STDERR(non-fatal):\n" + "\n".join(res.stderr.strip().splitlines()[-40:]))
    if (res.stdout or "").strip():
        _log("DEBUG", "FFMPEG", "STDOUT:\n" + "\n".join(res.stdout.strip().splitlines()[-40:]))
    _log("INFO", "FFMPEG", f"OK ({dt:.3f}s)")


def _ffprobe_soft(in_path: str) -> dict:
    ffprobe = _which_ffprobe_soft()
    if not ffprobe:
        return {}
    args = [ffprobe, "-v", "error", "-show_streams", "-show_format",
            "-select_streams", "v:0", "-of", "json", in_path]
    try:
        out = subprocess.check_output(args, text=True)
        info = json.loads(out)
        v = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), {})
        _log("INFO", "FFPROBE",
             f"codec={v.get('codec_name')} pix_fmt={v.get('pix_fmt')} size={v.get('width')}x{v.get('height')} "
             f"rate={v.get('r_frame_rate')} fmt={(info.get('format',{}) or {}).get('format_name')}")
        return info
    except Exception as e:
        _log("WARN", "FFPROBE", f"failed: {e}")
        return {}


def _has(ffmpeg: str, kind: str, name: str) -> bool:
    # cached capability check to avoid repeated, heavy listings
    cache = _ffmpeg_cap_cache.get(kind, {})
    if name in cache:
        _log("DEBUG", "FFMPEG", f"has {kind} {name}? (cached) -> {cache[name]}")
        return cache[name]
    try:
        if kind == "encoder":
            out = subprocess.check_output([ffmpeg, "-v", "error", "-encoders"], text=True)
        elif kind == "filter":
            out = subprocess.check_output([ffmpeg, "-v", "error", "-filters"], text=True)
        elif kind == "decoder":
            out = subprocess.check_output([ffmpeg, "-v", "error", "-decoders"], text=True)
        else:
            return False
        ok = name in out
        cache[name] = ok
        _ffmpeg_cap_cache[kind] = cache
        _log("INFO", "FFMPEG", f"has {kind} {name}? -> {ok}")
        return ok
    except Exception as e:
        _log("WARN", "FFMPEG", f"has {kind} {name}? -> fail ({e})")
        return False


def _parse_fps(r_frame_rate: Optional[str]) -> float:
    if not r_frame_rate:
        return 0.0
    try:
        num, den = r_frame_rate.split("/")
        return (int(num) / int(den)) if int(den) else 0.0
    except Exception:
        return 0.0


def _can_remux_to_mp4_without_reencode(info: dict,
                                       want_size: Optional[Tuple[int, int]],
                                       want_fps: Optional[int]) -> Tuple[bool, List[str]]:
    reasons: List[str] = []
    fmt = (info.get("format") or {}).get("format_name", "")
    v = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), {})
    if not v:
        reasons.append("no video stream")
        return False, reasons
    is_mp4_like = any(x in fmt for x in ("mp4", "mov", "m4a"))
    if not is_mp4_like:
        reasons.append(f"container not mp4-like: {fmt}")
    is_h264 = (v.get("codec_name") == "h264")
    if not is_h264:
        reasons.append(f"codec not h264: {v.get('codec_name')}")
    is_420 = (v.get("pix_fmt") == "yuv420p")
    if not is_420:
        reasons.append(f"pix_fmt not yuv420p: {v.get('pix_fmt')}")
    if want_size:
        w, h = want_size
        if v.get("width") != int(w) or v.get("height") != int(h):
            reasons.append(f"size mismatch: {v.get('width')}x{v.get('height')} != {w}x{h}")
    if want_fps:
        cur = int(round(_parse_fps(v.get("r_frame_rate", "0/1"))))
        if cur != int(want_fps):
            reasons.append(f"fps mismatch: {cur} != {want_fps}")
    ok = is_mp4_like and is_h264 and is_420 and not reasons
    return ok, reasons


def _pick_cuvid_decoder(codec_name: str, ffmpeg_path: str) -> Optional[str]:
    """입력 코덱에 맞는 NVDEC(cuvid) 디코더 선택"""
    codec = (codec_name or "").lower()
    mapping = {
        "h264": "h264_cuvid",
        "hevc": "hevc_cuvid",
        "vp8": "vp8_cuvid",
        "vp9": "vp9_cuvid",
        "av1": "av1_cuvid",
        "mpeg2video": "mpeg2_cuvid",
        "mpeg4": "mpeg4_cuvid",
        "vc1": "vc1_cuvid",
        "h263": "h263_cuvid",
    }
    name = mapping.get(codec)
    if name and _has(ffmpeg_path, "decoder", name):
        return name
    return None


# ---------- preprocess: NVDEC → (scale_cuda/npp) → NVENC ----------
def preprocess_video_to_mp4_file(
    video_bytes: bytes,
    target_fps: int = 30,
    max_frames: Optional[int] = None,
    resize_to: Optional[Tuple[int, int]] = (960, 540),
    keep_aspect: bool = False,
    drop_audio: bool = True,
) -> tuple[str, Dict[str, Any]]:
    _log("INFO", "PRE", f"GPU-DECODE mode target_fps={target_fps} resize_to={resize_to} max_frames={max_frames}")
    ffmpeg = _which_ffmpeg()
    _ffmpeg_version_once(ffmpeg)

    # [CPU-LOW] 기본값 1로
    threads = os.getenv("FFMPEG_THREADS", "1")
    filter_threads = os.getenv("FFMPEG_FILTER_THREADS", "1")
    x264_preset = os.getenv("X264_PRESET", "veryfast")
    x264_crf = int(os.getenv("X264_CRF", "28"))
    ff_loglvl = os.getenv("FFMPEG_LOGLEVEL", "error")

    nvenc_preset = os.getenv("NVENC_PRESET", "p1")
    nvenc_tune = os.getenv("NVENC_TUNE", "ull")
    nvenc_rc = os.getenv("NVENC_RC", "cbr")
    nvenc_bitrate = os.getenv("NVENC_BITRATE", "2.5M")
    nvenc_maxrate = os.getenv("NVENC_MAXRATE", "2.5M")
    nvenc_bufsize = os.getenv("NVENC_BUFSIZE", "5M")

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
        tmp_in.write(video_bytes)
        in_path = tmp_in.name
    out_path = in_path + "_processed.mp4"
    _log("INFO", "PRE", f"temp in={in_path} out={out_path}")

    info = _ffprobe_soft(in_path)
    vstream = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), {})
    in_codec = (vstream or {}).get("codec_name", "")
    has_nvenc = _has(ffmpeg, "encoder", "h264_nvenc")
    has_scale_cuda = _has(ffmpeg, "filter", "scale_cuda")
    has_scale_npp = _has(ffmpeg, "filter", "scale_npp")
    cuvid_name = _pick_cuvid_decoder(in_codec, ffmpeg)
    allow_cpu_fallback = _env_true("ALLOW_CPU_FALLBACK", "0")
    require_nvdec = _env_true("REQUIRE_NVDEC", "1")  # 기본적으로 NVDEC 요구

    _log("INFO", "PRE", f"in_codec={in_codec} cuvid={cuvid_name} has_nvenc={has_nvenc} "
                          f"scale_cuda={has_scale_cuda} scale_npp={has_scale_npp} "
                          f"ALLOW_CPU_FALLBACK={allow_cpu_fallback} REQUIRE_NVDEC={require_nvdec}")

    def _scale_vf_sw():
        if not resize_to:
            return None
        w, h = int(resize_to[0]), int(resize_to[1])
        return f"scale={w}:{h}:flags=fast_bilinear"

    vf_scale_cpu = _scale_vf_sw()

    def build_copy_cmd() -> list[str]:
        cmd = [ffmpeg, "-hide_banner", "-loglevel", ff_loglvl, "-nostdin", "-y"]
        cmd += ["-i", in_path]
        if drop_audio:
            cmd += ["-an"]
        else:
            cmd += ["-c:a", "copy"]
        cmd += ["-c:v", "copy", "-movflags", "+faststart", out_path]
        return cmd

    def build_nvdec_nvenc_cmd() -> list[str]:
        """NVDEC(디코드) → (GPU)scale → NVENC(인코드)"""
        cmd = [ffmpeg, "-hide_banner", "-loglevel", ff_loglvl, "-nostdin"]
        cmd += ["-hwaccel", "cuda", "-hwaccel_output_format", "cuda"]
        if cuvid_name:
            cmd += ["-c:v", cuvid_name]
        cmd += ["-extra_hw_frames", "8"]
        cmd += ["-threads", threads, "-filter_threads", filter_threads]
        cmd += ["-y", "-i", in_path]

        vf_parts: List[str] = []
        if resize_to:
            w, h = int(resize_to[0]), int(resize_to[1])
            scaler = "scale_cuda" if has_scale_cuda else ("scale_npp" if has_scale_npp else None)
            if scaler is None:
                raise RuntimeError("Neither scale_cuda nor scale_npp is available with NVDEC path")
            vf_parts.append(f"{scaler}={w}:{h}")
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
            "-gpu", "0",  # 현재 사용하는 GPU 바꾸지 않음
            "-zerolatency", "1",
            "-forced-idr", "1",
            out_path
        ]
        return cmd

    def build_cpu_x264_cmd() -> list[str]:
        """CPU 디코드/스케일 → libx264(폴백)"""
        cmd = [ffmpeg, "-hide_banner", "-loglevel", ff_loglvl, "-nostdin",
               "-threads", threads, "-filter_threads", filter_threads,
               "-y", "-i", in_path]
        vf_parts: List[str] = []
        if vf_scale_cpu:
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
        "in_codec": in_codec,
        "cuvid_decoder": cuvid_name,
        "has_nvenc": has_nvenc,
        "has_scale_cuda": has_scale_cuda,
        "has_scale_npp": has_scale_npp,
        "target_fps": target_fps,
        "resize_to": resize_to,
        "max_frames": max_frames,
        "pipeline": None,
        "cmd": None,
        "notes": [],
        "cpu_fallback_allowed": allow_cpu_fallback,
    }

    try:
        can_copy = False
        copy_reasons: List[str] = []
        if info and not resize_to and (not target_fps or target_fps <= 0) and (max_frames is None):
            can_copy, copy_reasons = _can_remux_to_mp4_without_reencode(info, None, None)
        _log("INFO", "PRE", f"remux_copy_possible={can_copy}")
        if not can_copy and info:
            for r in (copy_reasons or []):
                _log("DEBUG", "PRE", f"copy-deny-reason: {r}")

        # === copy path ===
        if can_copy:
            cmd = build_copy_cmd()
            debug.update({"pipeline": "copy", "cmd": " ".join(cmd)})
            _run_ffmpeg(cmd)
            _log("INFO", "PRE", "COPY path OK (container/codec/pix_fmt already compatible)")
            return out_path, debug

        # === NVDEC 우선 경로 ===
        if has_nvenc:
            try:
                if not (has_scale_cuda or has_scale_npp) and resize_to:
                    raise RuntimeError("GPU scaler not available (scale_cuda/npp)")
                cmd = build_nvdec_nvenc_cmd()
                debug.update({"pipeline": "nvdec+gpu-scale+nvenc", "cmd": " ".join(cmd)})
                _run_ffmpeg(cmd)
                _log("INFO", "PRE", "GPU path OK (NVDEC → NVENC)")
                return out_path, debug
            except Exception as e:
                _log("WARN", "PRE", f"GPU path FAILED -> {e}")
                debug.setdefault("notes", []).append(f"nvdec/nvenc failed: {e}")
                if require_nvdec and not allow_cpu_fallback:
                    _log("WARN", "PRE", "REQUIRE_NVDEC=1 & ALLOW_CPU_FALLBACK=0 -> use original")
                    return in_path, debug

        # === CPU fallback (옵션) ===
        if allow_cpu_fallback:
            cmd = build_cpu_x264_cmd()
            debug.update({"pipeline": "cpu-fallback", "cmd": " ".join(cmd)})
            _run_ffmpeg(cmd)
            _log("INFO", "PRE", "CPU fallback OK")
            return out_path, debug

        debug.setdefault("notes", []).append("transcode skipped (no NVDEC/NVENC and fallback disabled)")
        _log("WARN", "PRE", "SKIP transcode -> use original")
        return in_path, debug

    except Exception as e:
        debug.setdefault("notes", []).append(f"transcode failed; using original ({e})")
        _log("ERROR", "PRE", f"TRANSCODE FAILED -> use original ({e})")
        return in_path, debug


# ---------- single-decode iterator (분석 단계: OpenCV/PyAV) ----------
class VideoFrameIterator:
    def __init__(self, mp4_path: str, stride: int = 1):
        self.mp4_path = mp4_path
        self.stride = max(1, int(stride))
        _log("INFO", "ITER", f"init path={mp4_path} stride={self.stride}")

    def __iter__(self):
        debug_frames = _env_true("DEBUG_FRAMES", "0")
        progress_every = int(os.getenv("LOG_FRAME_PROGRESS_INTERVAL", "0"))  # N프레임마다 로그(0=off)
        printed = 0
        try:
            import cv2
            try:
                cv2.setNumThreads(0)
            except Exception:
                pass
            _log("INFO", "ITER", f"OpenCV {cv2.__version__} (VideoCapture)")
            cap = cv2.VideoCapture(self.mp4_path)
            if not cap.isOpened():
                raise RuntimeError("cv2.VideoCapture open failed")
            i = 0
            fps = cap.get(getattr(cv2, 'CAP_PROP_FPS', 5)) or 0
            fcnt = int(cap.get(getattr(cv2, 'CAP_PROP_FRAME_COUNT', 7)) or 0)
            _log("INFO", "ITER", f"cv2 props: fps={fps} frames={fcnt}")
            try:
                while True:
                    ok, bgr = cap.read()
                    if not ok:
                        break
                    if (i % self.stride) == 0:
                        if debug_frames and printed < 3:
                            _log("DEBUG", "ITER", f"cv2 frame {i} shape={getattr(bgr, 'shape', None)}")
                            printed += 1
                        if progress_every > 0 and (i % progress_every) == 0 and i > 0:
                            _log("INFO", "ITER", f"decoded frames: {i}")
                        yield bgr[..., ::-1]  # BGR->RGB
                    i += 1
            finally:
                cap.release()
            _log("INFO", "ITER", f"cv2 done (decoded={i})")
            return
        except Exception as e:
            _log("WARN", "ITER", f"cv2 path failed -> {e}")

        try:
            import av  # type: ignore
            _log("INFO", "ITER", "PyAV path")
            i = 0
            with av.open(self.mp4_path) as c:
                for frame in c.decode(video=0):
                    if (i % self.stride) == 0:
                        arr = frame.to_ndarray(format="rgb24")
                        if debug_frames and printed < 3:
                            _log("DEBUG", "ITER", f"av frame {i} shape={getattr(arr, 'shape', None)}")
                            printed += 1
                        if progress_every > 0 and (i % progress_every) == 0 and i > 0:
                            _log("INFO", "ITER", f"decoded frames: {i}")
                        yield arr
                    i += 1
            _log("INFO", "ITER", f"PyAV done (decoded={i})")
            return
        except Exception as e:
            _log("ERROR", "ITER", f"PyAV path failed -> {e}")
            raise RuntimeError(f"VideoFrameIterator failed: {e}")


# ---------- posture meta fix ----------
def _fix_posture_meta(posture: Dict[str, Any], decoded_frames: int, fps_used: float) -> None:
    try:
        meta = posture.get("meta", {}) or {}
        meta["sample_every"] = 1
        meta["analyzed_fps"] = float(fps_used)
        meta["duration_s"] = float(decoded_frames / max(1e-6, fps_used))
        posture["meta"] = meta
        _log("INFO", "POSTURE", f"meta fixed frames={decoded_frames} fps={fps_used}")
    except Exception as e:
        _log("WARN", "POSTURE", f"meta fix skipped: {e}")


# ---------- orchestration (직렬 실행) ----------
def analyze_all(
    video_bytes: bytes,
    device: Optional[str] = None,
    stride: int = 1,
    return_points: bool = False,
    calib_data: Optional[dict] = None,  # [GAZE-REMOVED] 더 이상 사용하지 않음(호환 파라미터만 보존)
    target_fps: int = 30,
    resize_to: Tuple[int, int] = (960, 540),
    max_frames: Optional[int] = None,
    return_debug: bool = False,
    stream_mode: str = "auto",
):
    _log("INFO", "ENTRY", f"analyze_all target_fps={target_fps} resize_to={resize_to} stream_mode={stream_mode}")

    if device is None:
        try:
            import torch  # type: ignore
            device = "cuda" if torch.cuda.is_available() else "cpu"
            try:
                torch.set_num_threads(1)
            except Exception:
                pass
            _log("INFO", "DEVICE", f"torch ok cuda={torch.cuda.is_available()} device={device}")
            if device == "cuda":
                try:
                    _log("INFO", "DEVICE", f"GPU: {torch.cuda.get_device_name(0)}")
                except Exception:
                    pass
        except Exception as e:
            device = "cpu"
            _log("WARN", "DEVICE", f"torch not available -> CPU ({e})")

    _log("INFO", "ENV", f"ALLOW_CPU_FALLBACK={_env_true('ALLOW_CPU_FALLBACK','0')} "
                         f"REQUIRE_NVDEC={_env_true('REQUIRE_NVDEC','1')}")

    t_pre = time.time()
    mp4_path, dbg = preprocess_video_to_mp4_file(
        video_bytes=video_bytes,
        target_fps=target_fps,
        max_frames=max_frames,
        resize_to=resize_to,
        keep_aspect=False,
        drop_audio=True,
    )
    _log("INFO", "TIME", f"preprocess={time.time() - t_pre:.3f}s")

    frames_api_ok = (analyze_video_frames is not None) and (infer_face_frames is not None)
    _log("INFO", "PATH", f"frames_api_ok={frames_api_ok}")

    try:
        t0 = time.time()

        if stream_mode == "frames" or (stream_mode == "auto" and frames_api_ok):
            _log("INFO", "MODE", "single-decode FRAMES path")
            t_dec = time.time()
            frames_all = list(VideoFrameIterator(mp4_path, stride=1))
            n_all = len(frames_all)
            fps_used = float(target_fps) if target_fps else 0.0
            _log("INFO", "FRAMES", f"decoded={n_all} fps_used={fps_used} (decode_time={time.time()-t_dec:.3f}s)")

            t_pose = time.time()
            posture = analyze_video_frames(frames_all)  # type: ignore
            _fix_posture_meta(posture, decoded_frames=n_all, fps_used=fps_used)
            _log("INFO", "TIME", f"posture(frames)={time.time()-t_pose:.3f}s")

            t_face = time.time()
            face = infer_face_frames(frames_all, device=device, stride=1, return_points=return_points)  # type: ignore
            _log("INFO", "TIME", f"face(frames)={time.time()-t_face:.3f}s")

            dbg.update({
                "analyze_mode": "single-decode/frames",
                "frames_api": True,
                "stride_face": 1,
                "postprocess_fps": target_fps,
                "effective_fps_face": target_fps,
                "frames_total_decoded": n_all,
                "timings_s": {"total": time.time() - t0},
                "parallel": False
            })

        else:
            _log("INFO", "MODE", "BYTES(compat) path")
            with open(mp4_path, "rb") as f:
                processed_bytes = f.read()

            t_pose = time.time()
            posture = analyze_video_bytes(processed_bytes)
            _log("INFO", "TIME", f"posture(bytes)={time.time()-t_pose:.3f}s")

            t_face = time.time()
            face = infer_face_video(processed_bytes, device, 1, None, return_points)
            _log("INFO", "TIME", f"face(bytes)={time.time()-t_face:.3f}s")

            dbg.update({
                "analyze_mode": "bytes(compat)",
                "frames_api": False,
                "stride_face": 1,
                "postprocess_fps": target_fps,
                "effective_fps_face": target_fps,
                "timings_s": {"total": time.time() - t0},
                "parallel": False
            })

        out: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "device": device,
            "stride": 1,
            "posture": posture,
            "emotion": face,
            "gaze": None,  # [GAZE-REMOVED] 완전 제거(호환을 위해 None만 유지)
        }
        if return_debug:
            out["debug"] = dbg
            _log("INFO", "DEBUG", f"summary=\n{json.dumps(dbg, ensure_ascii=False, indent=2)}")

        _log("INFO", "DONE", f"analyze_all total={time.time()-t0:.3f}s mode={dbg.get('analyze_mode')}")
        return out

    finally:
        try:
            if os.path.exists(mp4_path):
                os.remove(mp4_path)
                _log("INFO", "CLEAN", f"removed {mp4_path}")
        except Exception as e:
            _log("WARN", "CLEAN", f"rm failed: {e}")

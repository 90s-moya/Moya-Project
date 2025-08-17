# 경량화 버전 (GPU 파이프라인 고정)
# - NVDEC → GPU 스케일(scale_cuda/npp) → (인퍼런스 직접)  
# - 가능한 한 MP4 인코딩 생략(프레임 파이프 기본)  
# - 직렬 처리 유지(병렬 X) + CPU 스레드 1 고정  
# - 기본 해상도 960x540, 기본 fps 30  
# - 성능 튜닝 포인트
#   * posture/face 각각 stride 적용(기본 posture=2, face=3)
#   * 프레임 파이프(USE_FAST_FRAMES=1)를 기본값으로 변경
#   * CPU 폴백 기본 비활성화(ALLOW_CPU_FALLBACK=0)
#   * 디버그에 실제 분석 프레임 수/유효 FPS 기록
#
# 환경 변수로 조정 가능:
#   USE_FAST_FRAMES=1|0
#   POSE_STRIDE=2  FACE_STRIDE=3
#   ALLOW_CPU_FALLBACK=0|1
#   FFMPEG_THREADS=1 FFMPEG_FILTER_THREADS=1 (이미 1로 고정)

from __future__ import annotations

import os, shutil, subprocess, tempfile, time
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
# 빠른 경로 기본 활성화
os.environ.setdefault("USE_FAST_FRAMES", "1")


def _ts() -> str:
    return datetime.now().strftime("%H:%M:%S")

print(f"[{_ts()}][BOOT] OMP={os.getenv('OMP_NUM_THREADS')} MKL={os.getenv('MKL_NUM_THREADS')} "
      f"OPENBLAS={os.getenv('OPENBLAS_NUM_THREADS')} TF_INTRA={os.getenv('TF_NUM_INTRAOP_THREADS')} "
      f"TF_INTER={os.getenv('TF_NUM_INTEROP_THREADS')}")

# bytes 경로 (호환)
from app.utils.posture import analyze_video_bytes
from app.services.face_service import infer_face_video, infer_face_frames

# frames 경로 지원 여부 확인
try:
    from app.utils.posture import analyze_video_frames  # type: ignore
    print(f"[{_ts()}][IMPORT] analyze_video_frames FOUND")
except Exception as e:
    analyze_video_frames = None  # type: ignore
    print(f"[{_ts()}][IMPORT] analyze_video_frames NOT FOUND ({e})")

# ---------- helpers ----------

def _env_true(name: str, default: str = "0") -> bool:
    v = os.getenv(name, default)
    return str(v).lower() in ("1", "true", "yes", "on")


def _which(ffbin_env: str, fallback_names: list[str]) -> str:
    cand = []
    envv = os.getenv(ffbin_env)
    if envv:
        cand.append(envv)
    cand += fallback_names
    for name in cand:
        path = name if "/" in name else shutil.which(name or "")
        if path:
            print(f"[{_ts()}][FFMPEG] {ffbin_env} -> {path}")
            return path
    raise RuntimeError(f"{ffbin_env} / ff binary not found among: {cand}")


def _which_ffmpeg() -> str:
    return _which("FFMPEG_BIN", [
        "/usr/local/bin/ffmpeg", "/opt/ffmpeg/bin/ffmpeg",
        "ffmpeg", "/usr/bin/ffmpeg"
    ])


# ---------- 빠른 MP4 변환 (NVDEC→GPU 스케일→NVENC, 실패 시 CPU 폴백) ----------
# 주: 경량화를 위해 기본 CPU 폴백을 비활성화(ALLOW_CPU_FALLBACK=0)

def preprocess_video_to_mp4_bytes(
    video_bytes: bytes,
    target_fps: int = 30,                  # 고정
    resize_to: Tuple[int, int] = (960, 540),# 고정
    max_frames: Optional[int] = None,
    drop_audio: bool = True,
) -> tuple[bytes, Dict[str, Any]]:
    """
    입력 바이트를 빠르게 MP4(h264, yuv420p)로 변환하여 '바이트'로 반환.
    - 1차: NVDEC + scale_cuda + h264_nvenc
    - 2차: NVDEC + scale_npp  + h264_nvenc
    - 3차: CPU scale + libx264   (ALLOW_CPU_FALLBACK=1 일 때만)
    """
    ffmpeg = _which_ffmpeg()
    threads = os.getenv("FFMPEG_THREADS", "1")
    filter_threads = os.getenv("FFMPEG_FILTER_THREADS", "1")
    ff_loglvl = os.getenv("FFMPEG_LOGLEVEL", "error")

    nvenc_preset = os.getenv("NVENC_PRESET", "p1")
    nvenc_tune   = os.getenv("NVENC_TUNE", "ull")
    nvenc_rc     = os.getenv("NVENC_RC", "cbr")
    nvenc_bitrate= os.getenv("NVENC_BITRATE", "2.5M")
    nvenc_maxrate= os.getenv("NVENC_MAXRATE", "2.5M")
    nvenc_bufsize= os.getenv("NVENC_BUFSIZE", "5M")

    # 성능 위주: 기본 0 (GPU 실패 시 전체가 매우 느려지는 것을 방지)
    allow_cpu_fallback = _env_true("ALLOW_CPU_FALLBACK", "0")

    # 입력 임시파일(파이프 동시 read/write 데드락 회피)
    with tempfile.NamedTemporaryFile(suffix=".in", delete=False) as tmp_in:
        tmp_in.write(video_bytes)
        in_path = tmp_in.name
    out_path = in_path + "_processed.mp4"

    base = [ffmpeg, "-hide_banner", "-loglevel", ff_loglvl, "-nostdin",
            "-threads", threads, "-filter_threads", filter_threads, "-y"]

    w, h = int(resize_to[0]), int(resize_to[1])

    def _run(cmd: list[str]):
        print(f"[{_ts()}][FFMPEG] RUN: {' '.join(cmd)}")
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            if res.stderr.strip():
                print(f"[{_ts()}][FFMPEG] STDERR:\n{res.stderr.strip()[-1200:]}")
            raise RuntimeError(f"ffmpeg failed rc={res.returncode}")
        if res.stderr.strip():
            print(f"[{_ts()}][FFMPEG] STDERR(non-fatal):\n{res.stderr.strip()[-800:]}")

    tries: List[list[str]] = []
    # 1) NVDEC + scale_cuda + NVENC
    tries.append(base + [
        "-hwaccel", "cuda", "-hwaccel_output_format", "cuda",
        "-extra_hw_frames", "8",
        "-i", in_path,
        "-vf", f"scale_cuda={w}:{h}",
        "-r", str(int(target_fps)),
        *( ["-frames:v", str(int(max_frames))] if max_frames is not None else [] ),
        *( ["-an"] if drop_audio else ["-c:a", "aac", "-b:a", "96k"] ),
        "-movflags", "+faststart",
        "-c:v", "h264_nvenc",
        "-preset", nvenc_preset,
        "-tune", nvenc_tune,
        "-rc", nvenc_rc,
        "-b:v", nvenc_bitrate, "-maxrate", nvenc_maxrate, "-bufsize", nvenc_bufsize,
        "-gpu", "0",
        "-pix_fmt", "yuv420p",
        "-g", "60", "-forced-idr", "1", "-zerolatency", "1",
        out_path
    ])
    # 2) NVDEC + scale_npp + NVENC
    tries.append(base + [
        "-hwaccel", "cuda", "-hwaccel_output_format", "cuda",
        "-extra_hw_frames", "8",
        "-i", in_path,
        "-vf", f"scale_npp={w}:{h}",
        "-r", str(int(target_fps)),
        *( ["-frames:v", str(int(max_frames))] if max_frames is not None else [] ),
        *( ["-an"] if drop_audio else ["-c:a", "aac", "-b:a", "96k"] ),
        "-movflags", "+faststart",
        "-c:v", "h264_nvenc",
        "-preset", nvenc_preset,
        "-tune", nvenc_tune,
        "-rc", nvenc_rc,
        "-b:v", nvenc_bitrate, "-maxrate", nvenc_maxrate, "-bufsize", nvenc_bufsize,
        "-gpu", "0",
        "-pix_fmt", "yuv420p",
        "-g", "60", "-forced-idr", "1", "-zerolatency", "1",
        out_path
    ])
    # 3) CPU fallback (옵션)
    if allow_cpu_fallback:
        tries.append(base + [
            "-i", in_path,
            "-vf", f"scale={w}:{h}:flags=fast_bilinear",
            "-r", str(int(target_fps)),
            *( ["-frames:v", str(int(max_frames))] if max_frames is not None else [] ),
            *( ["-an"] if drop_audio else ["-c:a", "aac", "-b:a", "96k"] ),
            "-movflags", "+faststart",
            "-pix_fmt", "yuv420p",
            "-c:v", "libx264",
            "-preset", os.getenv("X264_PRESET", "veryfast"),
            "-crf", os.getenv("X264_CRF", "28"),
            out_path
        ])

    info: Dict[str, Any] = {"pipeline": None, "cmd": None, "notes": []}
    out_bytes: Optional[bytes] = None
    last_err = None
    try:
        for i, cmd in enumerate(tries, 1):
            try:
                _run(cmd)
                info["pipeline"] = f"try#{i}"
                info["cmd"] = " ".join(cmd)
                with open(out_path, "rb") as f:
                    out_bytes = f.read()
                break
            except Exception as e:
                print(f"[{_ts()}][FFMPEG] try#{i} FAILED -> {e}")
                last_err = e
                continue
    finally:
        # 정리
        try:
            if os.path.exists(in_path):
                os.remove(in_path)
        except Exception:
            pass
        try:
            if os.path.exists(out_path):
                os.remove(out_path)
        except Exception:
            pass

    if out_bytes is not None:
        return out_bytes, info

    info["notes"].append(f"all attempts failed: {last_err}")
    # 실패 시 원본 그대로(해상도/fps 보장은 안되지만 최소한 결과는 나옴)
    return video_bytes, info


# ---------- (선택) 초고속: FFmpeg 파이프 → RGB 프레임 ----------

def _ffmpeg_read_frames_from_bytes(
    video_bytes: bytes,
    resize_to: Tuple[int, int] = (960, 540),
    target_fps: int = 30,
    max_frames: Optional[int] = None,
) -> List["np.ndarray"]:
    """
    NVDEC(+scale_cuda/npp) 또는 CPU scale로 rgb24 rawvideo를 파이프로 받아 프레임 리스트 반환.
    프레임 API 사용 시에만 호출(USE_FAST_FRAMES=1).
    """
    import numpy as np
    ffmpeg = _which_ffmpeg()
    threads = os.getenv("FFMPEG_THREADS", "1")
    filter_threads = os.getenv("FFMPEG_FILTER_THREADS", "1")
    ff_loglvl = os.getenv("FFMPEG_LOGLEVEL", "error")

    w, h = int(resize_to[0]), int(resize_to[1])
    frame_size = w * h * 3  # rgb24

    with tempfile.NamedTemporaryFile(suffix=".in", delete=False) as tmp_in:
        tmp_in.write(video_bytes)
        in_path = tmp_in.name

    common = [
        ffmpeg, "-hide_banner", "-loglevel", ff_loglvl, "-nostdin",
        "-threads", threads, "-filter_threads", filter_threads, "-y"
    ]
    tries = [
        # 1) scale_cuda (권장)
        ["-hwaccel", "cuda", "-hwaccel_output_format", "cuda", "-i", in_path,
         "-vf", f"scale_cuda={w}:{h},fps={int(target_fps)},hwdownload,format=rgb24",
         "-vsync", "0"],
        # 2) scale_npp
        ["-hwaccel", "cuda", "-hwaccel_output_format", "cuda", "-i", in_path,
         "-vf", f"scale_npp={w}:{h},fps={int(target_fps)},hwdownload,format=rgb24",
         "-vsync", "0"],
        # 3) CPU (최후)
        ["-i", in_path,
         "-vf", f"scale={w}:{h}:flags=fast_bilinear,fps={int(target_fps)},format=rgb24",
         "-vsync", "0"],
    ]
    if max_frames is not None:
        for t in tries:
            t += ["-frames:v", str(int(max_frames))]

    def _run_try(args: List[str]) -> List["np.ndarray"]:
        cmd = common + args + ["-an", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"]
        print(f"[{_ts()}][FFMPEG] RUN: {' '.join(cmd)}")
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=10**7)
        frames: List["np.ndarray"] = []
        try:
            while True:
                buf = proc.stdout.read(frame_size)  # type: ignore
                if not buf or len(buf) < frame_size:
                    break
                arr = np.frombuffer(buf, dtype=np.uint8).reshape((h, w, 3))
                frames.append(arr)
        finally:
            try:
                _, err = proc.communicate(timeout=5)
                if err and err.strip():
                    print(f"[{_ts()}][FFMPEG] STDERR: {err.decode(errors='ignore')[-800:]}".rstrip())
            except Exception:
                pass
        if proc.returncode not in (0, None):
            raise RuntimeError(f"ffmpeg returncode={proc.returncode}")
        return frames

    last_err = None
    try:
        for i, args in enumerate(tries, 1):
            try:
                frames = _run_try(args)
                if os.path.exists(in_path):
                    os.remove(in_path)
                if not frames:
                    raise RuntimeError("No frames produced")
                print(f"[{_ts()}][FFMPEG] path#{i} OK frames={len(frames)}")
                return frames
            except Exception as e:
                print(f"[{_ts()}][FFMPEG] path#{i} FAILED -> {e}")
                last_err = e
                continue
    finally:
        try:
            if os.path.exists(in_path):
                os.remove(in_path)
        except Exception:
            pass

    raise RuntimeError(f"All ffmpeg attempts failed: {last_err}")


# ---------- posture meta fix ----------

def _fix_posture_meta(posture: Dict[str, Any], decoded_frames: int, fps_used: float, sample_every: int = 1) -> None:
    try:
        meta = posture.get("meta", {}) or {}
        meta["sample_every"] = int(sample_every)
        meta["decoded_fps"] = float(fps_used)
        meta["effective_fps"] = float(fps_used / max(1, sample_every))
        meta["duration_s"] = float(decoded_frames / max(1e-6, fps_used))
        posture["meta"] = meta
        print(f"[{_ts()}][POSTURE] meta fixed frames={decoded_frames} fps={fps_used} stride={sample_every}")
    except Exception as e:
        print(f"[{_ts()}][POSTURE] meta fix skipped: {e}")


# ---------- orchestration (직렬 실행) ----------

def analyze_all(
    video_bytes: bytes,
    device: Optional[str] = None,
    stride: int = 1,  # deprecated (유지 호환)
    return_points: bool = False,
    calib_data: Optional[dict] = None,  # 호환 파라미터(미사용)
    target_fps: int = 30,               # 고정
    resize_to: Tuple[int, int] = (960, 540),  # 고정
    max_frames: Optional[int] = None,
    return_debug: bool = False,
    stream_mode: str = "auto",
    # === 경량화 추가 ===
    pose_stride: Optional[int] = None,  # None이면 환경변수 또는 기본값(2)
    face_stride: Optional[int] = None,  # None이면 환경변수 또는 기본값(3)
):
    print(f"[{_ts()}][ENTRY] analyze_all target_fps={target_fps} resize_to={resize_to} stream_mode={stream_mode}")

    # stride 기본값 결정(환경변수 우선)
    pose_stride = int(os.getenv("POSE_STRIDE", "2")) if pose_stride is None else int(pose_stride)
    face_stride = int(os.getenv("FACE_STRIDE", "3")) if face_stride is None else int(face_stride)
    pose_stride = max(1, pose_stride)
    face_stride = max(1, face_stride)

    # device 선택
    if device is None:
        try:
            import torch  # type: ignore
            device = "cuda" if torch.cuda.is_available() else "cpu"
            try:
                torch.set_num_threads(1)
            except Exception:
                pass
            print(f"[{_ts()}][DEVICE] torch ok cuda={torch.cuda.is_available()} device={device}")
            if device == "cuda":
                try:
                    print(f"[{_ts()}][DEVICE] GPU: {torch.cuda.get_device_name(0)}")
                except Exception:
                    pass
        except Exception as e:
            device = "cpu"
            print(f"[{_ts()}][DEVICE] torch not available -> CPU ({e})")

    frames_api_ok = (analyze_video_frames is not None) and (infer_face_frames is not None)
    use_fast_frames = _env_true("USE_FAST_FRAMES", "1")  # 기본 1로 변경
    print(f"[{_ts()}][PATH] frames_api_ok={frames_api_ok} USE_FAST_FRAMES={use_fast_frames} pose_stride={pose_stride} face_stride={face_stride}")

    t0 = time.time()
    dbg: Dict[str, Any] = {
        "mode": None,
        "timings_s": {},
        "stride_face": face_stride,
        "stride_pose": pose_stride,
        "postprocess_fps": target_fps,
        "effective_fps_face": max(0.1, target_fps / max(1, face_stride)),
        "effective_fps_pose": max(0.1, target_fps / max(1, pose_stride)),
        "parallel": False,
    }

    try:
        if (stream_mode == "frames") or (stream_mode == "auto" and frames_api_ok and use_fast_frames):
            # --- 초고속 모드: MP4 없이 바로 프레임 ---
            print(f"[{_ts()}][MODE] FAST frames")
            frames_all = _ffmpeg_read_frames_from_bytes(
                video_bytes=video_bytes, resize_to=resize_to, target_fps=target_fps, max_frames=max_frames
            )
            n_all = len(frames_all)
            fps_used = float(target_fps) if target_fps else 0.0

            # === 경량화: 모듈별 stride 샘플링 ===
            frames_pose = frames_all[::pose_stride]
            frames_face = frames_all[::face_stride]

            t_pose = time.time()
            # posture API가 프레임만 받으므로 직접 stride 반영
            posture = analyze_video_frames(frames_pose)  # type: ignore
            _fix_posture_meta(posture, decoded_frames=n_all, fps_used=fps_used, sample_every=pose_stride)
            dbg["timings_s"]["posture"] = time.time() - t_pose

            t_face = time.time()
            face = infer_face_frames(frames_face, device=device, stride=1, return_points=return_points)  # type: ignore
            dbg["timings_s"]["face"] = time.time() - t_face

            dbg.update({
                "mode": "fast_frames",
                "frames_total_decoded": n_all,
                "frames_pose": len(frames_pose),
                "frames_face": len(frames_face),
            })

        else:
            # --- 안전/호환 모드: 빠른 MP4 변환 후 bytes 경로 ---
            print(f"[{_ts()}][MODE] SAFE mp4-bytes")
            mp4_bytes, pre_info = preprocess_video_to_mp4_bytes(
                video_bytes=video_bytes,
                target_fps=target_fps,
                resize_to=resize_to,
                max_frames=max_frames,
            )
            dbg["preprocess"] = pre_info

            t_pose = time.time()
            # bytes 경로는 posture stride를 직접 전달할 수 없으므로 그대로 진행
            posture = analyze_video_bytes(mp4_bytes)
            _fix_posture_meta(posture, decoded_frames=int((max_frames or 0) or 0), fps_used=float(target_fps), sample_every=1)
            dbg["timings_s"]["posture"] = time.time() - t_pose

            t_face = time.time()
            # face는 stride 인자가 있으므로 경량화 적용
            face = infer_face_video(mp4_bytes, device, face_stride, None, return_points)
            dbg["timings_s"]["face"] = time.time() - t_face

            dbg.update({
                "mode": "mp4_bytes",
            })

        dbg["timings_s"]["total"] = time.time() - t0
        out: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "device": device,
            "stride": 1,  # legacy
            "posture": posture,
            "emotion": face,
            "gaze": None,  # gaze 제거 유지
        }
        if return_debug:
            out["debug"] = dbg
        print(f"[{_ts()}][DONE] total={dbg['timings_s']['total']:.3f}s mode={dbg['mode']}")
        return out

    except Exception as e:
        # 최후 보루: 원본 바이트로 분석 시도(해상도/fps 보장 X)
        print(f"[{_ts()}][WARN] main path failed -> fallback bytes ({e})")
        t_pose = time.time()
        posture = analyze_video_bytes(video_bytes)
        t_face = time.time()
        face = infer_face_video(video_bytes, device, face_stride, None, return_points)
        out: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "device": device,
            "stride": 1,
            "posture": posture,
            "emotion": face,
            "gaze": None,
        }
        if return_debug:
            out["debug"] = {"mode": "fallback_bytes", "error": str(e), "face_stride": face_stride}
        print(f"[{_ts()}][DONE] fallback bytes posture={time.time()-t_pose:.3f}s face={time.time()-t_face:.3f}s")
        return out

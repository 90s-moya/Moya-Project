# app/services/video_pipeline.py
# 목적:
# - 프론트(WebM 등) → 임시 MP4(H.264, yuv420p) 변환 (보관 X)
# - 변환본을 "한 번만" 디코딩해 프레임 리스트로 만들고, 세 모델이 공유
# - 가능하면 GPU(NVENC + scale_cuda/qsv) 사용, 불가 시 CPU 폴백(스레드 제한)
#
# 환경변수(옵션):
#   FFMPEG_BIN             : ffmpeg 바이너리 경로(기본 "ffmpeg")
#   FFPROBE_BIN            : ffprobe 바이너리 경로(기본 "ffprobe")
#   FFMPEG_THREADS         : 인코딩 스레드(기본 "2")
#   FFMPEG_FILTER_THREADS  : 필터 스레드(기본 "1")
#   X264_PRESET            : libx264 preset(기본 "ultrafast")
#   X264_CRF               : libx264 CRF(기본 "26")
#   FFMPEG_FORCE_HW        : "1" → 하드웨어 실패 시 CPU 폴백 금지 (바로 예외)
#   FFMPEG_PREFER_ORDER    : "h264_nvenc,h264_qsv,libx264"
#
# 필요 빌드 체크(컨테이너 내부):
#   ffmpeg -hide_banner -encoders | grep h264_nvenc
#   ffmpeg -hide_banner -filters  | grep -E 'scale_(cuda|npp|qsv)'

import os
import json
import shutil
import subprocess
import tempfile
from datetime import datetime
from typing import Optional, Tuple, Dict, Any, List

import numpy as np

# ----- 모델 임포트 -----
from app.utils.posture import analyze_video_bytes
from app.services.gaze_service import infer_gaze
from app.services.face_service import infer_face_video

# 프레임 입력 API가 있다면 사용(없으면 None)
try:
    from app.utils.posture import analyze_video_frames  # type: ignore
except Exception:
    analyze_video_frames = None  # type: ignore

try:
    from app.services.face_service import infer_face_frames  # type: ignore
except Exception:
    infer_face_frames = None  # type: ignore

try:
    from app.services.gaze_service import infer_gaze_frames  # type: ignore
except Exception:
    infer_gaze_frames = None  # type: ignore


# ---------- 공통 유틸 ----------

def _which_ffmpeg() -> str:
    path = shutil.which(os.getenv("FFMPEG_BIN", "ffmpeg"))
    if not path:
        raise RuntimeError("ffmpeg 실행 파일을 찾을 수 없습니다. 컨테이너/호스트에 ffmpeg를 설치하세요.")
    return path

def _which_ffprobe() -> str:
    path = shutil.which(os.getenv("FFPROBE_BIN", "ffprobe"))
    if not path:
        raise RuntimeError("ffprobe 실행 파일을 찾을 수 없습니다. 컨테이너/호스트에 ffprobe를 설치하세요.")
    return path

def _run_ffmpeg(cmd: list[str]) -> None:
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(
            f"FFmpeg 실패 (code={res.returncode})\n"
            f"CMD: {' '.join(cmd)}\n"
            f"STDERR:\n{(res.stderr or '').strip()}"
        )

def _out(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, text=True, errors="ignore")

def _has(ffmpeg: str, kind: str, name: str) -> bool:
    try:
        if kind == "encoder":
            return name in _out([ffmpeg, "-hide_banner", "-v", "error", "-encoders"])
        if kind == "decoder":
            return name in _out([ffmpeg, "-hide_banner", "-v", "error", "-decoders"])
        if kind == "filter":
            return name in _out([ffmpeg, "-hide_banner", "-v", "error", "-filters"])
    except Exception:
        pass
    return False

def _ffprobe(in_path: str) -> dict:
    ffprobe = _which_ffprobe()
    out = subprocess.check_output([
        ffprobe, "-v", "error",
        "-show_streams", "-show_format",
        "-select_streams", "v:0",
        "-of", "json", in_path
    ], text=True)
    return json.loads(out)

def _parse_fps(r_frame_rate: Optional[str]) -> float:
    if not r_frame_rate:
        return 0.0
    try:
        num, den = r_frame_rate.split("/")
        num_i, den_i = int(num), int(den)
        return (num_i / den_i) if den_i else 0.0
    except Exception:
        return 0.0

def _pick_encoder(ffmpeg_path: str) -> str:
    prefer_env = os.getenv("FFMPEG_PREFER_ORDER", "h264_nvenc,h264_qsv,libx264")
    prefer = [x.strip() for x in prefer_env.split(",") if x.strip()]
    try:
        encs = _out([ffmpeg_path, "-hide_banner", "-v", "error", "-encoders"])
    except Exception:
        return "libx264"

    def supported(name: str) -> bool:
        return name == "libx264" or (name in encs)

    for enc in prefer:
        if supported(enc):
            return enc
    return "libx264"


# ---------- remux 가능 여부 ----------

def _can_remux_to_mp4_without_reencode(info: dict,
                                       want_size: Optional[Tuple[int, int]],
                                       want_fps: Optional[int]) -> bool:
    fmt = (info.get("format") or {}).get("format_name", "")
    v = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), {})
    if not v:
        return False
    is_mp4_like = ("mp4" in fmt) or ("mov" in fmt) or ("m4a" in fmt)
    is_h264 = (v.get("codec_name") == "h264")
    is_420  = (v.get("pix_fmt") == "yuv420p")
    if not (is_mp4_like and is_h264 and is_420):
        return False
    if want_size:
        w, h = want_size
        if v.get("width") != int(w) or v.get("height") != int(h):
            return False
    if want_fps:
        cur_fps = int(round(_parse_fps(v.get("r_frame_rate", "0/1"))))
        if cur_fps != int(want_fps):
            return False
    return True


# ---------- 1) WebM → MP4(H.264) 변환 (임시, 보관 X) ----------

def preprocess_video_to_mp4_bytes(
    video_bytes: bytes,
    target_fps: int = 30,
    max_frames: Optional[int] = 1800,
    resize_to: Optional[Tuple[int, int]] = (320, 240),
    keep_aspect: bool = False,
    crf: int = 23,
    drop_audio: bool = True,
    return_debug: bool = False,
) -> bytes | tuple[bytes, Dict[str, Any]]:
    ffmpeg = _which_ffmpeg()
    preferred_encoder = _pick_encoder(ffmpeg)

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
        tmp_in.write(video_bytes)
        in_path = tmp_in.name
    out_path = in_path + "_processed.mp4"

    threads = os.getenv("FFMPEG_THREADS", "2")
    filter_threads = os.getenv("FFMPEG_FILTER_THREADS", "1")
    force_hw = os.getenv("FFMPEG_FORCE_HW", "0") == "1"

    info = _ffprobe(in_path)

    has_nvenc      = _has(ffmpeg, "encoder", "h264_nvenc")
    has_qsv        = _has(ffmpeg, "encoder", "h264_qsv")
    has_scale_cuda = _has(ffmpeg, "filter", "scale_cuda") or _has(ffmpeg, "filter", "scale_npp")
    has_scale_qsv  = _has(ffmpeg, "filter", "scale_qsv")

    v = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), {})
    codec_name = (v.get("codec_name") or "").lower()
    cuvid_map = {"h264": "h264_cuvid", "hevc": "hevc_cuvid", "vp9": "vp9_cuvid", "av1": "av1_cuvid"}
    qsv_dec_map = {"h264": "h264_qsv", "hevc": "hevc_qsv", "vp9": "vp9_qsv"}
    cuvid  = cuvid_map.get(codec_name, "")
    qsvdec = qsv_dec_map.get(codec_name, "")

    cpu_vf_filters = []
    if target_fps and target_fps > 0:
        cpu_vf_filters.append(f"fps={int(target_fps)}")
    if resize_to:
        w, h = int(resize_to[0]), int(resize_to[1])
        if keep_aspect:
            cpu_vf_filters.append(
                f"scale='if(gt(a,{w}/{h}),{w},-2)':'if(gt(a,{w}/{h}),-2,{h})':flags=fast_bilinear"
            )
        else:
            cpu_vf_filters.append(f"scale={w}:{h}:flags=fast_bilinear")
    cpu_vf = ",".join(cpu_vf_filters) if cpu_vf_filters else None

    used: Dict[str, Any] = {
        "stage": "preprocess",
        "pipeline": None, "decoder": None, "scale": None, "encoder": None,
        "input_codec": codec_name, "preferred_encoder": preferred_encoder
    }

    def build_copy_cmd() -> list[str]:
        cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", in_path]
        if drop_audio:
            cmd += ["-an"]
        else:
            cmd += ["-c:a", "copy"]
        cmd += ["-c:v", "copy", "-movflags", "+faststart", out_path]
        return cmd

    def build_cpu_cmd() -> list[str]:
        preset = os.getenv("X264_PRESET", "ultrafast")
        crf_val = int(os.getenv("X264_CRF", str(int(crf))))
        cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", in_path,
               "-threads", "1", "-filter_threads", filter_threads]
        if drop_audio:
            cmd += ["-an"]
        if cpu_vf:
            cmd += ["-vf", cpu_vf]
        if max_frames is not None:
            cmd += ["-frames:v", str(int(max_frames))]
        cmd += ["-pix_fmt", "yuv420p", "-movflags", "+faststart",
                "-c:v", "libx264", "-preset", preset, "-tune", "fastdecode",
                "-crf", str(crf_val),
                "-threads", "1",
                out_path]
        return cmd

    def build_nvenc_cmd(use_gpu_scale: bool) -> list[str]:
        vf_parts = []
        if resize_to:
            if use_gpu_scale:
                vf_parts += ["scale_cuda=%d:%d" % (w, h)]
                used["scale"] = "scale_cuda"
            else:
                vf_parts += [f"scale={w}:{h}:flags=fast_bilinear"]
                used["scale"] = "scale(cpu)"
        vf = ",".join(vf_parts) if vf_parts else None

        cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
               "-init_hw_device", "cuda=cuda:0", "-filter_hw_device", "cuda"]
        if cuvid and _has(ffmpeg, "decoder", cuvid):
            cmd += ["-c:v", cuvid]
            used["decoder"] = cuvid
        else:
            cmd += ["-hwaccel", "cuda", "-hwaccel_output_format", "cuda"]
            used["decoder"] = "hwaccel cuda"

        cmd += ["-i", in_path, "-threads", threads]
        if drop_audio:
            cmd += ["-an"]
        if vf:
            cmd += ["-vf", vf]
        if target_fps and target_fps > 0:
            cmd += ["-r", str(int(target_fps))]
        if max_frames is not None:
            cmd += ["-frames:v", str(int(max_frames))]
        cmd += ["-movflags", "+faststart",
                "-c:v", "h264_nvenc", "-preset", "fast",
                "-threads", threads,
                out_path]
        return cmd

    def build_qsv_cmd(use_gpu_scale: bool) -> list[str]:
        vf_parts = []
        if resize_to:
            if use_gpu_scale and has_scale_qsv:
                vf_parts += ["scale_qsv=%d:%d" % (w, h)]
                used["scale"] = "scale_qsv"
            else:
                vf_parts += [f"scale={w}:{h}:flags=fast_bilinear"]
                used["scale"] = "scale(cpu)"
        vf = ",".join(vf_parts) if vf_parts else None

        cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y"]
        if qsvdec and _has(ffmpeg, "decoder", qsvdec):
            cmd += ["-c:v", qsvdec]
            used["decoder"] = qsvdec
        else:
            cmd += ["-hwaccel", "qsv"]
            used["decoder"] = "hwaccel qsv"

        cmd += ["-i", in_path, "-threads", threads]
        if drop_audio:
            cmd += ["-an"]
        if vf:
            cmd += ["-vf", vf]
        if target_fps and target_fps > 0:
            cmd += ["-r", str(int(target_fps))]
        if max_frames is not None:
            cmd += ["-frames:v", str(int(max_frames))]
        cmd += ["-movflags", "+faststart",
                "-c:v", "h264_qsv", "-preset", "fast",
                "-threads", threads,
                out_path]
        return cmd

    try:
        # copy 경로
        if _can_remux_to_mp4_without_reencode(
            info, want_size=resize_to if (resize_to and not keep_aspect) else resize_to,
            want_fps=target_fps
        ) and not cpu_vf:
            _run_ffmpeg(build_copy_cmd())
            used.update({"pipeline": "copy", "encoder": "copy", "decoder": "copy", "scale": None})
        else:
            # 하드웨어 우선
            tried_hw = False
            if preferred_encoder == "h264_nvenc" and has_nvenc:
                tried_hw = True
                try:
                    _run_ffmpeg(build_nvenc_cmd(use_gpu_scale=bool(has_scale_cuda)))
                    used.update({"pipeline": "gpu", "encoder": "h264_nvenc"})
                except Exception as e:
                    if os.getenv("FFMPEG_FORCE_HW", "0") == "1":
                        raise RuntimeError("NVENC 필수 모드인데 사용 불가") from e

            if used["pipeline"] is None and preferred_encoder == "h264_qsv" and has_qsv:
                tried_hw = True
                try:
                    _run_ffmpeg(build_qsv_cmd(use_gpu_scale=bool(has_scale_qsv)))
                    used.update({"pipeline": "gpu", "encoder": "h264_qsv"})
                except Exception as e:
                    if os.getenv("FFMPEG_FORCE_HW", "0") == "1":
                        raise RuntimeError("QSV 필수 모드인데 사용 불가") from e

            if used["pipeline"] is None and not tried_hw:
                if has_nvenc:
                    try:
                        _run_ffmpeg(build_nvenc_cmd(use_gpu_scale=bool(has_scale_cuda)))
                        used.update({"pipeline": "gpu", "encoder": "h264_nvenc"})
                    except Exception:
                        pass
                if used["pipeline"] is None and has_qsv:
                    try:
                        _run_ffmpeg(build_qsv_cmd(use_gpu_scale=bool(has_scale_qsv)))
                        used.update({"pipeline": "gpu", "encoder": "h264_qsv"})
                    except Exception:
                        pass

            # CPU 폴백
            if used["pipeline"] is None:
                _run_ffmpeg(build_cpu_cmd())
                used.update({"pipeline": "cpu", "encoder": "libx264", "decoder": "cpu", "scale": used.get("scale") or "scale(cpu)"})

        with open(out_path, "rb") as f:
            data = f.read()
        return (data, used) if return_debug else data

    finally:
        for p in (in_path, out_path):
            try:
                if p and os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass


# ---------- 2) MP4 바이트 → 프레임 리스트 (단 한 번 디코딩) ----------

def decode_to_frames(
    mp4_bytes: bytes,
    size: Tuple[int, int] = (320, 240),
    fps: int = 30,
    max_frames: int = 1800,
    use_gpu_when_possible: bool = True,
) -> tuple[List[np.ndarray], Dict[str, Any]]:
    """
    MP4 바이트를 raw RGB24 프레임 리스트로 변환. 가능하면 CUDA 디코드/스케일 사용.
    반환:
      frames: [H,W,3] uint8
      debug : {'stage': 'decode', 'decoder': ..., 'scale': ..., 'fps': ..., 'frames_out': ...}
    """
    ffmpeg = _which_ffmpeg()
    has_scale_cuda = _has(ffmpeg, "filter", "scale_cuda") or _has(ffmpeg, "filter", "scale_npp")

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(mp4_bytes)
        in_path = tmp.name

    w, h = int(size[0]), int(size[1])
    frame_bytes = w * h * 3

    debug = {"stage": "decode", "decoder": None, "scale": None, "fps": fps, "frames_out": 0}
    try:
        if use_gpu_when_possible and has_scale_cuda:
            cmd = [
                ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
                "-init_hw_device", "cuda=cuda:0", "-filter_hw_device", "cuda",
                "-hwaccel", "cuda", "-hwaccel_output_format", "cuda",
                "-i", in_path,
                "-vf", f"scale_cuda={w}:{h}",
                "-r", str(int(fps)),
                "-f", "rawvideo", "-pix_fmt", "rgb24", "-"
            ]
            debug.update({"decoder": "hwaccel cuda", "scale": "scale_cuda"})
        else:
            cmd = [
                ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
                "-i", in_path,
                "-vf", f"scale={w}:{h}:flags=fast_bilinear",
                "-r", str(int(fps)),
                "-f", "rawvideo", "-pix_fmt", "rgb24", "-"
            ]
            debug.update({"decoder": "cpu", "scale": "scale(cpu)"})

        p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
        frames: List[np.ndarray] = []
        i = 0
        try:
            while True:
                if i >= max_frames:
                    break
                buf = p.stdout.read(frame_bytes)  # type: ignore
                if not buf or len(buf) < frame_bytes:
                    break
                frame = np.frombuffer(buf, dtype=np.uint8).reshape(h, w, 3)
                frames.append(frame)
                i += 1
        finally:
            if p.stdout:
                p.stdout.close()
            p.wait()

        debug["frames_out"] = len(frames)
        return frames, debug

    finally:
        try:
            os.remove(in_path)
        except Exception:
            pass


# ---------- 3) 전체 분석 파이프라인 ----------

def analyze_all(
    video_bytes: bytes,
    device: Optional[str] = None,
    stride: int = 5,
    return_points: bool = False,
    calib_data: Optional[dict] = None,
    target_fps: int = 30,
    resize_to: Tuple[int, int] = (320, 240),
    max_frames: int = 1800,
    return_debug: bool = True,
):
    """
    1) 입력(WebM/MP4)을 임시로 MP4(H.264, yuv420p, target_fps, resize_to)로 변환
    2) 변환본을 "한 번만" 디코딩해 프레임 리스트를 만들고(가능하면 GPU),
    3) 세 모델이 그 프레임을 공유해서 사용 (프레임 API 없으면 바이트 경로 폴백)
    """
    # device 자동 선택
    if device is None:
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            device = "cpu"

    # (1) 변환
    processed_data = preprocess_video_to_mp4_bytes(
        video_bytes=video_bytes,
        target_fps=target_fps,
        max_frames=max_frames,
        resize_to=resize_to,
        keep_aspect=False,
        crf=23,
        drop_audio=True,
        return_debug=True,
    )
    if isinstance(processed_data, tuple):
        mp4_bytes, dbg_pre = processed_data
    else:
        mp4_bytes, dbg_pre = processed_data, None

    # (2) 단일 디코딩 → 프레임 리스트
    frames, dbg_dec = decode_to_frames(
        mp4_bytes=mp4_bytes,
        size=resize_to,
        fps=target_fps // max(1, stride),   # stride만큼 샘플링 효과
        max_frames=max_frames // max(1, stride),
        use_gpu_when_possible=True,
    )

    # (3) 모델 호출
    # 3-1 자세
    if analyze_video_frames is not None:
        posture = analyze_video_frames(frames)  # type: ignore
        posture_path = "frames"
    else:
        posture = analyze_video_bytes(mp4_bytes)
        posture_path = "bytes"

    # 3-2 얼굴/감정
    if infer_face_frames is not None:
        face = infer_face_frames(frames, device=device, stride=1, return_points=return_points)  # type: ignore
        face_path = "frames"
    else:
        face = infer_face_video(mp4_bytes, device, stride, None, return_points)
        face_path = "bytes"

    # 3-3 시선
    if infer_gaze_frames is not None:
        gaze = infer_gaze_frames(frames, calib_data=calib_data)  # type: ignore
        gaze_path = "frames"
    else:
        gaze = infer_gaze(mp4_bytes, calib_data=calib_data)
        gaze_path = "bytes"

    result = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "device": device,
        "stride": stride,
        "posture": posture,
        "emotion": face,
        "gaze": gaze,
    }

    if return_debug:
        result["debug"] = {
            "preprocess": dbg_pre,
            "decode": dbg_dec,
            "model_paths": {
                "posture": posture_path,
                "face": face_path,
                "gaze": gaze_path,
            },
            "frames_info": {
                "count": len(frames),
                "shape": list(frames[0].shape) if frames else None,
                "dtype": str(frames[0].dtype) if frames else None,
            },
        }
    return result

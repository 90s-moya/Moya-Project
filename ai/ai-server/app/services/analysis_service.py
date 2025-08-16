# app/services/video_pipeline.py
# 목적:
# - 프론트에서 온 WebM(주로 VP8/VP9)을 일시적으로 MP4(H.264, yuv420p)로 변환하여
#   모델(infer_face_video / infer_gaze / analyze_video_bytes)에 전달.
# - 변환 파일은 디스크에 "영구 저장"하지 않음(임시 파일 사용 후 즉시 삭제).
# - CPU 100% 문제 완화를 위해: 가능한 경우 GPU 디코드/스케일 + 하드웨어 인코딩(NVENC/QSV/VideoToolbox),
#   불가시 libx264(ultrafast) 폴백 + 스레드 제한. 입력이 이미 조건을 만족하면 remux(copy) 경로.
#
# 환경변수(옵션):
#   FFMPEG_BIN             : ffmpeg 바이너리 경로(기본 "ffmpeg")
#   FFPROBE_BIN            : ffprobe 바이너리 경로(기본 "ffprobe")
#   FFMPEG_THREADS         : 인코딩/디코드 스레드(기본 "2")
#   FFMPEG_FILTER_THREADS  : 필터 스레드(기본 "1")
#   X264_PRESET            : libx264 preset(기본 "ultrafast")
#   X264_CRF               : libx264 CRF(기본 "26")
#   FFMPEG_FORCE_HW        : "1"이면 하드웨어 인코더 실패 시 CPU 폴백 금지(바로 예외)
#   FFMPEG_PREFER_ORDER    : 선호 인코더 우선순위(쉼표구분). 예: "h264_nvenc,h264_qsv,libx264"
#
# 팁:
# - 컨테이너에서 다음이 보여야 전처리 대부분을 GPU로 보냄:
#     ffmpeg -encoders | grep h264_nvenc
#     ffmpeg -filters  | grep -E 'scale_(cuda|npp|qsv)'
#   (없으면 스케일은 CPU로 돌아가 CPU가 튈 수 있음)
# - 실행은 반드시 GPU 권한: docker run --gpus all ...

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
    """FFmpeg 실행. 실패 시 STDERR를 예외 메시지로 올립니다."""
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
    """ffmpeg 기능 보유 여부 확인(kind: encoder/decoder/filter)."""
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
    """가능한 하드웨어 인코더를 우선 선택. 환경변수로 우선순위 커스터마이즈 지원."""
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
    """입력이 이미 MP4/H.264/yuv420p && 목표 해상도/프레임이면 -c copy로 remux만."""
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


# ---------- 변환(임시 파일 사용, 즉시 삭제) ----------

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
    """
    입력 바이트(WebM/MP4 등)를 임시 파일로 저장 → MP4(H.264, yuv420p)로 변환 → 결과 바이트 리턴.
    - 가능하면 GPU 디코드/스케일 + NVENC/QSV 인코드 경로를 우선 시도.
    - 실패 시 libx264(ultrafast)로 폴백하며 스레드/필터 스레드를 강하게 제한.
    - 입력이 이미 조건을 만족하면 remux(-c copy)로 재인코딩 생략.
    """
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

    # 가용 기능 체크
    has_nvenc     = _has(ffmpeg, "encoder", "h264_nvenc")
    has_qsv       = _has(ffmpeg, "encoder", "h264_qsv")
    has_scale_cuda= _has(ffmpeg, "filter", "scale_cuda") or _has(ffmpeg, "filter", "scale_npp")
    has_scale_qsv = _has(ffmpeg, "filter", "scale_qsv")

    # 입력 코덱 → cuvid/qsv 디코더 맵
    v = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), {})
    codec_name = (v.get("codec_name") or "").lower()
    cuvid_map = {"h264": "h264_cuvid", "hevc": "hevc_cuvid", "vp9": "vp9_cuvid", "av1": "av1_cuvid"}
    qsv_dec_map = {"h264": "h264_qsv", "hevc": "hevc_qsv", "vp9": "vp9_qsv"}
    cuvid = cuvid_map.get(codec_name, "")
    qsvdec = qsv_dec_map.get(codec_name, "")

    # 필터 구성 (CPU 필터 표현식; GPU 스케일을 쓰면 대체됨)
    cpu_vf_filters = []
    if target_fps and target_fps > 0:
        # fps는 CPU 필터보다 출력 -r이 더 가벼움 → CPU 경로에서만 필터 사용
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
                "-threads", "1",  # 인코더 스레드도 최소화
                out_path]
        return cmd

    def build_nvenc_cmd(use_gpu_scale: bool) -> list[str]:
        # GPU 경로: 가능하면 디코더/스케일/인코더 모두 GPU 사용.
        # fps 제한은 -vf fps 대신 출력 -r 사용(부담 ↓)
        vf_parts = []
        if resize_to:
            if use_gpu_scale:
                vf_parts += ["hwupload_cuda", f"scale_cuda={w}:{h}"]
                used["scale"] = "scale_cuda"
            else:
                vf_parts += [f"scale={w}:{h}:flags=fast_bilinear"]
                used["scale"] = "scale(cpu)"
        vf = ",".join(vf_parts) if vf_parts else "null"

        # 입력 디코더 지정: 가능한 경우 cuvid, 아니면 hwaccel
        cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y"]
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
        # QSV 경로(있다면). scale_qsv가 없으면 CPU 스케일.
        vf_parts = []
        if resize_to:
            if use_gpu_scale and has_scale_qsv:
                vf_parts += [f"scale_qsv={w}:{h}"]
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
        # 0) remux만으로 충분하면 재인코딩 없이 처리
        if _can_remux_to_mp4_without_reencode(
            info,
            want_size=resize_to if (resize_to and not keep_aspect) else resize_to,
            want_fps=target_fps
        ) and not cpu_vf:
            _run_ffmpeg(build_copy_cmd())
            used.update({"pipeline": "copy", "encoder": "copy", "scale": None, "decoder": "copy"})

        else:
            # 1) 하드웨어 경로 우선 (NVENC → QSV)
            tried_hw = False
            if preferred_encoder == "h264_nvenc" and has_nvenc:
                tried_hw = True
                try:
                    _run_ffmpeg(build_nvenc_cmd(use_gpu_scale=bool(has_scale_cuda)))
                    used.update({"pipeline": "gpu", "encoder": "h264_nvenc"})
                except Exception as e:
                    if force_hw:
                        raise RuntimeError("NVENC 필수 모드인데 사용 불가") from e

            if used["pipeline"] is None and (preferred_encoder == "h264_qsv" and has_qsv):
                tried_hw = True
                try:
                    _run_ffmpeg(build_qsv_cmd(use_gpu_scale=bool(has_scale_qsv)))
                    used.update({"pipeline": "gpu", "encoder": "h264_qsv"})
                except Exception as e:
                    if force_hw:
                        raise RuntimeError("QSV 필수 모드인데 사용 불가") from e

            # 2) 하드웨어 우선 엔코더가 없고 NVENC/QSV 중 하나라도 존재하면 NVENC→QSV 순으로 보조 시도
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

            # 3) CPU 폴백
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


# ---------- 분석 파이프라인(모델 호출) ----------

def analyze_all(
    video_bytes: bytes,
    device: Optional[str] = None,
    stride: int = 5,
    return_points: bool = False,
    calib_data: Optional[dict] = None,
    # 변환 파라미터(모델이 안정적으로 먹는 해상도/프레임으로 맞추기)
    target_fps: int = 30,
    resize_to: Tuple[int, int] = (320, 240),
    max_frames: int = 1800,
    return_debug: bool = True,  # 디폴트로 디버그도 반환해서 실제 경로 확인
):
    """
    - 입력(WebM/MP4)을 임시로 MP4(H.264, yuv420p, target_fps, resize_to)로 맞춘 뒤
      자세/표정/시선 모델에 전달하고, 결과를 dict로 반환.
    - 중간 MP4 파일은 디스크에 남기지 않음(임시 후 즉시 삭제).
    """
    # device 자동 선택(CUDA 가능하면 cuda, 아니면 cpu)
    if device is None:
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            device = "cpu"

    processed = preprocess_video_to_mp4_bytes(
        video_bytes=video_bytes,
        target_fps=target_fps,
        max_frames=max_frames,
        resize_to=resize_to,
        keep_aspect=False,   # 모델 입력 고정 크기 권장
        crf=23,
        drop_audio=True,
        return_debug=True,
    )
    if isinstance(processed, tuple):
        processed_bytes, dbg = processed
    else:
        processed_bytes, dbg = processed, None

    # 아래 모델 함수들은 기존과 동일한 시그니처로 바이트 입력을 받는다고 가정
    posture = analyze_video_bytes(processed_bytes)
    face = infer_face_video(processed_bytes, device, stride, None, return_points)
    gaze = infer_gaze(processed_bytes, calib_data=calib_data)

    result = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "device": device,
        "stride": stride,
        "posture": posture,
        "emotion": face,
        "gaze": gaze,
    }
    if return_debug:
        result["debug"] = dbg
    return result

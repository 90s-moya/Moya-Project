# app/services/video_pipeline.py
# 목적:
# - 프론트에서 온 WebM(주로 VP8/VP9)을 일시적으로 MP4(H.264, yuv420p)로 변환하여
#   모델(infer_face_video / infer_gaze / analyze_video_bytes)에 전달.
# - 변환 파일은 디스크에 "영구 저장"하지 않음(임시 파일 사용 후 즉시 삭제).
# - CPU 100% 문제 완화를 위해: 하드웨어 인코딩(NVENC/QSV/VideoToolbox) 우선, 불가시 libx264(ultrafast),
#   스레드 제한, 가벼운 스케일러 적용. 입력이 이미 조건을 만족하면 remux(copy) 경로.
#
# 환경변수(옵션):
#   FFMPEG_BIN             : ffmpeg 바이너리 경로(기본 "ffmpeg")
#   FFPROBE_BIN            : ffprobe 바이너리 경로(기본 "ffprobe")
#   FFMPEG_THREADS         : 인코딩 스레드 개수(기본 "2")
#   FFMPEG_FILTER_THREADS  : 필터 스레드 개수(기본 "1")
#   X264_PRESET            : libx264 preset(기본 "ultrafast")
#   X264_CRF               : libx264 CRF(기본 "26")
#   FFMPEG_FORCE_HW        : "1"이면 하드웨어 인코더 실패 시 CPU 폴백 금지(바로 예외)
#   FFMPEG_PREFER_ORDER    : 선호 인코더 우선순위(쉼표구분). 예: "h264_videotoolbox,h264_nvenc,h264_qsv,libx264"
#
# 주의:
# - 파이프(stdout)로 MP4를 흘리려면 fragmented MP4가 필요할 수 있어 호환성 이슈가 취급됩니다.
#   모델 호환성을 위해 임시 파일을 만들고 +faststart로 moov를 앞당긴 뒤 바이트로 읽고 바로 삭제합니다.
# - 크롬/엣지의 MediaRecorder 기본 출력은 WebM(VP8/VP9)이므로 MP4 저장 정책이면 재인코딩이 필요합니다.
#   사파리에서 온 MP4/H.264는 조건 충족 시 copy 경로로 CPU 부담이 매우 낮습니다.

import os
import json
import shutil
import subprocess
import tempfile
from datetime import datetime
from typing import Optional, Tuple

from app.utils.posture import analyze_video_bytes
from app.services.gaze_service import infer_gaze
from app.services.face_service import infer_face_video


# ---------- FFmpeg / FFprobe 유틸 ----------

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
            f"STDERR:\n{res.stderr.strip()}"
        )

def _ffprobe(in_path: str) -> dict:
    ffprobe = _which_ffprobe()
    out = subprocess.check_output([
        ffprobe, "-v", "error",
        "-show_streams", "-show_format",
        "-select_streams", "v:0",
        "-of", "json", in_path
    ], text=True)
    return json.loads(out)

def _pick_encoder(ffmpeg_path: str) -> str:
    """가능한 하드웨어 인코더를 우선 선택. 환경변수로 우선순위 커스터마이즈 지원."""
    prefer_env = os.getenv(
        "FFMPEG_PREFER_ORDER",
        # macOS(로컬) > NVIDIA > Intel > CPU
        "h264_videotoolbox,h264_nvenc,h264_qsv,libx264"
    )
    prefer = [x.strip() for x in prefer_env.split(",") if x.strip()]

    try:
        out = subprocess.check_output(
            [ffmpeg_path, "-hide_banner", "-v", "error", "-encoders"],
            text=True
        )
    except Exception:
        return "libx264"

    def supported(name: str) -> bool:
        return name == "libx264" or (name in out)

    for enc in prefer:
        if supported(enc):
            return enc
    return "libx264"


# ---------- 변환 필요성 판단 ----------

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
    """입력이 이미 MP4/H.264/yuv420p && 목표 해상도/프레임이면 -c copy로 remux만."""
    fmt = (info.get("format") or {}).get("format_name", "")  # e.g., "mov,mp4,m4a,3gp,3g2,mj2"
    v = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), {})
    if not v:
        return False

    # 컨테이너/코덱/픽셀포맷 체크
    is_mp4_like = ("mp4" in fmt) or ("mov" in fmt) or ("m4a" in fmt)
    is_h264 = (v.get("codec_name") == "h264")
    is_420 = (v.get("pix_fmt") == "yuv420p")

    if not (is_mp4_like and is_h264 and is_420):
        return False

    # 해상도/프레임
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
) -> bytes:
    """
    입력 바이트(WebM/MP4 등)를 임시 파일로 저장 → MP4(H.264, yuv420p)로 변환 → 결과 바이트 리턴.
    출력 파일은 읽은 직후 즉시 삭제합니다(보관하지 않음).
    - 하드웨어 인코더(NVENC/QSV/VideoToolbox) 우선 사용, 실패 시 libx264(ultrafast) 폴백(또는 강제 실패).
    - 입력이 이미 MP4/H.264/yuv420p이고 해상도/프레임이 목표와 같으면 remux(-c copy) 경로로 재인코딩 생략.
    """
    ffmpeg = _which_ffmpeg()
    preferred_encoder = _pick_encoder(ffmpeg)

    # 입력 임시 파일(확장자는 포맷 검출에 큰 영향 없음. 다만 WebM이 대부분이라 .webm 사용)
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
        tmp_in.write(video_bytes)
        in_path = tmp_in.name

    out_path = in_path + "_processed.mp4"

    threads = os.getenv("FFMPEG_THREADS", "2")
    filter_threads = os.getenv("FFMPEG_FILTER_THREADS", "1")
    force_hw = os.getenv("FFMPEG_FORCE_HW", "0") == "1"

    # ffprobe로 입력 검사
    info = _ffprobe(in_path)

    # VF 필터 구성
    vf_filters = []
    if target_fps and target_fps > 0:
        vf_filters.append(f"fps={int(target_fps)}")
    if resize_to:
        w, h = int(resize_to[0]), int(resize_to[1])
        if keep_aspect:
            # 종횡비 유지 스케일(가벼운 보간)
            vf_filters.append(
                f"scale='if(gt(a,{w}/{h}),{w},-2)':'if(gt(a,{w}/{h}),-2,{h})':flags=fast_bilinear"
            )
        else:
            vf_filters.append(f"scale={w}:{h}:flags=fast_bilinear")

    vf = ",".join(vf_filters) if vf_filters else None

    def build_transcode_cmd(encoder: str) -> list[str]:
        cmd = [
            ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin",
            "-y", "-i", in_path,
            "-threads", threads,
            "-filter_threads", filter_threads,
        ]
        if drop_audio:
            cmd += ["-an"]
        if vf:
            cmd += ["-vf", vf]
        if max_frames is not None:
            cmd += ["-frames:v", str(int(max_frames))]
        cmd += [
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-c:v", encoder,
        ]
        if encoder == "libx264":
            # CPU 부담 최소화(품질보다 속도/부하 우선)
            preset = os.getenv("X264_PRESET", "ultrafast")
            crf_val = int(os.getenv("X264_CRF", str(int(crf))))
            cmd += ["-preset", preset, "-crf", str(crf_val)]
        elif encoder in ("h264_nvenc", "h264_qsv", "h264_videotoolbox"):
            # 하드웨어 인코더 공통(세부 튜닝은 환경에 맞게 추가 가능)
            cmd += ["-preset", "fast"]
        cmd += [out_path]
        return cmd

    def build_copy_cmd() -> list[str]:
        # 필터가 하나라도 걸리면 copy 불가 → 이 경로는 vf가 없는 경우에만 사용해야 함.
        # 여기서는 _can_remux_to_mp4_without_reencode에서 이미 필터 불필요 조건을 체크합니다.
        cmd = [
            ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin",
            "-y", "-i", in_path,
        ]
        if drop_audio:
            cmd += ["-an"]
        else:
            # 오디오도 복사하려면 MP4 호환(AAC 등)이어야 함.
            cmd += ["-c:a", "copy"]
        cmd += ["-c:v", "copy", "-movflags", "+faststart", out_path]
        return cmd

    try:
        # 1) 조건 충족 시 재인코딩 없이 remux(copy)
        if _can_remux_to_mp4_without_reencode(
            info,
            want_size=resize_to if (resize_to and not keep_aspect) else resize_to,  # keep_aspect True라도 정확 픽셀 요구 시 copy 불가
            want_fps=target_fps
        ) and not vf:
            _run_ffmpeg(build_copy_cmd())
        else:
            # 2) 하드웨어 인코딩 우선
            try:
                _run_ffmpeg(build_transcode_cmd(preferred_encoder))
            except RuntimeError as e:
                if force_hw and preferred_encoder != "libx264":
                    # 하드웨어 인코딩 강제 모드면 CPU 폴백 안 함
                    raise RuntimeError(
                        "하드웨어 인코딩이 필요하지만 사용 불가: 런타임/드라이버/빌드 설정을 확인하세요."
                    ) from e
                # 3) CPU(libx264) 폴백
                if preferred_encoder != "libx264":
                    _run_ffmpeg(build_transcode_cmd("libx264"))
                else:
                    raise

        # 결과 바이트로 읽어 반환
        with open(out_path, "rb") as f:
            return f.read()

    finally:
        # 임시 파일/출력 파일 정리(보관하지 않음)
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

    processed_bytes = preprocess_video_to_mp4_bytes(
        video_bytes=video_bytes,
        target_fps=target_fps,
        max_frames=max_frames,
        resize_to=resize_to,
        keep_aspect=False,   # 모델 입력을 고정 크기로 강제
        crf=23,
        drop_audio=True,
    )

    # 아래 모델 함수들은 기존과 동일한 시그니처로 바이트 입력을 받는다고 가정
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

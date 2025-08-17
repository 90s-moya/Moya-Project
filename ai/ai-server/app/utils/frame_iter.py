# app/utils/frame_iter.py
import cv2
import tempfile
import os
import torch
import torch.nn.functional as F
from typing import Iterator, List, Tuple, Optional

def _torch_resize_rgb(rgb_uint8, dev, resize_to: Tuple[int, int]) -> "np.ndarray":
    """
    rgb_uint8: HxWx3 uint8 (CPU)
    returns: resized HxWx3 uint8 (CPU)
    """
    t = torch.from_numpy(rgb_uint8).to(dev, non_blocking=True)          # H,W,3
    t = t.permute(2, 0, 1).unsqueeze(0).float() / 255.0                 # 1,3,H,W
    t = F.interpolate(t, size=(resize_to[1], resize_to[0]),
                      mode="bilinear", align_corners=False)
    out = (t.squeeze(0).clamp(0, 1) * 255.0).byte().permute(1, 2, 0).to("cpu").numpy()
    return out

def iter_frames_from_bytes(
    video_bytes: bytes,
    target_fps: int = 30,
    resize_to: Tuple[int, int] = (960, 540),
    max_frames: int = 1800,
    bgr: bool = True,
) -> Iterator["np.ndarray"]:
    """
    업로드된 비디오 바이트를 30fps / resize_to 로 샘플링한 프레임 스트림으로 변환.
    - OpenCV 디코딩은 1회만 수행
    - 리사이즈는 Torch로 (GPU 사용 가능)
    - 반환 프레임은 BGR(default) 또는 RGB 선택
    """
    # OpenCV CPU 과점 방지
    cv2.setNumThreads(1)

    # 임시 저장 (webm도 ok)
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    cap = cv2.VideoCapture(tmp_path)
    if not cap.isOpened():
        cap.release()
        # webm 실패 대비 mp4 시도
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp2:
            tmp2.write(video_bytes)
            alt_path = tmp2.name
        cap = cv2.VideoCapture(alt_path)
        if not cap.isOpened():
            try:
                os.remove(tmp_path)
            except OSError:
                pass
            try:
                os.remove(alt_path)
            except OSError:
                pass
            raise RuntimeError("비디오 파일을 열 수 없습니다.")

        # alt_path 사용 성공 → 원본 삭제
        try: os.remove(tmp_path)
        except OSError: pass
        tmp_path = alt_path

    try:
        src_fps = cap.get(cv2.CAP_PROP_FPS)
        if not src_fps or src_fps <= 0 or src_fps > 240:
            src_fps = float(target_fps)
        step = max(1, int(round(src_fps / float(target_fps))))

        dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        count = 0
        out_count = 0

        while True:
            grabbed = cap.grab()
            if not grabbed:
                break
            if count % step != 0:
                count += 1
                continue

            ok, frame_bgr = cap.retrieve()
            if not ok:
                count += 1
                continue

            # BGR→RGB → Torch resize → RGB→BGR
            rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            rgb_resized = _torch_resize_rgb(rgb, dev, resize_to)
            frame_out = rgb_resized if not bgr else cv2.cvtColor(rgb_resized, cv2.COLOR_RGB2BGR)

            yield frame_out

            out_count += 1
            count += 1
            if out_count >= max_frames:
                break
    finally:
        cap.release()
        try:
            os.remove(tmp_path)
        except OSError:
            pass

def collect_frames_from_bytes(
    video_bytes: bytes,
    target_fps: int = 30,
    resize_to: Tuple[int, int] = (960, 540),
    max_frames: int = 1800,
    bgr: bool = True,
) -> List["np.ndarray"]:
    return list(iter_frames_from_bytes(video_bytes, target_fps, resize_to, max_frames, bgr))

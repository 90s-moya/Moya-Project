import cv2

cap = cv2.VideoCapture(0)  # 기본 카메라

if not cap.isOpened():
    print("카메라를 열 수 없습니다.")
else:
    # 현재 해상도와 FPS 확인
    width  = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    fps    = cap.get(cv2.CAP_PROP_FPS)

    print(f"현재 기본 해상도: {int(width)} x {int(height)}")
    print(f"기본 FPS: {fps}")

    # 고해상도 시도 (1280x720, 1920x1080)
    for w, h in [(1280, 720), (1920, 1080)]:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, w)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
        new_w = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
        new_h = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        print(f"요청 해상도 {w}x{h} -> 지원 여부: {int(new_w)}x{int(new_h)}")

cap.release()

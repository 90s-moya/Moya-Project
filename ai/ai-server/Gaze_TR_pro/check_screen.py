import cv2
import numpy as np

# 실제 화면에서 테스트용 윈도우 생성
def test_screen_coordinates():
    # 테스트 창 생성
    img = np.zeros((600, 800, 3), dtype=np.uint8)
    
    # 현재 캘리브레이션 타겟들 (원래 1920x1080 기준)
    original_targets = [
        (100, 100),
        (1820, 100), 
        (100, 980),
        (1820, 980),
        (960, 540)
    ]
    
    # 800x600 창에 맞게 스케일링
    window_width, window_height = 800, 600
    scale_x = window_width / 1920
    scale_y = window_height / 1080
    
    scaled_targets = []
    for x, y in original_targets:
        new_x = int(x * scale_x)
        new_y = int(y * scale_y)
        scaled_targets.append((new_x, new_y))
        print(f"Original: ({x}, {y}) -> Scaled: ({new_x}, {new_y})")
    
    # 점들을 화면에 그리기
    for i, (x, y) in enumerate(scaled_targets):
        cv2.circle(img, (x, y), 15, (0, 255, 255), -1)  # 노란색 점
        cv2.putText(img, f"{i+1}", (x-10, y-20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    cv2.putText(img, f"Window: {window_width}x{window_height}", (10, 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(img, "Press 'q' to quit", (10, 60), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    cv2.imshow("Calibration Targets Test", img)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
    
    return scaled_targets

if __name__ == "__main__":
    print("Testing calibration target coordinates...")
    new_targets = test_screen_coordinates()
    print("\nSuggested new targets for 800x600 window:")
    for i, target in enumerate(new_targets):
        print(f"    ({target[0]}, {target[1]}),")
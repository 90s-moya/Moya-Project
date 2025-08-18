import { useEffect, useRef, useState } from "react";
import positiveImg from "@/assets/images/positive.png";
import negativeImg from "@/assets/images/negative.png";

// Safari 호환성을 위한 AudioContext 타입 정의
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

interface FeedbackPopupProps {
  show: boolean;
  feedbackType: "POSITIVE" | "NEGATIVE" | null;
  message: string;
  onMessageChange: (msg: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  isSending?: boolean;
}

export default function FeedbackPopup({
  show,
  feedbackType,
  message,
  onMessageChange,
  onSubmit,
  onClose,
  isSending = false,
}: FeedbackPopupProps) {
  const [visible, setVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [exitDirection, setExitDirection] = useState<"up" | "down">("up");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 컴포넌트 마운트 시 초기 상태 설정
  useEffect(() => {
    if (show && !visible) {
      setIsEntering(true);
    }
  }, [show, visible]);

  // "슝~" 소리 생성 함수 (팝업 등장 시)
  const playSwooshSound = () => {
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // "슝~" 소리 설정
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 시작 주파수
      oscillator.frequency.exponentialRampToValueAtTime(
        200,
        audioContext.currentTime + 0.3
      ); // 끝 주파수

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // 볼륨
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3
      ); // 페이드아웃

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log("오디오 재생 실패:", error);
    }
  };

  // "슈웅~~~" 소리 생성 함수 (전송 시)
  const playSendSound = () => {
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // "슈웅~~~" 소리 설정 (더 높은 음, 더 긴 지속시간)
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime); // 시작 주파수 (더 높음)
      oscillator.frequency.exponentialRampToValueAtTime(
        400,
        audioContext.currentTime + 0.5
      ); // 끝 주파수 (더 긴 지속시간)

      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime); // 볼륨 (약간 더 크게)
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      ); // 페이드아웃

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log("전송 소리 재생 실패:", error);
    }
  };

  // 팝업 등장/사라짐 모션 관리
  useEffect(() => {
    if (show) {
      setVisible(true);
      setIsLeaving(false);
      setIsEntering(true);
      // "슝~" 소리 재생
      playSwooshSound();
      // 약간의 지연 후 애니메이션 시작
      setTimeout(() => {
        setIsEntering(false);
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 100);
      }, 10);
    } else if (visible) {
      setIsLeaving(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setIsLeaving(false);
      }, 500); // 사라지는 모션 시간 (duration-500과 일치)
      return () => clearTimeout(timer);
    }
  }, [show]);

  // ESC/Enter 핸들링
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        // 전송 시 "슈웅~~~" 소리 재생
        playSendSound();
        // 전송 시 위로 올라가는 모션
        setExitDirection("up");
        setIsLeaving(true);
        onSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [show, onClose, onSubmit]);

  if (!show && !visible) return null;

  return (
    <div
      className={`
          fixed left-1/2 bottom-[12%]
          z-50
          w-[350px] max-w-[98vw] min-h-[180px]
          -translate-x-1/2
          bg-white rounded-2xl shadow-2xl p-5
          transition-all duration-500 ease-in-out
        ${
          show && !isLeaving
            ? isEntering
              ? "translate-y-full opacity-0 scale-95"
              : "translate-y-0 opacity-100 scale-100"
            : exitDirection === "down"
            ? "translate-y-full opacity-0 scale-95"
            : "-translate-y-[70vh] opacity-0 scale-95"
        }
        flex flex-col
      `}
      style={{ pointerEvents: show && !isLeaving ? "auto" : "none" }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-semibold text-gray-700 flex items-center gap-2">
          <img
            src={feedbackType === "NEGATIVE" ? negativeImg : positiveImg}
            alt={feedbackType === "NEGATIVE" ? "negative" : "positive"}
            className="w-5 h-5 rounded-full object-cover"
          />
          피드백 보내기
        </span>
        <button
          onClick={() => {
            // X로 닫을 때는 아래로 내려가는 모션
            setExitDirection("down");
            setIsLeaving(true);
            setTimeout(() => onClose(), 500);
          }}
          className="text-gray-400 hover:text-gray-600 text-2xl"
        >
          ✕
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        placeholder="피드백 메시지를 입력하세요..."
        className="w-full h-20 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        disabled={isSending}
      />
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => {
            // 전송 시 "슈웅~~~" 소리 재생
            playSendSound();
            // 전송 시 위로 올라가는 모션 유지 (즉시 애니메이션 시작)
            setExitDirection("up");
            setIsLeaving(true);
            onSubmit();
          }}
          className="w-full bg-blue-500 text-white py-2 px-3 rounded-md text-sm hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500"
          disabled={message.trim() === "" || isSending}
        >
          전송
        </button>
      </div>
      <div className="text-xs text-gray-400 mt-1 text-right">
        Enter: 전송, Shift+Enter: 줄바꿈
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import positiveImg from "@/assets/images/positive.png";
import negativeImg from "@/assets/images/negative.png";

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
  const [exitDirection, setExitDirection] = useState<'up' | 'down'>('up');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 팝업 등장/사라짐 모션 관리
  useEffect(() => {
    if (show) {
      setVisible(true);
      setIsLeaving(false);
      setIsEntering(true);
      // 다음 프레임에 최종 상태로 전환하여 트랜지션 유도
      requestAnimationFrame(() => {
        setIsEntering(false);
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 100);
      });
    } else if (visible) {
      setIsLeaving(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setIsLeaving(false);
      }, 300); // 사라지는 모션 시간 (duration-300과 일치)
      return () => clearTimeout(timer);
    }
  }, [show]);

  // ESC/Enter 핸들링
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        // 전송 시 위로 올라가는 모션
        setExitDirection('up');
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
        w-[480px] max-w-[98vw] min-h-[260px]
        -translate-x-1/2
        bg-white rounded-2xl shadow-2xl p-8
        transition-all duration-300 ease-out
        ${
          show && !isLeaving
            ? (isEntering ? "translate-y-8 opacity-0" : "translate-y-0 opacity-100")
            : (exitDirection === 'down' ? "translate-y-8 opacity-0" : "-translate-y-[70vh] opacity-0")
        }
        flex flex-col
      `}
      style={{ pointerEvents: show && !isLeaving ? "auto" : "none" }}
    >
      <div className="flex items-center justify-between mb-5">
        <span className="text-xl font-semibold text-gray-700 flex items-center gap-2">
          <img
            src={feedbackType === "NEGATIVE" ? negativeImg : positiveImg}
            alt={feedbackType === "NEGATIVE" ? "negative" : "positive"}
            className="w-6 h-6 rounded-full object-cover"
          />
          피드백 보내기
        </span>
        <button
          onClick={() => {
            // X로 닫을 때는 아래로 내려가는 모션
            setExitDirection('down');
            setIsLeaving(true);
            setTimeout(() => onClose(), 300);
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
        className="w-full h-32 p-4 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
        disabled={isSending}
      />
      <div className="flex gap-2 mt-6">
        <button
          onClick={() => {
            // 전송 시 위로 올라가는 모션 유지 (즉시 애니메이션 시작)
            setExitDirection('up');
            setIsLeaving(true);
            onSubmit();
          }}
          className="flex-1 bg-blue-500 text-white py-3 px-3 rounded-md text-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500"
          disabled={message.trim() === "" || isSending}
        >
          전송
        </button>
        <button
          onClick={() => {
            // 취소 시 아래로 내려가는 모션
            setExitDirection('down');
            setIsLeaving(true);
            setTimeout(() => onClose(), 300);
          }}
          className="flex-1 bg-gray-300 text-gray-700 py-3 px-3 rounded-md text-lg hover:bg-gray-400 transition-colors"
          disabled={isSending}
        >
          취소
        </button>
      </div>
      <div className="text-xs text-gray-400 mt-3 text-right">
        Enter: 전송, Shift+Enter: 줄바꿈
      </div>
    </div>
  );
}

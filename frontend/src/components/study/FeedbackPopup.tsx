import { useEffect, useRef, useState } from "react";

interface FeedbackPopupProps {
  show: boolean;
  type: "SMILE" | "SAD" | null;
  message: string;
  onMessageChange: (msg: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  isSending?: boolean;
}

export default function FeedbackPopup({
  show,
  type,
  message,
  onMessageChange,
  onSubmit,
  onClose,
  isSending = false,
}: FeedbackPopupProps) {
  const [visible, setVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 팝업 등장/사라짐 모션 관리
  useEffect(() => {
    if (show) {
      setVisible(true);
      setIsLeaving(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100); // 팝업 등장 후 포커스
    } else if (visible) {
      setIsLeaving(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setIsLeaving(false);
      }, 400); // 사라지는 모션 시간
      return () => clearTimeout(timer);
    }
  }, [show]);

  // ESC/Enter 핸들링
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
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
        fixed left-1/2
        ${isLeaving ? "bottom-[90%]" : "bottom-[12%]"}
        z-50
        w-[480px] max-w-[98vw] min-h-[260px]
        -translate-x-1/2
        bg-white rounded-2xl shadow-2xl p-8
        transition-all duration-400
        ${
          show && !isLeaving
            ? "translate-y-0 opacity-100"
            : "-translate-y-10 opacity-0"
        }
        flex flex-col
      `}
      style={{ pointerEvents: show ? "auto" : "none" }}
    >
      <div className="flex items-center justify-between mb-5">
        <span className="text-xl font-semibold text-gray-700">
          {type === "SMILE" ? "🙂" : "😢"} 피드백 보내기
        </span>
        <button
          onClick={onClose}
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
          onClick={onSubmit}
          className="flex-1 bg-blue-500 text-white py-3 px-3 rounded-md text-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500"
          disabled={message.trim() === "" || isSending}
        >
          전송
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-gray-300 text-gray-700 py-3 px-3 rounded-md text-lg hover:bg-gray-400 transition-colors"
          disabled={isSending}
        >
          취소
        </button>
      </div>
      <div className="text-xs text-gray-400 mt-3 text-right">
        Enter: 전송, Shift+Enter: 줄바꿈, ESC: 닫기
      </div>
    </div>
  );
}

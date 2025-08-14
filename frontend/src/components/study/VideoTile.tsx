import { createFeedback } from "@/api/studyApi";
import { useEffect, useRef, useState } from "react";
import positiveImg from "@/assets/images/positive.png";
import negativeImg from "@/assets/images/negative.png";
import FeedbackPopup from "./FeedbackPopup";
import { User } from "lucide-react";

interface VideoTileProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  userId: string;
  roomId: string;
  userDocs?: {
    docsId: string;
    userId: string;
    fileUrl: string;
    docsStatus: string;
  }[];
  onDocsClick?: (userId: string) => void; // 서류 클릭 시 부모 컴포넌트에 알림
  hideOverlay?: boolean; // 썸네일 등 오버레이 숨김
}

export default function VideoTile({
  stream,
  isLocal = false,
  userId,
  roomId,
  userDocs = [],
  onDocsClick,
  hideOverlay = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState<
    "POSITIVE" | "NEGATIVE" | null
  >(null);
  const [isSending, setIsSending] = useState(false);

  // 카메라 상태 감지 로직 제거 - 단순하게 스트림만 체크

  // 비디오 스트림 연결 최적화
  useEffect(() => {
    if (videoRef.current && stream) {
      // 기존 srcObject가 같은 스트림이면 재설정하지 않음
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    } else if (videoRef.current && !stream) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // 서류 아이콘 클릭 시 실행되는 함수 (디바운싱 추가)
  const handleClickDocs = () => {
    // console.log("서류 아이콘 클릭 됨.");
    // console.log("사용자 ID:", userId);
    // console.log("사용자 서류:", userDocs);

    // 부모 컴포넌트에 서류 클릭 이벤트 전달
    if (onDocsClick) {
      onDocsClick(userId);
    }
  };

  // 웃는 얼굴 버튼 눌렀을 때 호출
  const handleClickPositive = () => {
    setFeedbackType("POSITIVE");
    setShowFeedbackPopup(true);
  };

  // 우는 얼굴 버튼 눌렀을 때 호출
  const handleClickNegative = () => {
    setFeedbackType("NEGATIVE");
    setShowFeedbackPopup(true);
  };

  // 피드백 제출
  const handleSubmitFeedback = async () => {
    if (!feedbackType || feedbackMessage.trim() === "") return;

    setIsSending(true);

    try {
      const res = await createFeedback({
        roomId: roomId,
        receiverId: userId,
        feedbackType: feedbackType,
        message: feedbackMessage,
      });
      setShowFeedbackPopup(false);
      setFeedbackMessage("");
      setFeedbackType(null);
    } catch (error) {
      console.log("피드백 전송 실패:", error);
    } finally {
      setIsSending(false);
    }
  };

  // 팝업 닫기 (초기화)
  const handleClosePopup = () => {
    setShowFeedbackPopup(false);
    setFeedbackMessage("");
    setFeedbackType(null);
  };

  return (
    <div className="relative rounded-lg w-full h-full bg-gray-400 overflow-hidden">
      {/* 비디오 스트림 - 카메라 상태 체크 없이 항상 표시 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover transform scale-x-[-1]"
        // 비디오 로딩 최적화
        preload="metadata"
      />

      {/* 스트림이 없을 때만 표시 */}
      {!stream && (
        <div className="absolute inset-0 bg-gray-600 flex flex-col items-center justify-center">
          <div className="text-center">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-300 text-sm">연결 중...</p>
          </div>
        </div>
      )}

      {/* 오른쪽 상단 서류 아이콘 (썸네일에서는 숨김) */}
      {!hideOverlay && (
        <div className="absolute top-2 right-2">
          <div
            onClick={handleClickDocs}
            className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-[#e0e7ff] cursor-pointer transition-colors text-2xl"
          >
            📄
          </div>
        </div>
      )}

      {/* 오른쪽 하단 감정 피드백 (썸네일에서는 숨김, 본인 화면에서는 숨김) */}
      {!hideOverlay && !isLocal && (
        <div className="absolute bottom-2 right-2 flex gap-2">
          <button
            onClick={handleClickPositive}
            className="rounded-full shadow hover:opacity-90 transition"
            aria-label="긍정 피드백"
          >
            <img
              src={positiveImg}
              alt="positive"
              className="w-12 h-12 rounded-full object-cover"
            />
          </button>
          <button
            onClick={handleClickNegative}
            className="rounded-full shadow hover:opacity-90 transition"
            aria-label="부정 피드백"
          >
            <img
              src={negativeImg}
              alt="negative"
              className="w-12 h-12 rounded-full object-cover"
            />
          </button>
        </div>
      )}

      {/* 중앙 하단 피드백 팝업 (썸네일에서는 숨김, 본인 화면에서는 숨김) */}
      {!hideOverlay && !isLocal && (
        <FeedbackPopup
          show={showFeedbackPopup}
          feedbackType={feedbackType}
          message={feedbackMessage}
          onMessageChange={setFeedbackMessage}
          onSubmit={handleSubmitFeedback}
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
}

import { createFeedback } from "@/api/studyApi";
import { useEffect, useRef, useState } from "react";
import positiveImg from "@/assets/images/positive.png";
import negativeImg from "@/assets/images/negative.png";
import FeedbackPopup from "./FeedbackPopup";
import Carousel from "../ui/Carousel";

interface VideoTileProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  userId: string;
  roomId: string;
  userDocs?: {
    docsId: string; // docs_id → docsId로 변경
    userId: string; // user_id → userId로 변경
    fileUrl: string; // file_url → fileUrl로 변경
    docsStatus: string;
  }[];
  onDocsClick?: (userId: string) => void; // 서류 클릭 시 부모 컴포넌트에 알림
}

export default function VideoTile({
  stream,
  isLocal = false,
  userId,
  roomId,
  userDocs = [],
  onDocsClick,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState<
    "POSITIVE" | "NEGATIVE" | null
  >(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    } else if (videoRef.current) videoRef.current.srcObject = null;
  }, [stream]);

  // 서류 아이콘 클릭 시 실행되는 함수
  const handleClickDocs = () => {
    console.log("서류 아이콘 클릭 됨.");
    console.log("사용자 ID:", userId);
    console.log("사용자 서류:", userDocs);

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
      {/* 비디오 스트림 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />

      {/* 오른쪽 상단 서류 아이콘 (1개로 변경) */}
      <div className="absolute top-2 right-2">
        <div
          onClick={handleClickDocs}
          className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-[#e0e7ff] cursor-pointer transition-colors"
        >
          📄
        </div>
      </div>

      {/* 오른쪽 하단 감정 피드백 (이미지 사용) */}
      <div className="absolute bottom-2 right-2 flex gap-2">
        <button
          onClick={handleClickPositive}
          className="rounded-full shadow hover:opacity-90 transition"
          aria-label="긍정 피드백"
        >
          <img src={positiveImg} alt="positive" className="w-9 h-9 rounded-full object-cover" />
        </button>
        <button
          onClick={handleClickNegative}
          className="rounded-full shadow hover:opacity-90 transition"
          aria-label="부정 피드백"
        >
          <img src={negativeImg} alt="negative" className="w-9 h-9 rounded-full object-cover" />
        </button>
      </div>

      {/* 중앙 하단 피드백 팝업 */}
      <FeedbackPopup
        show={showFeedbackPopup}
        feedbackType={feedbackType}
        message={feedbackMessage}
        onMessageChange={setFeedbackMessage}
        onSubmit={handleSubmitFeedback}
        onClose={handleClosePopup}
      />
    </div>
  );
}

import { createFeedback } from "@/api/studyApi";
import { useEffect, useRef, useState } from "react";
import FeedbackPopup from "./FeedbackPopup";

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  userId: string;
  roomId: string;
}

export default function VideoTile({
  stream,
  name,
  isLocal = false,
  userId,
  roomId,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false); // 피드백 팝업 여부
  const [feedbackMessage, setFeedbackMessage] = useState(""); // 피드백 메시지
  const [feedbackType, setFeedbackType] = useState<"SMILE" | "SAD" | null>(
    null
  ); // 피드백 타입
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    } else if (videoRef.current) videoRef.current.srcObject = null;
  }, [stream]);

  // 서류 아이콘 클릭 시 실행되는 함수
  const handleClickDocs = () => {
    console.log("서류 아이콘 클릭 됨.");
    console.log(userId);

    // api 요청 보내서 서류 받아오기

    // 받아온 서류의 docsStatus에 따라 usestate로 선언된 변수에 담기

    // 그런데 비디오 타일마다 사용자의 user id를 알아야하는데 어떻게 알지..?
  };

  // 웃는 얼굴 버튼 눌렀을 때 호출
  const handleClickSmile = () => {
    setFeedbackType("SMILE");
    setShowFeedbackPopup(true);
  };

  // 우는 얼굴 버튼 눌렀을 때 호출
  const handleClickSad = () => {
    setFeedbackType("SAD");
    setShowFeedbackPopup(true);
  };

  // 피드백 제출
  const handleSubmitFeedback = async () => {
    if (!feedbackType || feedbackMessage.trim() === "") return;

    setIsSending(true);

    try {
      await createFeedback({
        room_id: roomId,
        receiver_id: userId,
        type: feedbackType,
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

      {/* 사용자 이름 */}
      <div className="absolute bottom-2 left-2 bg-blue-500 bg-opacity-50 text-white text-lg px-3 py-1 rounded-full shadow">
        {name}
      </div>

      {/* 오른쪽 상단 서류 아이콘 3개 */}
      <div className="absolute top-2 right-2 flex flex-col items-center gap-2 text-black">
        <div
          onClick={handleClickDocs}
          className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-[#e0e7ff] cursor-pointer"
        >
          📄
        </div>
        <div
          onClick={handleClickDocs}
          className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-[#e0e7ff] cursor-pointer"
        >
          📝
        </div>
        <div
          onClick={handleClickDocs}
          className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-[#e0e7ff] cursor-pointer"
        >
          📁
        </div>
      </div>

      {/* 오른쪽 하단 감정 피드백 */}
      <div className="absolute bottom-2 right-2 flex gap-2">
        <button
          onClick={handleClickSmile}
          className="text-xl bg-white rounded-full shadow px-2 hover:bg-[#f0f4ff]"
        >
          🙂
        </button>
        <button
          onClick={handleClickSad}
          className="text-xl bg-white rounded-full shadow px-2 hover:bg-[#f0f4ff]"
        >
          😢
        </button>
      </div>

      {/* 중앙 하단 피드백 팝업 */}
      <FeedbackPopup
        show={showFeedbackPopup}
        type={feedbackType}
        message={feedbackMessage}
        onMessageChange={setFeedbackMessage}
        onSubmit={handleSubmitFeedback}
        onClose={handleClosePopup}
      />
    </div>
  );
}

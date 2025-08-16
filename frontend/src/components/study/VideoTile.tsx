import { useEffect, useRef } from "react";
import positiveImg from "@/assets/images/positive.png";
import negativeImg from "@/assets/images/negative.png";
import { User, FileText } from "lucide-react";

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
  onOpenFeedback?: (userId: string, type: "POSITIVE" | "NEGATIVE") => void;
  hideOverlay?: boolean; // 썸네일 등 오버레이 숨김
}

export default function VideoTile({
  stream,
  isLocal = false,
  userId,
  onDocsClick,
  onOpenFeedback,
  hideOverlay = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

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

  // 서류 아이콘 클릭 시 실행되는 함수
  const handleClickDocs = () => {
    // 부모 컴포넌트에 서류 클릭 이벤트 전달
    if (onDocsClick) {
      onDocsClick(userId);
    }
  };

  // 웃는 얼굴 버튼 눌렀을 때 호출
  const handleClickPositive = () => {
    if (onOpenFeedback) {
      onOpenFeedback(userId, "POSITIVE");
    }
  };

  // 우는 얼굴 버튼 눌렀을 때 호출
  const handleClickNegative = () => {
    if (onOpenFeedback) {
      onOpenFeedback(userId, "NEGATIVE");
    }
  };

  return (
    <div className="relative rounded-lg w-full h-full bg-gray-400 overflow-hidden group transition-all hover:shadow-lg hover:-translate-y-1 hover:border-2 hover:border-[#2b7fff]">
      {/* 비디오 스트림 - 카메라 상태 체크 없이 항상 표시 */}
      <video
        onClick={handleClickDocs}
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
            className="w-12 h-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-[#e0e7ff] cursor-pointer transition-colors"
          >
            <FileText className="w-5 h-5 text-[#2b7fff]" />
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
    </div>
  );
}

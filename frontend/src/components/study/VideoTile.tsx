import { createFeedback } from "@/api/studyApi";
import { useEffect, useRef, useState } from "react";
import positiveImg from "@/assets/images/positive.png";
import negativeImg from "@/assets/images/negative.png";
import FeedbackPopup from "./FeedbackPopup";
import { VideoOff, User } from "lucide-react";

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
  const [isCameraOn, setIsCameraOn] = useState(!isLocal); // 로컬은 true, 원격은 false로 시작

  // 카메라 상태 감지 (개선된 버전)
  useEffect(() => {
    console.log(
      `[VideoTile] 스트림 상태 확인 - userId: ${userId}, stream:`,
      stream
    );

    if (!stream) {
      console.log(`[VideoTile] ${userId}: 스트림 없음, 2초 후 재확인`);
      // 원격 사용자만 지연 처리 (로컬은 즉시 OFF)
      if (isLocal) {
        setIsCameraOn(false);
        return;
      }

      // 원격 사용자는 스트림이 없어도 즉시 OFF로 설정하지 않고 잠시 대기
      const delayTimeout = setTimeout(() => {
        if (!stream) {
          console.log(
            `[VideoTile] ${userId}: 2초 후에도 스트림 없음, 카메라 OFF`
          );
          setIsCameraOn(false);
        }
      }, 2000);

      return () => clearTimeout(delayTimeout);
    }

    const videoTracks = stream.getVideoTracks();
    console.log(`[VideoTile] ${userId}: 비디오 트랙 수:`, videoTracks.length);

    if (videoTracks.length === 0) {
      console.log(`[VideoTile] ${userId}: 비디오 트랙 없음, 카메라 OFF`);
      setIsCameraOn(false);
      return;
    }

    const videoTrack = videoTracks[0];
    console.log(
      `[VideoTile] ${userId}: 트랙 상태 - enabled: ${videoTrack.enabled}, readyState: ${videoTrack.readyState}`
    );

    // 스트림이 있으면 즉시 카메라 ON (원격 사용자의 연결 지연 해결)
    if (!isLocal) {
      console.log(`[VideoTile] ${userId}: 원격 스트림 수신, 즉시 카메라 ON`);
      setIsCameraOn(true);
    } else {
      // 로컬은 enabled 기준으로 판단
      setIsCameraOn(videoTrack.enabled);
    }

    // 트랙 상태 변경 감지
    const handleTrackEnded = () => {
      console.log(`[VideoTile] ${userId}: 트랙 종료됨`);
      setIsCameraOn(false);
    };

    const handleTrackMute = () => {
      console.log(`[VideoTile] ${userId}: 트랙 음소거됨`);
      setIsCameraOn(false);
    };

    const handleTrackUnmute = () => {
      console.log(`[VideoTile] ${userId}: 트랙 음소거 해제됨`);
      setIsCameraOn(videoTrack.enabled);
    };

    videoTrack.addEventListener("ended", handleTrackEnded);
    videoTrack.addEventListener("mute", handleTrackMute);
    videoTrack.addEventListener("unmute", handleTrackUnmute);

    // 주기적으로 트랙 상태 확인 (로컬/원격 구분)
    const checkInterval = setInterval(
      () => {
        const isEnabled = videoTrack.enabled;
        const isLive = videoTrack.readyState === "live";

        let shouldBeOn;
        if (isLocal) {
          // 로컬: enabled 상태가 중요
          shouldBeOn = isEnabled;
        } else {
          // 원격: 더 관대한 조건 (연결 상태 고려)
          shouldBeOn = isEnabled; // 원격은 enabled만 체크 (readyState는 불안정)
        }

        console.log(
          `[VideoTile] ${userId} (${
            isLocal ? "local" : "remote"
          }): 주기적 체크 - enabled: ${isEnabled}, readyState: ${
            videoTrack.readyState
          }, shouldBeOn: ${shouldBeOn}`
        );
        setIsCameraOn(shouldBeOn);
      },
      isLocal ? 1000 : 5000
    ); // 로컬은 1초, 원격은 5초 간격

    return () => {
      videoTrack.removeEventListener("ended", handleTrackEnded);
      videoTrack.removeEventListener("mute", handleTrackMute);
      videoTrack.removeEventListener("unmute", handleTrackUnmute);
      clearInterval(checkInterval);
    };
  }, [stream, userId, isLocal]);

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
      {/* 비디오 스트림 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover transform scale-x-[-1] ${
          !isCameraOn ? "opacity-0" : "opacity-100"
        }`}
        // 비디오 로딩 최적화
        preload="metadata"
      />

      {/* 카메라 꺼짐 상태 표시 */}
      {!isCameraOn && (
        <div className="absolute inset-0 bg-gray-700 flex flex-col items-center justify-center">
          <div className="text-center">
            <VideoOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
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

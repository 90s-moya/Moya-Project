import { Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function CameraControlPanel() {
  const [isCameraOn, setIsCameraOn] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 카메라 스트림 연결 / 해제
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("카메라 접근 실패:", err);
        alert("카메라 접근 실패");
      }
    };

    if (isCameraOn) {
      startCamera();
    } else {
      // 끌 때, 스트림 종료
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraOn]);

  return (
    <div className="relative">
      {/* 카메라 토글 버튼 */}
      <button
        onClick={() => setIsCameraOn((prev) => !prev)}
        className="flex items-center gap-1 text-[#2b7fff] hover:text-blue-600 transition"
      >
        {isCameraOn ? (
          <Video className="w-5 h-5" />
        ) : (
          <VideoOff className="w-5 h-5" />
        )}
        <span className="text-base font-medium">카메라</span>
      </button>
    </div>
  );
}

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Camera } from "lucide-react";
import Header from "@/components/common/Header";
import { useNavigate } from "react-router-dom";

export default function StudySetupPage() {
  // 카메라 및 마이크 상태 확인용 변수
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const navigate = useNavigate();

  // 카메라 및 오디오 시작
  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // 마이크 연결 체크
      const audioTracks = stream.getAudioTracks();
      if (stream && audioTracks.length > 0) {
        alert("마이크 연결됨");
        setIsMicOn(true);
      } else {
        console.log("마이크 연결 오류");
        alert("마이크 연결 오류");
      }

      // 카메라 연결 체크
      const cameraTracks = stream.getVideoTracks();
      if (stream && cameraTracks.length > 0) {
        alert("카메라 연결됨");
        setIsCameraOn(true);
      } else {
        console.log("카메라 연결 오류");
        alert("카메라 연결 오류");
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.log("startStream 오류");
      alert("startStream 오류");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header scrollBg={false} />

      <main className="max-w-[1180px] mx-auto px-4 md:px-6 lg:px-8 pt-[120px] pb-20 text-[17px] leading-relaxed">
        <div className="flex gap-8 flex-col lg:flex-row mb-12">
          {/* Camera */}
          <div className="flex-1">
            <div
              className="relative bg-gray-900 rounded-lg overflow-hidden"
              style={{ aspectRatio: "4/3" }}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${
                  isCameraOn ? "block" : "hidden"
                }`}
              />
              {!isCameraOn && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-white text-2xl">
                      카메라를 활성화해주세요
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mic 상태 패널 */}
          <div className="w-full lg:w-80 space-y-6 text-[17px]">
            {/* 카메라 상태 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Camera
                  className={`w-6 h-6 ${
                    isCameraOn ? "text-green-500" : "text-gray-400"
                  }`}
                />
                <span className="text-lg font-medium">카메라</span>
              </div>
              <span
                className={`text-base font-semibold ${
                  isCameraOn ? "text-green-600" : "text-gray-500"
                }`}
              >
                {isCameraOn ? "연결됨" : "연결 대기중"}
              </span>
            </div>

            {/* 마이크 상태 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Mic
                  className={`w-6 h-6 ${
                    isMicOn ? "text-green-500" : "text-gray-400"
                  }`}
                />
                <span className="text-lg font-medium">마이크</span>
              </div>
              <span
                className={`text-base font-semibold ${
                  isMicOn ? "text-green-600" : "text-gray-500"
                }`}
              >
                {isMicOn ? "연결됨" : "연결 대기중"}
              </span>
            </div>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-end gap-4">
          <Button
            onClick={startStream}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6"
          >
            테스트하기
          </Button>
          <Button
            onClick={() => navigate("/study/room")}
            disabled={!isCameraOn || !isMicOn}
            className={`px-8 ${
              isCameraOn && isMicOn
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            다음
          </Button>
        </div>
      </main>
    </div>
  );
}

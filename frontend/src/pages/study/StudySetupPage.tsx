"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Camera } from "lucide-react";
import Header from "@/components/common/Header";
import MicVisualizer from "@/components/study/MicVisualizer";
import { useNavigate } from "react-router-dom";

export default function StudySetupPage() {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const navigate = useNavigate();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log("✅ 카메라/마이크 스트림 얻음:", stream);

      console.log("videoRef.current : ", videoRef.current);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraOn(true);
        setIsMicOn(true);
      }
    } catch (error) {
      console.error("❌ 카메라 접근 오류:", error);
    }
  };

  useEffect(() => {
    // 컴포넌트가 처음 마운트될 때 카메라 자동 시작
    if (videoRef.current) {
      startCamera();
    }
  }, []);

  const handleTest = async () => {
    setIsTestingMic(true);
    setTimeout(() => setIsTestingMic(false), 3000);
  };

  const handleNext = () => {
    navigate("/study/room");
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header scrollBg={false} />

      <main className="max-w-[1180px] mx-auto px-4 md:px-6 lg:px-8 pt-[120px] pb-20 text-[17px] leading-relaxed">
        <div>
          {/* Title */}
          <h1 className="text-3xl font-bold text-[#1b1c1f] mb-6">
            AI 면접을 위한 환경을 설정 해 주세요
          </h1>
          <p className="text-lg text-[#4b4e57] mb-10">
            원활한 면접을 위해 카메라, 마이크, 화면 구도를 점검합니다.
          </p>

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
                      <div className="w-24 h-24 bg-yellow-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <div className="w-16 h-16 bg-yellow-300 rounded-full flex items-center justify-center">
                          <span className="text-2xl">😊</span>
                        </div>
                      </div>
                      <div className="text-white text-sm">
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

              {/* 마이크 테스트 안내 */}
              <div className="p-5 bg-blue-50 rounded-lg space-y-2">
                <h3 className="font-semibold text-lg text-gray-800">
                  마이크 테스트
                </h3>

                {isTestingMic && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" />
                    <span className="text-base font-medium">
                      음성 테스트 중...
                    </span>
                  </div>
                )}
                <MicVisualizer stream={streamRef.current}></MicVisualizer>
              </div>

              {/* 권한 안내 */}
              <p className="text-lg text-gray-500">
                마이크와 카메라 권한을 브라우저에서 허용해주세요.
              </p>
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex justify-end gap-4">
            <Button
              onClick={handleTest}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6"
            >
              테스트하기
            </Button>
            <Button
              onClick={handleNext}
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
        </div>
      </main>
    </div>
  );
}

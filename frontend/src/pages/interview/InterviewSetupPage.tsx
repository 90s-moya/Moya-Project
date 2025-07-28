"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Camera } from "lucide-react"

export default function EnvironmentSetup() {
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isMicOn, setIsMicOn] = useState(false)
  const [isTestingMic, setIsTestingMic] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsCameraOn(true)
        setIsMicOn(true)
      }
    } catch (error) {
      console.error("카메라 접근 오류:", error)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setIsCameraOn(false)
      setIsMicOn(false)
    }
  }

  const handleTest = () => {
    if (!isCameraOn) {
      startCamera()
    } else {
      setIsTestingMic(true)
      setTimeout(() => setIsTestingMic(false), 3000)
    }
  }

  const handleNext = () => {
    alert("면접을 시작합니다!")
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-300 p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-xl text-gray-600">AI면접 환경 설정(카메라, 마이크 확인)</h1>
      </div>

      {/* Main Card Container */}
      <div className="bg-white rounded-lg shadow-sm max-w-5xl mx-auto">
        {/* Header */}
        <header className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <div className="text-2xl font-bold text-blue-500">MOYA</div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-700 hover:text-blue-500 font-medium">
                AI 모의 면접
              </a>
              <a href="#" className="text-gray-700 hover:text-blue-500 font-medium">
                면접 스터디
              </a>
              <a href="#" className="text-gray-700 hover:text-blue-500 font-medium">
                마이페이지
              </a>
            </nav>

            {/* User section */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">로그인</span>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white">00님</Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-6 py-8">
          {/* Title and Description */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-2">AI 면접을 위한 환경을 설정 해 주세요</h2>
            <p className="text-gray-600">원활한 면접을 위해 카메라, 마이크, 화면 구도를 점검합니다.</p>
          </div>

          {/* Camera and Settings Area */}
          <div className="flex gap-8 mb-8">
            {/* Camera Preview */}
            <div className="flex-1">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
                {isCameraOn ? (
                  <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-yellow-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <div className="w-16 h-16 bg-yellow-300 rounded-full flex items-center justify-center">
                          <span className="text-2xl">😊</span>
                        </div>
                      </div>
                      <div className="text-white text-sm">카메라를 활성화해주세요</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-2 text-sm text-gray-500">카메라 및 음성 테스트</div>
            </div>

            {/* Settings Panel */}
            <div className="w-80 space-y-4">
              {/* Camera Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Camera className={`w-5 h-5 ${isCameraOn ? "text-green-500" : "text-gray-400"}`} />
                  <span className="text-sm">카메라</span>
                </div>
                <div className={`text-sm ${isCameraOn ? "text-green-600" : "text-gray-500"}`}>
                  {isCameraOn ? "연결됨" : "연결 대기중"}
                </div>
              </div>

              {/* Microphone Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mic className={`w-5 h-5 ${isMicOn ? "text-green-500" : "text-gray-400"}`} />
                  <span className="text-sm">마이크</span>
                </div>
                <div className={`text-sm ${isMicOn ? "text-green-600" : "text-gray-500"}`}>
                  {isMicOn ? "연결됨" : "연결 대기중"}
                </div>
              </div>

              {/* Microphone Test */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">마이크 측정음위해</h3>
                <p className="text-sm text-gray-600 mb-3">화면 설정하기 텍스트를 읽어주세요</p>
                {isTestingMic && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span className="text-sm">음성 테스트 중...</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500">마이크와 카메라 권한을 허용해주세요</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mb-8">
            <Button onClick={handleTest} className="bg-blue-500 hover:bg-blue-600 text-white px-6">
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

          {/* Progress Indicator */}
          <div className="text-center">
            <span className="text-gray-500 text-lg">3/4</span>
          </div>
        </main>
      </div>
    </div>
  )
}

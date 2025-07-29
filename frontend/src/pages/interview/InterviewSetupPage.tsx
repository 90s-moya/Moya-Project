"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Camera } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function EnvironmentSetup() {
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isMicOn, setIsMicOn] = useState(false)
  const [isTestingMic, setIsTestingMic] = useState(false)
  const [micVolume, setMicVolume] = useState(0)
  const [micDetected, setMicDetected] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const navigate = useNavigate()

  const MIC_VOLUME_THRESHOLD = 15
  const MIC_SUCCESS_DURATION = 2000

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      setIsCameraOn(true)
      setupMicDetection(stream)
    } catch (error) {
      console.error("카메라/마이크 접근 오류:", error)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    setIsCameraOn(false)
    setIsMicOn(false)
    setMicVolume(0)
    setMicDetected(false)
  }

  const setupMicDetection = (stream: MediaStream) => {
    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    const micSource = audioContext.createMediaStreamSource(stream)

    analyser.fftSize = 256
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    micSource.connect(analyser)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    dataArrayRef.current = dataArray

    const startTime = Date.now()

    const updateVolume = () => {
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)
        const avg = dataArrayRef.current.reduce((acc, val) => acc + val, 0) / bufferLength
        setMicVolume(avg)

        if (avg > MIC_VOLUME_THRESHOLD) {
          setMicDetected(true)
          setIsMicOn(true)
        }

        if (isTestingMic) {
          if (avg > MIC_VOLUME_THRESHOLD) {
            setMicDetected(true)
          }
        }

        animationFrameRef.current = requestAnimationFrame(updateVolume)
      }
    }

    updateVolume()
  }

  const handleTest = () => {
    if (!isCameraOn) {
      startCamera()
    }
    setIsTestingMic(true)
    setTimeout(() => {
      setIsTestingMic(false)
    }, MIC_SUCCESS_DURATION)
  }

  const handleNext = () => {
    navigate("/interview/setup/completion")
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const isReadyToProceed = isCameraOn && isMicOn && micDetected

  return (
    <div className="min-h-screen bg-gray-300 p-6">
      <div className="mb-6">
        <h1 className="text-xl text-gray-600">AI면접 환경 설정(카메라, 마이크 확인)</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm max-w-5xl mx-auto">
        <header className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-blue-500">MOYA</div>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-700 hover:text-blue-500 font-medium">AI 모의 면접</a>
              <a href="#" className="text-gray-700 hover:text-blue-500 font-medium">면접 스터디</a>
              <a href="#" className="text-gray-700 hover:text-blue-500 font-medium">마이페이지</a>
            </nav>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">로그인</span>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white">00님</Button>
            </div>
          </div>
        </header>

        <main className="px-6 py-8">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-2">AI 면접을 위한 환경을 설정 해 주세요</h2>
            <p className="text-gray-600">원활한 면접을 위해 카메라, 마이크, 화면 구도를 점검합니다.</p>
          </div>

          <div className="flex gap-8 mb-8">
            <div className="flex-1">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
                {/* 웹캠 화면 */}
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* 화면 조정 가이드라인 오버레이 */}
                <svg
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <path
                    d="
                      M40,25
                      Q50,10 60,25
                      Q65,35 60,45
                      Q70,50 75,65
                      Q70,63 65,62
                      Q63,70 60,80
                      Q50,85 40,80
                      Q37,70 35,62
                      Q30,63 25,65
                      Q30,50 40,45
                      Q35,35 40,25
                      Z
                    "
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                </svg>

              </div>
              <div className="mt-2 text-sm text-gray-500">카메라 및 음성 테스트</div>
            </div>

            <div className="w-80 space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Camera className={`w-5 h-5 ${isCameraOn ? "text-green-500" : "text-gray-400"}`} />
                  <span className="text-sm">카메라</span>
                </div>
                <div className={`text-sm ${isCameraOn ? "text-green-600" : "text-gray-500"}`}>
                  {isCameraOn ? "연결됨" : "연결 대기중"}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mic className={`w-5 h-5 ${isMicOn ? "text-green-500" : "text-gray-400"}`} />
                  <span className="text-sm">마이크</span>
                </div>
                <div className={`text-sm ${isMicOn ? "text-green-600" : "text-gray-500"}`}>
                  {isMicOn ? "연결됨" : "연결 대기중"}
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">마이크 테스트</h3>
                <p className="text-sm text-gray-600 mb-3">화면 설정하기 텍스트를 읽어주세요</p>
                {(isTestingMic || micDetected) && (
                  <>
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      <span className="text-sm">음성 테스트 중...</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-200"
                        style={{ width: `${Math.min(micVolume, 100)}%` }}
                      ></div>
                    </div>
                  </>
                )}
              </div>

              <div className="text-xs text-gray-500">마이크와 카메라 권한을 허용해주세요</div>
            </div>
          </div>

          <div className="flex justify-end gap-4 mb-8">
            <Button onClick={handleTest} className="bg-blue-500 hover:bg-blue-600 text-white px-6">
              테스트하기
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isReadyToProceed}
              className={`px-8 ${
                isReadyToProceed
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              다음
            </Button>
          </div>

          <div className="text-center">
            <span className="text-gray-500 text-lg">3/4</span>
          </div>
        </main>
      </div>
    </div>
  )
}

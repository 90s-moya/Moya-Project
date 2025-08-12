"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Mic } from "lucide-react"
import Webcam from "react-webcam"
import { useNavigate } from "react-router-dom"

export default function InterviewSetupPage() {
  const webcamRef = useRef<Webcam>(null)
  const [micActive, setMicActive] = useState(false)
  const [faceDetected, setFaceDetected] = useState(true)
  const [audioLevel, setAudioLevel] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length
        setAudioLevel(avg)
        setMicActive(avg > 20)
        requestAnimationFrame(checkVolume)
      }

      checkVolume()
    })
  }, [])

  const handleRetry = () => {
    navigate("/interview/setup")
  }

  const handleStart = () => {
    navigate("/interview")
  }

  return (
    <div className="min-h-screen bg-gray-300 p-6">
      <div className="mb-6">
        <h1 className="text-xl text-blue-600 font-medium">AI면접 환경설정 완료</h1>
      </div>

      <div className="bg-white rounded-lg border-4 border-blue-500 max-w-5xl mx-auto p-8">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-gray-800">AI 면접을 위한 환경 설정이 완료되었습니다</h2>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative" style={{ aspectRatio: "16/10" }}>
            <div className="relative w-full h-full rounded overflow-hidden">
              <Webcam
                ref={webcamRef}
                audio={false}
                mirrored={true}
                className="w-full h-full object-cover"
              />
              <svg
                className="absolute top-0 left-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <path
                  d="M30,80 Q25,60 35,45 Q40,35 50,33 Q60,35 65,45 Q75,60 70,80 Z"
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>
          </div>

          <div className="w-72 bg-gray-700 p-4 space-y-3 rounded-lg">
            <div className="bg-green-600 bg-opacity-80 rounded-lg p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-medium text-sm">얼굴인식 성공</div>
                <div className="text-green-200 text-xs">정상적으로 얼굴을 인식하였습니다</div>
              </div>
            </div>

            <div className="bg-green-600 bg-opacity-80 rounded-lg p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-medium text-sm">음성인식 성공</div>
                <div className="text-green-200 text-xs">정상적으로 음성을 인식하였습니다</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <Button onClick={handleRetry} className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2">
            다시하기
          </Button>
          <Button
            onClick={handleStart}
            className={`px-8 py-2 text-white ${faceDetected && micActive ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-400 cursor-not-allowed"}`}
            disabled={!(faceDetected && micActive)}
          >
            시작하기
          </Button>
        </div>

        <div className="text-center mt-4">
          <span className="text-gray-500 text-lg font-medium">4/4</span>
        </div>
      </div>
    </div>
  )
}

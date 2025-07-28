"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Check, Mic, Play, Volume2, Settings, Maximize } from "lucide-react"

export default function SetupComplete() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(30)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleTryAgain = () => {
    window.history.back()
  }

  const handleStart = () => {
    alert("AI 면접을 시작합니다!")
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false)
            return 0
          }
          return prev + 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, duration])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gray-300 p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-xl text-blue-600 font-medium">AI면접 환경설정 완료</h1>
      </div>

      {/* Main Container with Blue Border */}
      <div className="bg-white rounded-lg border-4 border-blue-500 max-w-4xl mx-auto p-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-gray-800">AI 면접을 위한 환경 설정이 완료되었습니다 !!</h2>
        </div>

        {/* Video Player Interface */}
        <div className="mb-8">
          <div className="bg-gray-900 rounded-lg overflow-hidden relative">
            <div className="flex">
              {/* Video Area */}
              <div className="flex-1 relative" style={{ aspectRatio: "16/10" }}>
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  {/* 3D Character */}
                  <div className="text-center">
                    <div className="w-32 h-32 bg-yellow-400 rounded-full mx-auto mb-4 flex items-center justify-center relative">
                      <div className="w-24 h-24 bg-yellow-300 rounded-full flex items-center justify-center">
                        <span className="text-4xl">😊</span>
                      </div>
                      {/* Purple Suit Representation */}
                      <div className="absolute -bottom-8 w-40 h-20 bg-purple-600 rounded-t-full"></div>
                    </div>
                  </div>
                </div>

                {/* Video Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2">
                  <div className="flex items-center gap-2">
                    <button onClick={handlePlayPause} className="hover:bg-gray-700 p-1 rounded">
                      <Play className="w-4 h-4" fill={isPlaying ? "white" : "none"} />
                    </button>

                    <span className="text-xs">{formatTime(currentTime)}</span>

                    <div className="flex-1 bg-gray-600 h-1 rounded mx-2">
                      <div
                        className="bg-white h-1 rounded transition-all duration-1000"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Volume2 className="w-4 h-4" />
                      <Settings className="w-4 h-4" />
                      <Maximize className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Panel */}
              <div className="w-64 bg-gray-700 p-4 space-y-3">
                {/* Face Recognition Status */}
                <div className="bg-green-600 bg-opacity-80 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">얼굴인식 성공</div>
                    <div className="text-green-200 text-xs">정상적으로 얼굴을 인식하였습니다</div>
                  </div>
                </div>

                {/* Voice Recognition Status */}
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
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <Button onClick={handleTryAgain} className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2">
            다시하기
          </Button>
          <Button onClick={handleStart} className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2">
            시작하기
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="text-center">
          <span className="text-gray-500 text-lg font-medium">4/4</span>
        </div>
      </div>
    </div>
  )
}

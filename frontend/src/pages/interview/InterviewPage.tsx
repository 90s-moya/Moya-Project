"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff } from "lucide-react"

export default function InterviewScreen() {
  const [isMicOn, setIsMicOn] = useState(true)
  const [micLevel, setMicLevel] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Simulate microphone level animation
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isMicOn) {
      interval = setInterval(() => {
        setMicLevel(Math.random() * 100)
      }, 100)
    } else {
      setMicLevel(0)
    }
    return () => clearInterval(interval)
  }, [isMicOn])

  const toggleMic = () => {
    setIsMicOn(!isMicOn)
  }

  return (
    <div className="min-h-screen bg-gray-300 p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-xl text-blue-600 font-medium">AI면접 진행화면</h1>
      </div>

      {/* Main Container with Blue Border */}
      <div className="bg-white rounded-lg border-4 border-blue-500 max-w-6xl mx-auto">
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

        {/* Main Interview Area */}
        <main className="p-8">
          {/* AI Interviewer Video Area */}
          <div className="mb-8">
            <div
              className="w-full bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center"
              style={{ height: "400px" }}
            >
              {/* AI Interviewer Placeholder */}
              <div className="text-center">
                <div className="w-48 h-48 bg-gradient-to-b from-gray-200 to-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center relative overflow-hidden">
                  {/* Realistic AI Interviewer representation */}
                  <div className="w-full h-full bg-gradient-to-b from-pink-200 to-pink-300 rounded-full flex items-center justify-center">
                    <div className="text-6xl">👩‍💼</div>
                  </div>
                </div>
                <div className="text-gray-600">AI 면접관</div>
                <div className="text-sm text-gray-500 mt-2">
                  {isListening ? "답변을 듣고 있습니다..." : "질문을 준비 중입니다..."}
                </div>
              </div>
            </div>
          </div>

          {/* Microphone Volume Gauge */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={toggleMic}
                className={`p-3 rounded-full ${
                  isMicOn ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                } text-white transition-colors`}
              >
                {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>

              <div className="flex-1 max-w-md">
                <div className="text-sm text-gray-600 mb-2">마이크 볼륨 게이지 바</div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-100 ${
                      micLevel > 70 ? "bg-red-500" : micLevel > 40 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                    style={{ width: `${isMicOn ? micLevel : 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>낮음</span>
                  <span>적정</span>
                  <span>높음</span>
                </div>
              </div>

              <div className="text-sm text-gray-600">{isMicOn ? "마이크 켜짐" : "마이크 꺼짐"}</div>
            </div>
          </div>

          {/* Interview Controls */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => setIsListening(!isListening)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6"
            >
              {isListening ? "답변 완료" : "답변 시작"}
            </Button>
            <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-50 px-6 bg-transparent">
              면접 종료
            </Button>
          </div>
        </main>
      </div>
    </div>
  )
}

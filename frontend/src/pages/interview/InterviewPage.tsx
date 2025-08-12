"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff } from "lucide-react"
import aiCharacter from "@/assets/images/ai-character.png"

export default function InterviewScreen() {
  const [isMicOn, setIsMicOn] = useState(true)
  const [micLevel, setMicLevel] = useState(0)

  // 마이크 음량 시뮬레이션
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
    <div className="min-h-screen bg-gray-300 py-6 px-4">
      {/* 좌측 상단 제목 */}
      <div className="text-gray-600 text-lg font-medium mb-4">AI면접 진행화면</div>

      {/* 전체 박스 */}
      <div className="bg-white rounded-lg border-4 border-blue-500 max-w-6xl mx-auto">
        {/* 헤더 */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          {/* 로고 */}
          <div className="text-2xl font-bold text-blue-500">MOYA</div>

          {/* 네비게이션 */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-700 hover:text-blue-500 font-medium">AI 모의 면접</a>
            <a href="#" className="text-gray-700 hover:text-blue-500 font-medium">면접 스터디</a>
            <a href="#" className="text-gray-700 hover:text-blue-500 font-medium">마이페이지</a>
          </nav>

          {/* 로그인 상태 */}
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">로그인</span>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">00님</Button>
          </div>
        </header>

        {/* 본문 */}
        <main className="p-10 flex flex-col items-center justify-center">
        {/* AI 면접 영상 영역 */}
        <div className="w-full max-w-3xl h-[400px] bg-white flex flex-col  justify-center mb-8">
          <h3 className="text-lg font-semibold mb-4">Q. 당신의 장점을 설명해주세요.</h3>
          <img src={aiCharacter} alt="AI 면접관" className="object-contain max-h-full" />
        </div>


          {/* 마이크 볼륨 게이지 바
          <div className="w-full max-w-md bg-white border rounded-lg px-4 py-3 text-sm text-gray-700">
            <div className="mb-2">마이크 볼륨 게이지 바</div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  micLevel > 70 ? "bg-red-500" : micLevel > 40 ? "bg-yellow-500" : "bg-green-500"
                }`}
                style={{ width: `${isMicOn ? micLevel : 0}%` }}
              ></div>
            </div>
          </div> */}
        </main>
      </div>
    </div>
  )
}

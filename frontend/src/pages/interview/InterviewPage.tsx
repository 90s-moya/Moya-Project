"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff } from "lucide-react"
import aiCharacter from "@/assets/images/ai-character.png"
import Header from "@/components/common/Header"
import { useParams, useLocation } from "react-router-dom"

// 추가: 녹음 컴포넌트
import AnswerRecorder from "@/components/interview/AnswerRecorder"
import { type QuestionKey } from "@/types/interview"

export default function InterviewScreen() {
  const [isMicOn, setIsMicOn] = useState(true)
  const [micLevel, setMicLevel] = useState(0)

  // 라우터 params에서 sessionId, location.state로 질문 메타 받기
  const sessionId = localStorage.getItem("interviewSessionId")

  // location.state에 { order, subOrder, text } 형태로 전달 받는다고 가정
  // 그렇지만 localStorage에 저장했어요 ^0^
  const currentOrder = parseInt(localStorage.getItem("currentOrder") ?? "0", 10);
  const currentSubOrder = parseInt(localStorage.getItem("currentSubOrder") ?? "0", 10);
  const questionText = localStorage.getItem("questions")

  // AnswerRecorder에 넘길 keyInfo
  const keyInfo: QuestionKey = useMemo(
    () => ({ sessionId: sessionId ?? "", order: currentOrder, subOrder: currentSubOrder }),
    [sessionId, currentOrder, currentSubOrder]
  )

  // 마이크 음량 시뮬레이션
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (isMicOn) {
      interval = setInterval(() => {
        setMicLevel(Math.random() * 100)
      }, 100)
    } else {
      setMicLevel(0)
    }
    return () => interval && clearInterval(interval)
  }, [isMicOn])

  const toggleMic = () => setIsMicOn((v) => !v)

  return (
    <div className="min-h-screen bg-gray-300 py-6 px-4">
      {/* 좌측 상단 제목 */}
      <div className="text-gray-600 text-lg font-medium mb-4">AI면접 진행화면</div>

      {/* 전체 박스 */}
      <div className="bg-white rounded-lg border-4 border-blue-500 max-w-6xl mx-auto">
        {/* 헤더 */}
        <Header scrollBg={false} />

        {/* 본문 */}
        <main className="p-10 flex flex-col items-center justify-center mt-16">
          {/* AI 면접 영상 영역 */}
          <div className="w-full max-w-3xl h-[400px] bg-white flex flex-col justify-center mb-8">
            <h3 className="text-lg font-semibold mb-4">Q. {questionText}</h3>
            <img src={aiCharacter} alt="AI 면접관" className="object-contain max-h-full" />
          </div>

          {/* 녹음 컨트롤: sessionId/order/subOrder 기준으로 저장·업로드 */}
          <div className="w-full max-w-3xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600">
                순서 {currentOrder}-{currentSubOrder}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded">
                  <div
                    className="h-2 bg-blue-500 rounded"
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
                <Button variant="outline" onClick={toggleMic}>
                  {isMicOn ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
                  {isMicOn ? "마이크 켜짐" : "마이크 꺼짐"}
                </Button>
              </div>
            </div>

            {/* 녹음기 */}
            <AnswerRecorder keyInfo={keyInfo} />
          </div>
        </main>
      </div>
    </div>
  )
}

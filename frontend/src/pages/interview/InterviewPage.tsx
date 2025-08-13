"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff } from "lucide-react"
import aiCharacter from "@/assets/images/ai-character.png"
import Header from "@/components/common/Header"

// 추가: 녹음 컴포넌트
import AnswerRecorder from "@/components/interview/AnswerRecorder"
import { type QuestionKey } from "@/types/interview"

// 추가: 질문 재생(TTS) 컴포넌트 (speakSequence 기반)
import QuestionTTS from "@/components/interview/QuestionTTS"

export default function InterviewScreen() {
  const [isMicOn, setIsMicOn] = useState(true)
  const [micLevel, setMicLevel] = useState(0)

  // 질문 음성 종료 후 3초 대기 뒤, 답변 단계 시작 여부
  const [isAnswerPhase, setIsAnswerPhase] = useState(false)

  // 라우터 params에서 sessionId, location.state로 질문 메타 받기
  // 하지만 이것도 localStorage^0^
  const sessionId = localStorage.getItem("interviewSessionId")

  // location.state에 { order, subOrder, text } 형태로 전달 받는다고 가정
  // 그렇지만 localStorage에 저장했어요 ^0^
  const currentOrder = parseInt(localStorage.getItem("currentOrder") ?? "0", 10)
  const currentSubOrder = parseInt(localStorage.getItem("currentSubOrder") ?? "0", 10)

  // 질문 텍스트: "questions"가 배열 JSON일 수도 있으니 필요하면 파싱해서 현재 질문만 꺼내기
  const raw = localStorage.getItem("questions")
  const questionText = raw ?? "" // 필요 시 JSON.parse(raw)[index] 형태로 교체

  // TTS에서 읽을 키로 복사해 둠(QuestionTTS는 기본적으로 "lastQuestion"를 읽음)
  useEffect(() => {
    if (questionText) {
      localStorage.setItem("lastQuestion", questionText)
    }
  }, [questionText])

  // 질문 변경 시 재생 재시도를 위한 nonce
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    setNonce((n) => n + 1)
  }, [questionText])

  // AnswerRecorder에 넘길 keyInfo
  const keyInfo: QuestionKey = useMemo(
    () => ({ sessionId: sessionId ?? "", order: currentOrder, subOrder: currentSubOrder }),
    [sessionId, currentOrder, currentSubOrder]
  )

  // 마이크 음량 시뮬레이션(답변 단계에서만 동작)
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (isMicOn && isAnswerPhase) {
      interval = setInterval(() => {
        setMicLevel(Math.random() * 100)
      }, 100)
    } else {
      setMicLevel(0)
    }
    return () => interval && clearInterval(interval)
  }, [isMicOn, isAnswerPhase])

  const toggleMic = () => setIsMicOn((v) => !v)

  // 질문 음성 종료 후 3초 대기 뒤 호출될 콜백
  const startAnswerPhase = useCallback(() => {
    setIsAnswerPhase(true)
    // 필요하면 여기서 60초 타이머 시작, 녹음 자동 시작 로직 등을 호출
    // 예: useInterviewStore.getState().startAnswerTimer(60)
  }, [])

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
          {/* 질문 재생: localStorage("lastQuestion")를 읽어 자동 발화,
              음성 끝나면 3초 딜레이 후 startAnswerPhase 콜백 실행 */}
          <QuestionTTS
            autoplay
            storageKey="lastQuestion"
            lang="ko-KR"
            style="friendly"   // 말투 프리셋: neutral | friendly | assertive
            delayMs={3000}
            nonce={nonce}      // 질문 변경 시 재생 재시도
            onQuestionEnd={startAnswerPhase}
            // debug
          />

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

            {/* 답변 단계에 들어간 뒤에만 녹음기 노출(질문 음성 끝 + 3초 지연 이후) */}
            {isAnswerPhase && <AnswerRecorder keyInfo={keyInfo} />}
          </div>
        </main>
      </div>
    </div>
  )
}

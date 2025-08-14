"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff } from "lucide-react"
import aiCharacter from "@/assets/images/ai-character.png"
// import Header from "@/components/common/Header"

// 추가: 녹음 컴포넌트
import AnswerRecorder from "@/components/interview/AnswerRecorder"
import { type QuestionKey } from "@/types/interview"

// 추가: 질문 재생(TTS) 컴포넌트 (speakSequence 기반)
import QuestionTTS from "@/components/interview/QuestionTTS"

export default function InterviewScreen() {
  const [isMicOn, setIsMicOn] = useState(true)
  const [micLevel, setMicLevel] = useState(0)
  const [isWebcamVisible, setIsWebcamVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState(60) // 60초 타이머
  const [isRecording, setIsRecording] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

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

  // 질문이 바뀌면 답변 단계/타이머 리셋 (TTS는 바로 재생)
  useEffect(() => {
    setIsAnswerPhase(false)
    setTimeLeft(60)
    setIsRecording(false)
  }, [questionText])

  // AnswerRecorder에 넘길 keyInfo
  const keyInfo: QuestionKey = useMemo(
    () => ({ sessionId: sessionId ?? "", order: currentOrder, subOrder: currentSubOrder }),
    [sessionId, currentOrder, currentSubOrder]
  )

  // 실제 마이크 음량 측정
  useEffect(() => {
    if (!isMicOn || !isAnswerPhase) {
      setMicLevel(0)
      return
    }

    const startMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext()
        }
        
        const audioContext = audioContextRef.current
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        
        const microphone = audioContext.createMediaStreamSource(stream)
        microphoneRef.current = microphone
        
        microphone.connect(analyser)
        
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        
        const updateVolume = () => {
          if (!isMicOn || !isAnswerPhase) return
          
          analyser.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / bufferLength
          const normalizedLevel = (average / 255) * 100
          setMicLevel(Math.min(normalizedLevel * 2, 100)) // 증폭 및 최대값 제한
          
          requestAnimationFrame(updateVolume)
        }
        
        updateVolume()
      } catch (error) {
        console.error('마이크 접근 실패:', error)
        // 실패 시 시뮬레이션으로 대체
        const interval = setInterval(() => {
          if (isMicOn && isAnswerPhase) {
            setMicLevel(Math.random() * 100)
          }
        }, 100)
        return () => clearInterval(interval)
      }
    }
    
    startMicrophone()
    
    return () => {
      if (microphoneRef.current) {
        microphoneRef.current.disconnect()
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [isMicOn, isAnswerPhase])

  // 타이머 관리
  useEffect(() => {
    if (isRecording && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRecording(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording, timeLeft])

  const toggleMic = () => setIsMicOn((v) => !v)

  // 질문 음성 종료 후 3초 대기 뒤 호출될 콜백 (녹음 시작)
  const startAnswerPhase = useCallback(() => {
    setIsAnswerPhase(true)
    setTimeout(() => {
      setIsRecording(true)
    }, 3000)
  }, [])

  return (
    <div className="h-screen bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
      {/* 고정 헤더 */}
      {/* <Header scrollBg={false} /> */}

      {/* 본문 래퍼: 헤더 높이 보정 */}
      <div className="h-[calc(100vh-96px)]">
        <div className="max-w-6xl mx-auto h-full px-4">
          {/* 페이지 타이틀 */}
          {/* <div className="text-gray-900 text-2xl md:text-3xl font-extrabold tracking-tight mb-4">
            AI면접 진행화면
          </div> */}

          {/* 레이아웃: 세로 스택 (질문 / 면접관 / 컨트롤) */}
          <div className="flex flex-col h-[calc(100%-2rem)] gap-4">
            {/* 질문 영역 */}
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-md ring-1 ring-gray-100 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs md:text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1 rounded-full shadow">
                  Q{currentOrder}-{currentSubOrder}
                </span>
              </div>
              <h3 className="text-base md:text-lg font-semibold text-gray-800 leading-relaxed">
                {questionText}
              </h3>
            </div>

            {/* 면접관 + 타이머 */}
            <div className="flex-1 min-h-0 bg-white/90 backdrop-blur rounded-2xl shadow-md ring-1 ring-gray-100 p-5">
              {/* 타이머 바 */}
              {isAnswerPhase && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">남은 답변 시간</span>
                    <span className="text-sm font-bold text-blue-600">{timeLeft}s</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600 transition-all duration-1000 ease-linear"
                      style={{ width: `${(timeLeft / 60) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="h-[calc(100%-2rem)] grid place-items-center">
                <div className="w-4/5 aspect-[4/3]">
                  <img src={aiCharacter} alt="AI 면접관" className="w-full h-full object-cover rounded-xl" />
                </div>
              </div>
            </div>

            {/* 마이크 컨트롤 */}
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-md ring-1 ring-gray-100 p-4">
              <div className="flex items-center justify-between">
                {/* 세션 표시는 제거 */}
                <div className="flex-1" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden ring-1 ring-gray-200">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-100 ease-out"
                        style={{ width: `${micLevel}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 w-8 text-right">
                      {Math.round(micLevel)}%
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={toggleMic}>
                    {isMicOn ? <Mic className="w-4 h-4 mr-1" /> : <MicOff className="w-4 h-4 mr-1" />}
                    {isMicOn ? "마이크 켜짐" : "마이크 꺼짐"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* TTS 재생기 (자동 재생, 종료 후 3초 뒤 녹음 시작) */}
          <QuestionTTS
            autoplay
            storageKey="lastQuestion"
            lang="ko-KR"
            style="friendly"
            delayMs={3000}
            nonce={nonce}
            onQuestionEnd={startAnswerPhase}
          />
        </div>
      </div>

      {/* 우측 하단 웹캠: 초기 펼쳐진 상태, 사용자가 접기 가능 */}
      <div className="fixed bottom-6 right-6 z-30">
        <div className="bg-white rounded-xl shadow-lg ring-1 ring-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">내 모습</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsWebcamVisible(!isWebcamVisible)}
              className="h-6 w-6 p-0 hover:bg-gray-200"
            >
              {isWebcamVisible ? "−" : "+"}
            </Button>
          </div>
          {isWebcamVisible && (
            <div className="p-3">
              <AnswerRecorder
                keyInfo={keyInfo}
                ttsFinished={isAnswerPhase}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Settings } from "lucide-react"
import aiCharacter from "@/assets/images/ai-character.png"
import { useAnswerRecorder } from "@/lib/recording/useAnswerRecorder"
// import Header from "@/components/common/Header"

// 추가: 녹음 컴포넌트
import AnswerRecorder from "@/components/interview/AnswerRecorder"
import { type QuestionKey } from "@/types/interview"

// 추가: 질문 재생(TTS) 컴포넌트 (speakSequence 기반)
import QuestionTTS from "@/components/interview/QuestionTTS"

export default function InterviewScreen() {
  const [isMicOn, setIsMicOn] = useState(true)
  const [micLevel, setMicLevel] = useState(0)
  const [isWebcamVisible, setIsWebcamVisible] = useState(true) // 항상 true로 설정
  const [timeLeft, setTimeLeft] = useState(60)
  const [isRecording, setIsRecording] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const [isAnswerPhase, setIsAnswerPhase] = useState(false)
  const [isAIspeaking, setIsAIspeaking] = useState(false)

  const sessionId = localStorage.getItem("interviewSessionId")
  const currentOrder = parseInt(localStorage.getItem("currentOrder") ?? "0", 10)
  const currentSubOrder = parseInt(localStorage.getItem("currentSubOrder") ?? "0", 10)
  const totalQuestions = parseInt(localStorage.getItem("totalQuestions") ?? "10", 10)
  const raw = localStorage.getItem("questions")
  const questionText = raw ?? ""

  useEffect(() => {
    if (questionText) localStorage.setItem("lastQuestion", questionText)
  }, [questionText])

  const [nonce, setNonce] = useState(0)
  useEffect(() => { setNonce(n => n + 1) }, [questionText])

  // 질문이 바뀌면 답변 단계/타이머 리셋 (TTS는 바로 재생)
  useEffect(() => {
    setIsAnswerPhase(false)
    setTimeLeft(60)
    setIsRecording(false)
    setIsWebcamVisible(true) // 웹캠 항상 펼친 상태로 초기화
  }, [questionText])

  const keyInfo: QuestionKey = useMemo(
    () => ({ sessionId: sessionId ?? "", order: currentOrder, subOrder: currentSubOrder }),
    [sessionId, currentOrder, currentSubOrder]
  )

  // 단일 녹음 훅 인스턴스 생성 (상위로 끌어올림)
  const { start, stop, isRecording: recIsRecording, error: recError, videoStream } = useAnswerRecorder({ key: keyInfo })

  useEffect(() => {
    if (!isMicOn || !isAnswerPhase) {
      setMicLevel(0)
      return
    }

    const startMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
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
          setMicLevel(Math.min(normalizedLevel * 2, 100))
          
          requestAnimationFrame(updateVolume)
        }
        
        updateVolume()
      } catch (error) {
        console.error("마이크 접근 실패:", error)
        const interval = setInterval(() => {
          if (isMicOn && isAnswerPhase) setMicLevel(Math.random() * 100)
        }, 100)
        return () => clearInterval(interval)
      }
    }
    
    startMicrophone()
    
    return () => {
      if (microphoneRef.current) microphoneRef.current.disconnect()
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close()
      }
    }
  }, [isMicOn, isAnswerPhase])

  useEffect(() => {
    if (isRecording && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { setIsRecording(false); return 0 }
          return prev - 1
        })
      }, 1000)
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isRecording, timeLeft])

  const toggleMic = () => setIsMicOn(v => !v)

  const startAnswerPhase = useCallback(() => {
    setIsAnswerPhase(true)
    setTimeout(() => { setIsRecording(true) }, 3000)
  }, [])

  // ✅ 질문 표시 후 8초 대기하여 답변 시간으로 전환
  useEffect(() => {
    if (questionText) {
      // 질문이 로드되면 AI 말하는 상태로 설정
      setIsAIspeaking(true)
      
      // 8초 후 답변 시간으로 전환
      const timer = setTimeout(() => {
        setIsAIspeaking(false)
        startAnswerPhase()
      }, 8000) // 8초
      
      return () => clearTimeout(timer)
    }
  }, [questionText, startAnswerPhase])

  const stopRecording = () => {
    setIsRecording(false)
    setTimeLeft(60)
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0")
    const s = Math.floor(sec % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }
  const TOTAL = 60
  const elapsed = Math.max(0, TOTAL - timeLeft)
  const progressPct = Math.min(100, (elapsed / TOTAL) * 100)

  return (
    <div className="h-screen bg-white relative overflow-hidden">
      {/* 상단 바 */}
      <div className="w-full py-5 px-8 flex items-center justify-between">
        {/* 질문번호: 우리 포맷 Q{order}-{subOrder} */}
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-blue-100 text-blue-700 font-semibold shadow-sm">
          <span>{`Q${currentOrder}${currentSubOrder > 0 ? `-${currentSubOrder}` : ""}`}</span>
        </div>
        {/* 질문 텍스트 */}
        <div className="mx-6 flex-1 text-center text-gray-900 text-lg md:text-xl font-medium truncate">
          {questionText}
        </div>
        <div className="text-gray-800 font-extrabold tracking-tight">AI 기술면접</div>
      </div>

      {/* 중앙 캔버스 */}
      <div className="px-6 pb-[112px] h-[calc(100vh-120px)]">
        <div className="relative h-full rounded-[28px] bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 shadow-inner overflow-hidden">
          {/* 가운데 큰 패널 (가로폭 살짝 축소) */}
          <div className="absolute inset-0 p-10 flex flex-col">
            <div className="flex-1 grid place-items-center">
              <div className="w-[68%] lg:w-[64%] max-w-[720px] aspect-[4/3] rounded-[24px] border border-white/18 bg-gradient-to-b from-slate-800 to-slate-700 shadow-2xl grid place-items-center">
                <img src={aiCharacter} alt="AI 면접관" className="object-contain p-5" />
              </div>
            </div>

            {/* 중앙 내부 하단 진행 표시 */}
            {isAnswerPhase && (
              <div className="mt-4 w-[68%] lg:w-[64%] max-w-[720px] mx-auto">
                <div className="flex items-center justify-between text-white/90 mb-2">
                  <span className="text-sm">남은 답변 시간</span>
                  <span className="text-sm font-semibold">
                    {formatTime(timeLeft)} / {formatTime(TOTAL)}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/25 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-400 transition-all duration-300"
                    style={{ width: `${100 - (recIsRecording ? progressPct : 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 우하단 내 화면 카드 - 항상 표시되며 토글 기능 없음 */}
          <div className="absolute bottom-6 right-6 z-10 w-[300px]">
            {/* AI 말하기 표시 */}
            {isAIspeaking && (
              <div className="mb-2 text-xs text-white/90 bg-white/10 px-2 py-1 rounded-full inline-flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span>AI가 말하는 중…</span>
              </div>
            )}
            <AnswerRecorder
              keyInfo={keyInfo}
              ttsFinished={isAnswerPhase}
              start={start}
              stop={stop}
              isRecording={recIsRecording}
              error={recError}
              videoStream={videoStream}
            />
          </div>
        </div>
      </div>

      {/* 하단 고정 컨트롤 바 */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur shadow-[0_-10px_28px_rgba(0,0,0,0.08)]">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between gap-6">
          {/* 좌측: 답변 시간(남은) */}
          <div className="text-gray-700 text-sm">
            답변 시간
            <div className="text-2xl font-extrabold text-gray-900 mt-1">{formatTime(timeLeft)}</div>
          </div>

          {/* 중앙: 전체 진행 바 */}
          <div className="flex-1 max-w-3xl">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>남은 시간</span>
              <span className="font-semibold text-emerald-600">{formatTime(elapsed)} / {formatTime(TOTAL)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* 우측: 마이크/설정/다음 */}
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-full grid place-items-center shadow ring-1 ${isMicOn ? "bg-blue-500 text-white ring-blue-500/50" : "bg-gray-200 text-gray-600 ring-gray-300"}`}
              onClick={toggleMic}
              role="button"
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </div>
            <div className="w-12 h-12 rounded-full grid place-items-center shadow bg-gray-100 text-gray-700 ring-1 ring-gray-200">
              <Settings className="w-5 h-5" />
            </div>

            {/* '녹음 종료' 버튼 */}
            <Button
              className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white"
              onClick={stop}
            >
              녹음 종료
            </Button>
          </div>
        </div>
      </div>

      {/* ✅ TTS 비활성화 - 8초 후 답변 시간으로 전환 */}
      {/* <QuestionTTS
        autoplay
        storageKey="lastQuestion"
        lang="ko-KR"
        style="friendly"
        delayMs={3000}
        nonce={nonce}
        onStart={() => setIsAIspeaking(true)}
        onQuestionEnd={() => { setIsAIspeaking(false); startAnswerPhase(); }}
      /> */}
    </div>
  )
}

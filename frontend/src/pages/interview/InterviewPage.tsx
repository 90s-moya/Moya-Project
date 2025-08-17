"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Settings, Loader2 } from "lucide-react"
import aiCharacter from "@/assets/images/interviewer_version_1.jpg"
import aiInterview from "@/assets/images/ai-character.png"
import { useAnswerRecorder } from "@/lib/recording/useAnswerRecorder"
import AnswerRecorder from "@/components/interview/AnswerRecorder"
import { type QuestionKey } from "@/types/interview"
import { useNavigate } from "react-router-dom"

export default function InterviewScreen() {
  const navigate = useNavigate()
  const [isMicOn, setIsMicOn] = useState(true)
  const [micLevel, setMicLevel] = useState(0)
  const [isWebcamVisible, setIsWebcamVisible] = useState(true)
  const [isAnswerPhase, setIsAnswerPhase] = useState(false)
  const [isAIspeaking, setIsAIspeaking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)

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

  // 질문이 바뀌면 답변 단계/웹캠/로딩 상태 리셋
  useEffect(() => {
    setIsAnswerPhase(false)
    setIsWebcamVisible(true)
    setIsSubmitting(false) // 다음 질문 렌더링 시 로딩 해제 및 버튼 재활성화
  }, [questionText])

  const keyInfo: QuestionKey = useMemo(
    () => ({ sessionId: sessionId ?? "", order: currentOrder, subOrder: currentSubOrder }),
    [sessionId, currentOrder, currentSubOrder]
  )

  // 면접 완료 시 라우팅 처리
  const handleInterviewFinished = useCallback(() => {
    console.log("🚀 InterviewPage: 면접 완료! InterviewFinish 페이지로 이동")
    navigate("/interview/finish")
  }, [navigate])

  // 자동 종료 시 로딩 상태 설정
  const handleAutoStop = useCallback(() => {
    console.log("🚀 InterviewPage: 1분 자동 종료 - 로딩 상태 설정")
    setIsSubmitting(true)
  }, [])

  // useAnswerRecorder의 타이머/상태 사용
  const {
    start,
    stop,
    isRecording: recIsRecording,
    seconds: recSeconds,
    error: recError,
    videoStream
  } = useAnswerRecorder({ 
    key: keyInfo,
    onUploadComplete: () => setIsSubmitting(false),
    onInterviewFinished: handleInterviewFinished,
    onAutoStop: handleAutoStop
  })

  // keyInfo가 바뀔 때마다 로딩 상태 리셋 (질문 변경 시)
  useEffect(() => {
    setIsSubmitting(false)
  }, [keyInfo.sessionId, keyInfo.order, keyInfo.subOrder])

  // 마이크 레벨 표시
  useEffect(() => {
    if (!isMicOn || !isAnswerPhase) {
      setMicLevel(0)
      return
    }
    const startMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext ||
            (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
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
      } catch {
        const id = setInterval(() => {
          if (isMicOn && isAnswerPhase) setMicLevel(Math.random() * 100)
        }, 100)
        return () => clearInterval(id)
      }
    }
    startMicrophone()
    return () => {
      if (microphoneRef.current) microphoneRef.current.disconnect()
      if (audioContextRef.current && audioContextRef.current.state !== "closed") audioContextRef.current.close()
    }
  }, [isMicOn, isAnswerPhase])

  const toggleMic = () => setIsMicOn(v => !v)

  const startAnswerPhase = useCallback(() => {
    setIsAnswerPhase(true)
  }, [])

  // 질문 표시 후 즉시 답변 단계로 전환 (8초 타이머 제거)
  useEffect(() => {
    if (!questionText) return
    setIsAIspeaking(false)  // AI 말하기 상태는 false로 유지
    startAnswerPhase()       // 즉시 답변 단계로 전환
  }, [questionText, startAnswerPhase])

  // 표시용 시간/진행률
  const TOTAL = 60
  const elapsed = Math.min(recSeconds, TOTAL)
  const timeLeft = Math.max(0, TOTAL - elapsed)
  const progressPct = Math.min(100, (elapsed / TOTAL) * 100)

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0")
    const s = Math.floor(sec % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  // 한 번만 작동하도록 가드 + 로딩 오버레이 표시
  const handleStopClick = () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    stop() // onstop에서 업로드 수행
    // 라우팅으로 화면 전환되면 언마운트되며 오버레이 자동 해제
  }

  return (
    <div className="h-screen bg-white relative overflow-hidden" aria-busy={isSubmitting}>
      {/* 상단 바 */}
      <div className="w-full py-5 px-8 flex items-center justify-between">
        <div className="flex-1"></div>
        {/* AI 면접 안내 + 캐릭터 이미지 */}
        <div className="flex items-center gap-2">
          <img src={aiInterview} alt="AI 면접관" className="w-8 h-8 rounded-full object-cover border-2 border-blue-200 shadow-sm" style={{ minWidth: 32, minHeight: 32 }} />
          <span className="text-blue-700 font-extrabold tracking-tight text-base md:text-lg whitespace-nowrap">AI 면접</span>
        </div>
      </div>

      {/* 중앙 캔버스 */}
      <div className="px-6 pb-[112px] h-[calc(100vh-120px)]">
        
          <div className="absolute inset-0 p-10 flex flex-col">
            <div className="flex-1 grid place-items-center">
              <div className="flex flex-col items-center w-full max-w-6xl">
                {/* AI 면접관 이미지 */}
                <div className="w-3/5 min-w-md max-w-4xl aspect-[16/9]">
                  <img src={aiCharacter} alt="AI 면접관" className="w-full h-full object-cover rounded-lg" />
                </div>
                {/* AI 면접관 밑에 질문번호와 질문 텍스트 표시 - 더 넓은 너비 */}
                <div className="mt-8 w-full max-w-7xl flex justify-center px-4">
                  <div className="flex items-center gap-4">
                    <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-blue-100 text-blue-700 font-semibold shadow-sm flex-shrink-0">
                      <span>{`Q${currentOrder}${currentSubOrder > 0 ? `-${currentSubOrder}` : ""}`}</span>
                    </div>
                    <div className="text-gray-900 text-2xl font-medium">
                      {questionText}
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 우하단 내 화면 카드 */}
          <div className="absolute bottom-[30%] right-6 z-10 w-[300px] shadow-lg">
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

      {/* 하단 고정 컨트롤 바 */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur shadow-[0_-10px_28px_rgba(0,0,0,0.08)]">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between gap-6">
          <div className="text-gray-700 text-sm">
            남은 시간
            <div className="text-2xl font-extrabold text-gray-900 mt-1">{formatTime(timeLeft)}</div>
          </div>

          <div className="flex-1 max-w-3xl">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>진행 시간</span>
              <span className="font-semibold text-emerald-600">
                {formatTime(elapsed)} / {formatTime(TOTAL)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 통합 녹음 시작/종료 버튼 */}
            <Button
              className={`h-12 px-6 rounded-2xl text-white ${
                isSubmitting 
                  ? "bg-gray-300 cursor-not-allowed" 
                  : recIsRecording 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-green-600 hover:bg-green-700"
              }`}
              onClick={recIsRecording ? handleStopClick : start}
              disabled={isSubmitting || !isAnswerPhase}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  업로드 중
                </span>
              ) : recIsRecording ? (
                "답변 종료"
              ) : (
                "답변 시작"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 전체 화면 로딩 오버레이 */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm grid place-items-center">
          <div className="rounded-2xl bg-white shadow-2xl px-6 py-5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <div className="text-sm font-medium text-gray-900">다음 질문을 생성 중입니다… 잠시만 기다려주세요</div>
          </div>
        </div>
      )}
    </div>
  )
}

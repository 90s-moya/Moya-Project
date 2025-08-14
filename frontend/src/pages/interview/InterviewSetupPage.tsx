"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Webcam from "react-webcam"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import Header from "@/components/common/Header"
import ReadyModal from "@/components/interview/ReadyModal"
import WebCalibration from "@/components/interview/WebCalibration"

enum TestStatus { NotStarted, Testing, Completed, EyeTracking }

function CountdownOverlay({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => { setLeft(seconds); const id = setInterval(() => setLeft(v => (v <= 1 ? 0 : v - 1)), 1000); return () => clearInterval(id) }, [seconds])
  useEffect(() => { if (left === 0) onDone() }, [left, onDone])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div aria-live="assertive" className="text-white text-[96px] md:text-[120px] font-bold leading-none select-none drop-shadow">{left}</div>
    </div>
  )
}

export default function InterviewSetupPage() {
  const webcamRef = useRef<Webcam>(null)
  const [testStatus, setTestStatus] = useState<TestStatus>(TestStatus.NotStarted)
  const [micLevel, setMicLevel] = useState(0)
  const [micReady, setMicReady] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [micLabel, setMicLabel] = useState("")
  const [cameraLabel, setCameraLabel] = useState("")
  const [readyOpen, setReadyOpen] = useState(false)
  const [countdownOn, setCountdownOn] = useState(false)
  const [calibrationOpen, setCalibrationOpen] = useState(false)
  const [eyeTrackingReady, setEyeTrackingReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (micReady && cameraReady && !eyeTrackingReady) setTestStatus(TestStatus.Completed)
    else if (micReady && cameraReady && eyeTrackingReady) setTestStatus(TestStatus.EyeTracking)
  }, [micReady, cameraReady, eyeTrackingReady])

  const resetState = () => {
    setMicLevel(0); setMicReady(false); setCameraReady(false); setEyeTrackingReady(false); setTestStatus(TestStatus.NotStarted)
  }

  const startTest = async () => {
    setTestStatus(TestStatus.Testing)
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevice = devices.find((d) => d.kind === "videoinput")
    const audioDevice = devices.find((d) => d.kind === "audioinput")
    if (videoDevice) { setCameraLabel(videoDevice.label || "카메라 감지됨"); setCameraReady(true) }
    if (audioDevice) { setMicLabel(audioDevice.label || "마이크 감지됨") }
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setMicLevel(avg); setMicReady(avg > 15); requestAnimationFrame(checkVolume)
      }
      checkVolume()
    })
  }

  const startEyeTracking = () => { if (testStatus !== TestStatus.Completed) return; setCalibrationOpen(true) }
  const handleCalibrationComplete = (calibrationData: any) => { console.log('Calibration completed:', calibrationData); setEyeTrackingReady(true); setCalibrationOpen(false) }
  const handleCalibrationCancel = () => { setCalibrationOpen(false) }

  const openReady = () => {
    if (testStatus !== TestStatus.EyeTracking) return
    try { /* @ts-ignore */ if (window?.webAudioCtx && window.webAudioCtx.state === "suspended") { /* @ts-ignore */ window.webAudioCtx.resume() } } catch {}
    setReadyOpen(true)
  }
  const handleReadyStart = () => { setReadyOpen(false); setCountdownOn(true) }
  const handleCountdownDone = useCallback(() => { setCountdownOn(false); navigate("/interview", { state: { audioUnlocked: true } }) }, [navigate])

  // === 스타일만 개선 ===
  const isReadyToStart = testStatus === TestStatus.EyeTracking
  const statusBadge =
    testStatus === TestStatus.NotStarted ? "bg-slate-100 text-slate-700"
    : testStatus === TestStatus.Testing ? "bg-amber-50 text-amber-700"
    : isReadyToStart ? "bg-emerald-50 text-emerald-700"
    : "bg-blue-50 text-blue-700"

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Header scrollBg={false} />

      {/* 히어로 + 단계 진행 바 */}
      <div className="mx-auto max-w-6xl px-6 pt-24">
        <div className="flex items-start justify-between">
          <div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border shadow-sm ${statusBadge} border-slate-200`}>
              {testStatus === TestStatus.NotStarted && "STEP 3/4"}
              {testStatus === TestStatus.Testing && "STEP 3/4 · 장치 확인 중"}
              {testStatus === TestStatus.Completed && "STEP 3/4 · 시선 추적 설정 필요"}
              {testStatus === TestStatus.EyeTracking && "STEP 3/4 · 시작 준비 완료"}
            </span>
            <h1 className="mt-3 text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
              AI 면접 환경 설정
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              카메라/마이크를 점검하고 시선 추적을 설정한 뒤 면접을 시작하세요.
            </p>
          </div>
          <div className="hidden md:block w-64">
            <div className="h-2 w-full rounded-full bg-slate-200">
              <div className={`h-2 rounded-full ${isReadyToStart ? "bg-emerald-500 w-[75%]" : "bg-blue-500 w-[65%]"}`} />
            </div>
            <p className="mt-2 text-xs text-right text-slate-500">3/4</p>
          </div>
        </div>
      </div>

      {/* 본문 카드 (하단 고정바와 겹치지 않게 pb-28) */}
      <div className="mx-auto max-w-6xl px-6 py-8 pb-28">
        <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8">
            {/* 웹캠 + 마이크 게이지 */}
            <div>
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0,rgba(59,130,246,0.06),transparent_45%),radial-gradient(circle_at_85%_100%,rgba(15,23,42,0.05),transparent_45%)] pointer-events-none" />
                <div className="aspect-video w-full">
                  <Webcam ref={webcamRef} audio={false} className="h-full w-full object-cover" mirrored />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
                <span>마이크 감지</span>
                <span className={micReady ? "text-emerald-600 font-medium" : "text-slate-500"}>
                  {micReady ? "충분" : "말씀해 보세요"}
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${micReady ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-blue-400 to-blue-600"}`}
                  style={{ width: `${testStatus !== TestStatus.NotStarted ? Math.min(micLevel * 2, 100) : 0}%` }}
                />
              </div>

              <p className="mt-3 text-xs text-slate-500">
                평소 말하듯이 아래 문장을 읽어주세요. 충분히 감지되면 다음 단계가 활성화됩니다.
              </p>
            </div>

            {/* 상태 패널 */}
            <div className="space-y-4">
              <div className={`rounded-xl p-4 border ${cameraReady ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                <div className="text-sm font-semibold text-slate-900">카메라</div>
                <div className="mt-1 text-xs text-slate-600">
                  {testStatus === TestStatus.Completed || testStatus === TestStatus.EyeTracking
                    ? "확인 성공! 카메라가 정상적으로 작동합니다."
                    : (cameraLabel || "카메라 장치를 찾는 중...")}
                </div>
              </div>

              <div className={`rounded-xl p-4 border ${micReady ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                <div className="text-sm font-semibold text-slate-900">마이크</div>
                <div className="mt-1 text-xs text-slate-600">
                  {micReady ? "확인 성공! 마이크가 정상적으로 작동합니다." : (micLabel || "마이크 장치를 찾는 중...")}
                </div>
              </div>

              <div className={`rounded-xl p-4 border ${eyeTrackingReady ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                <div className="text-sm font-semibold text-slate-900">시선 추적</div>
                <div className="mt-1 text-xs text-slate-600">
                  {eyeTrackingReady ? "캘리브레이션 완료! 시선 추적이 준비되었습니다." : "시선 추적 캘리브레이션이 필요합니다."}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-700 mb-2">읽기 문장</div>
                <textarea
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  readOnly
                  defaultValue="안녕하세요 저는 이번에 모의 AI 면접에 참여하게 된 지원자입니다."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 고정 CTA 바 (항상 노출) */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto max-w-6xl px-6 py-3 flex flex-wrap items-center justify-center gap-3">
          {testStatus === TestStatus.NotStarted && (
            <Button onClick={startTest} className="h-11 rounded-full px-7 text-base bg-blue-600 hover:bg-blue-700 focus-visible:ring-4 focus-visible:ring-blue-200">
              테스트하기
            </Button>
          )}

          {testStatus === TestStatus.Completed && (
            <>
              <Button onClick={resetState} variant="outline" className="h-11 rounded-full px-7 text-base border-slate-300 hover:bg-slate-50">
                테스트 다시하기
              </Button>
              <Button onClick={startEyeTracking} className="h-11 rounded-full px-7 text-base bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-4 focus-visible:ring-emerald-200">
                시선 추적 설정
              </Button>
            </>
          )}

          {testStatus === TestStatus.EyeTracking && (
            <>
              <Button onClick={resetState} variant="outline" className="h-11 rounded-full px-7 text-base border-slate-300 hover:bg-slate-50">
                테스트 다시하기
              </Button>
              <Button onClick={openReady} className="h-11 rounded-full px-7 text-base bg-blue-600 hover:bg-blue-700 focus-visible:ring-4 focus-visible:ring-blue-200">
                면접 시작하기
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 모달/오버레이/캘리브레이션 (로직 그대로) */}
      <ReadyModal open={readyOpen} onClose={() => setReadyOpen(false)} onStart={handleReadyStart} />
      {countdownOn && <CountdownOverlay seconds={3} onDone={handleCountdownDone} />}
      <WebCalibration isOpen={calibrationOpen} onComplete={handleCalibrationComplete} onCancel={handleCalibrationCancel} />
    </div>
  )
}

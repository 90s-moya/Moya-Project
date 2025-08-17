"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Webcam from "react-webcam"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import Header from "@/components/common/Header"
import ReadyModal from "@/components/interview/ReadyModal"

import CountdownOverlay from "@/components/interview/CountdownOverLay"




enum TestStatus {
  NotStarted,
  Testing,
  Completed
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



  const navigate = useNavigate()

  useEffect(() => {
    // 카메라와 마이크만 준비되면 바로 면접 준비 완료
    if (micReady && cameraReady) setTestStatus(TestStatus.Completed)
  }, [micReady, cameraReady])

  const resetState = () => {
    setMicLevel(0); setMicReady(false); setCameraReady(false); setTestStatus(TestStatus.NotStarted)
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



  // 준비 안내 열기 (오디오 자동재생 정책 우회용 사용자 클릭 시점)
  const openReady = () => {
    if (testStatus !== TestStatus.Completed) return
    try {
      // @ts-expect-error - webAudioCtx는 전역 객체에 동적으로 추가됨
      if (window?.webAudioCtx && window.webAudioCtx.state === "suspended") {
        // @ts-expect-error - webAudioCtx는 전역 객체에 동적으로 추가됨
        window.webAudioCtx.resume()
      }
    } catch (error) {
      console.warn('오디오 컨텍스트 재개 실패:', error);
    }
    setReadyOpen(true)
  }
  const handleReadyStart = () => { setReadyOpen(false); setCountdownOn(true) }
  const handleCountdownDone = useCallback(() => { setCountdownOn(false); navigate("/interview", { state: { audioUnlocked: true } }) }, [navigate])

  // === 스타일만 개선 ===
  const isReadyToStart = testStatus === TestStatus.Completed
  const statusBadge =
    testStatus === TestStatus.NotStarted ? "bg-slate-100 text-slate-700"
    : testStatus === TestStatus.Testing ? "bg-amber-50 text-amber-700"
    : isReadyToStart ? "bg-emerald-50 text-emerald-700"
    : "bg-blue-50 text-blue-700"

   return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 font-['Pretendard']">
      <Header scrollBg={false} />

      {/* Enhanced hero + progress bar */}
      <div className="mx-auto max-w-6xl px-6 pt-24">
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <span className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold border shadow-lg ${statusBadge} border-slate-200`}>
                {testStatus === TestStatus.NotStarted && "STEP 3/4"}
                {testStatus === TestStatus.Testing && "STEP 3/4 · 장치 확인 중"}
                {testStatus === TestStatus.Completed && "STEP 3/4 · 시작 준비 완료"}
              </span>
            </div>
            
            <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                AI 면접 환경 설정
              </h1>
            </div>
            
            <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <p className="text-lg text-slate-700 max-w-2xl">
                카메라/마이크를 점검한 뒤 <span className="font-semibold text-blue-600">면접을 시작</span>하세요
              </p>
            </div>
          </div>
          
          {/* <div className="hidden md:block w-64 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <div className="h-3 w-full rounded-full bg-slate-200 shadow-inner">
              <div className={`h-3 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 transition-all duration-1000 ease-out ${isReadyToStart ? "w-[75%]" : "w-[65%]"}`} />
            </div>
            <p className="mt-2 text-sm text-right text-slate-500 font-medium">3/4</p>
          </div> */}
        </div>
      </div>

      {/* Enhanced main content card */}
      <div className="mx-auto max-w-6xl px-6 py-5 pb-23">
        <div className="rounded-3xl border border-slate-200/60 bg-white/90 backdrop-blur-sm shadow-2xl shadow-slate-200/50 p-8 md:p-10 animate-fade-in-up" style={{ animationDelay: '1s' }}>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_350px] gap-10">
            {/* Enhanced webcam + mic gauge */}
            <div className="space-y-1">
              <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200/60 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 shadow-xl shadow-slate-200/30">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0,rgba(59,130,246,0.08),transparent_45%),radial-gradient(circle_at_85%_100%,rgba(15,23,42,0.06),transparent_45%)] pointer-events-none" />
                <div className="aspect-video w-full relative">
                  <Webcam ref={webcamRef} audio={false} className="h-full w-full object-cover" mirrored />
                  {/* Webcam overlay */}
                  <div className="absolute inset-0 border-2 border-blue-200/40 rounded-2xl pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>마이크 감지</span>
                  <span className={micReady ? "text-emerald-600" : "text-slate-500"}>
                    {micReady ? "감지됨" : "말씀해 보세요"}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden shadow-inner">
                  <div
                    className={`h-full transition-all duration-500 ease-out rounded-full ${
                      micReady 
                        ? "bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25" 
                        : "bg-gradient-to-r from-blue-400 to-indigo-600 shadow-lg shadow-blue-500/25"
                    }`}
                    style={{ width: `${testStatus !== TestStatus.NotStarted ? Math.min(micLevel * 2, 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Enhanced status panel */}
            <div className="space-y-5">
              {[
                {
                  title: "카메라",
                  status: cameraReady,
                  description: testStatus === TestStatus.Completed
                    ? "확인 성공! 카메라가 정상적으로 작동합니다"
                    : (cameraLabel || "카메라 장치를 찾는 중..."),
                  color: cameraReady ? "from-emerald-500 to-emerald-600" : "from-slate-400 to-slate-500"
                },
                {
                  title: "마이크",
                  status: micReady,
                  description: micReady ? "확인 성공! 마이크가 정상적으로 작동합니다" : (micLabel || "마이크 장치를 찾는 중..."),
                  color: micReady ? "from-emerald-500 to-emerald-600" : "from-slate-400 to-slate-500"
                },

              ].map((item, index) => (
                <div
                  key={index}
                  className={`group relative rounded-2xl p-5 border-2 transition-all duration-300 transform hover:scale-105 ${
                    item.status 
                      ? "border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 shadow-lg shadow-emerald-200/50" 
                      : "border-slate-200/60 bg-white/80 backdrop-blur-sm hover:border-blue-200/60 hover:shadow-lg hover:shadow-blue-100/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-base font-bold text-slate-900">{item.title}</div>
                  </div>
                  <div className="text-sm text-slate-700 leading-relaxed">
                    {item.description}
                  </div>
                  
                  {/* Status indicator */}
                  <div className={`absolute top-3 right-3 h-4 w-4 rounded-full bg-gradient-to-r ${item.color} shadow-lg ${item.status ? 'animate-pulse' : ''}`} />
                </div>
              ))}

              
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced bottom CTA bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-blue-200/60 bg-white/90 backdrop-blur-sm supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto max-w-6xl px-6 py-4 flex flex-wrap items-center justify-center gap-4">
          {testStatus === TestStatus.NotStarted && (
            <Button 
              onClick={startTest} 
              className="group relative h-12 px-8 rounded-2xl text-base font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:via-indigo-700 hover:to-cyan-700 focus-visible:ring-4 focus-visible:ring-blue-200/50 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 active:scale-95"
            >
              <span className="relative z-10">테스트하기</span>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
          )}

          {testStatus === TestStatus.Completed && (
            <>
              <Button 
                onClick={resetState} 
                variant="outline" 
                className="h-12 px-8 rounded-2xl text-base font-semibold border-2 border-slate-300 hover:bg-slate-50 hover:border-blue-300 transition-all duration-200"
              >
                테스트 다시하기
              </Button>
              <Button 
                onClick={openReady} 
                className="group relative h-12 px-8 rounded-2xl text-base font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:via-indigo-700 hover:to-cyan-700 focus-visible:ring-4 focus-visible:ring-blue-200/50 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25"
              >
                <span className="relative z-10">면접 시작하기</span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Modals/overlays */}
      <ReadyModal open={readyOpen} onClose={() => setReadyOpen(false)} onStart={handleReadyStart} />
      {countdownOn && <CountdownOverlay seconds={3} onDone={handleCountdownDone} />}

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  )
}


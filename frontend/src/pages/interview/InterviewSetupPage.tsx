"use client"

import { useEffect, useRef, useState } from "react"
import Webcam from "react-webcam"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import Header from "@/components/common/Header"

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
  const navigate = useNavigate()

  // ✅ 완료 조건 모니터링
  useEffect(() => {
    if (micReady && cameraReady) {
      setTestStatus(TestStatus.Completed)
    }
  }, [micReady, cameraReady])

  const resetState = () => {
    setMicLevel(0)
    setMicReady(false)
    setCameraReady(false)
    setTestStatus(TestStatus.NotStarted)
  }

  const startTest = async () => {
    setTestStatus(TestStatus.Testing)

    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevice = devices.find((d) => d.kind === "videoinput")
    const audioDevice = devices.find((d) => d.kind === "audioinput")

    if (videoDevice) {
      setCameraLabel(videoDevice.label || "카메라 감지됨")
      setCameraReady(true)
    }

    if (audioDevice) {
      setMicLabel(audioDevice.label || "마이크 감지됨")
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length
        setMicLevel(avg)
        setMicReady(avg > 15)
        requestAnimationFrame(checkVolume)
      }

      checkVolume()
    })
  }

  const handleStartInterview = () => {
    navigate("/interview")
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 mt-20">
      <Header scrollBg={false} />
      <div className="max-w-5xl mx-auto bg-white p-10 rounded-xl shadow-md border border-gray-300">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">AI 면접을 위한 환경을 설정해 주세요</h1>
        <p className="text-gray-600 mb-8">원활한 면접을 위해 카메라, 마이크, 화면 구도를 점검합니다.</p>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 relative">
            <div className="rounded-lg border w-full aspect-video overflow-hidden">
              <Webcam
                ref={webcamRef}
                audio={false}
                className="w-full h-full object-cover"
                mirrored
              />
            </div>

            <p className="text-sm text-gray-500 mt-2">마이크 볼륨 게이지 바</p>
            <div className="h-2 bg-gray-300 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${testStatus !== TestStatus.NotStarted ? Math.min(micLevel * 2, 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="w-full md:w-72 space-y-4">
            <div className={`rounded-lg p-3 border ${testStatus === TestStatus.Completed ? "border-green-500 bg-green-50" : "border-gray-300"}`}>
              <div className="text-gray-800 font-semibold">카메라</div>
              <div className="text-sm text-gray-600 mt-1">
                {testStatus === TestStatus.Completed
                  ? "✅ 확인 성공! 카메라가 정상적으로 작동합니다."
                  : cameraLabel || "카메라 장치를 찾는 중..."}
              </div>
            </div>

            <div className={`rounded-lg p-3 border ${testStatus === TestStatus.Completed ? "border-green-500 bg-green-50" : "border-gray-300"}`}>
              <div className="text-gray-800 font-semibold">마이크</div>
              <div className="text-sm text-gray-600 mt-1">
                {testStatus === TestStatus.Completed
                  ? "✅ 확인 성공! 마이크가 정상적으로 작동합니다."
                  : micLabel || "마이크 장치를 찾는 중..."}
              </div>
            </div>

            <div className="text-sm text-gray-700">
              마이크 측정을 위해<br />평소 말하듯이 텍스트를 읽어주세요!
            </div>
            <textarea
              className="w-full border rounded p-2 text-sm"
              readOnly
              defaultValue="안녕하세요 저는 이번에 모의 AI 면접에 참여하게 된 지원자입니다."
            />
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-10">
          {testStatus === TestStatus.NotStarted && (
            <Button
              onClick={startTest}
              className="px-6 py-2 text-white bg-blue-500 hover:bg-blue-600"
            >
              테스트하기
            </Button>
          )}
          {testStatus === TestStatus.Completed && (
            <>
              <Button
                onClick={resetState}
                className="px-6 py-2 text-white bg-blue-500 hover:bg-blue-600"
              >
                테스트 다시하기
              </Button>
              <Button
                onClick={handleStartInterview}
                className="px-6 py-2 text-white bg-blue-500 hover:bg-blue-600"
              >
                면접 시작하기
              </Button>
            </>
          )}
        </div>

        <div className="text-center mt-6 text-gray-600 text-lg font-medium">3/4</div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, FolderCheck } from "lucide-react"

export default function InterviewFinishPage() {
  const navigate = useNavigate()
  const [showContent, setShowContent] = useState(false)
  const [finishedAt, setFinishedAt] = useState<string>("")

  useEffect(() => {
    // 완료 시간 가져오기
    const finishTime = localStorage.getItem("interviewFinishedAt")
    if (finishTime) {
      const date = new Date(finishTime)
      setFinishedAt(date.toLocaleString("ko-KR", {
        year: "numeric",
        month: "long", 
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }))
    }

    // 애니메이션 효과
    setTimeout(() => setShowContent(true), 300)
  }, [])

  const handleGoToResults = () => {
    navigate("/mypage/result")
  }

  const handleGoToHome = () => {
    navigate("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-16">
        {/* 메인 완료 섹션 */}
        <div className={`text-center transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* 완료 아이콘 */}
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* 메인 메시지 */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            면접 완료!
          </h1>
          <h2 className="text-xl md:text-2xl text-gray-600 mb-8">
            수고하셨습니다 🎉
          </h2>

          {/* 완료 시간 정보 (간단하게) */}
          {finishedAt && (
            <div className="flex items-center justify-center gap-2 text-gray-600 mb-8">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{finishedAt} 완료</span>
            </div>
          )}

          {/* 격려 메시지 */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl p-6 mb-12 border border-blue-200/30">
            <p className="text-lg text-gray-700 leading-relaxed">
              AI 면접을 끝까지 완주하신 것을 축하드립니다! <br />
              <span className="font-semibold text-blue-600">AI가 분석한 상세한 피드백</span>을 확인하고 <br />
              면접 실력을 향상시켜보세요!
            </p>
            <div className="mt-4 pt-6 rounded-lg">
              <p className="text-sm text-gray-500">
                결과 분석에는 시간이 걸릴 수 있습니다. 분석 중인 경우 잠시 후 다시 확인해주세요.
              </p>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleGoToResults}
              className="group relative h-12 px-8 rounded-2xl text-base font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:via-indigo-700 hover:to-cyan-700 focus-visible:ring-4 focus-visible:ring-blue-200/50 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 active:scale-95"
            >
              <span className="relative z-10 flex items-center">
                <FolderCheck className="w-5 h-5 mr-2" />
                면접 결과 확인하기
              </span>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
            
            <Button
              onClick={handleGoToHome}
              variant="outline"
              className="h-12 px-8 rounded-2xl text-base font-semibold border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-800 bg-white/50 hover:bg-white/70 transition-all duration-300 hover:shadow-md"
            >
              홈으로 돌아가기
            </Button>
          </div>
        </div>


      </div>
    </div>
  )
}

// InterviewStartPage.tsx

import { Button } from "@/components/ui/button"
import Header from "@/components/common/Header"
import { useNavigate } from "react-router-dom"

export default function Component() {
  const navigate = useNavigate()
  const handleStartInterview = () => {
    navigate("/interview/fileselect")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Header scrollBg={false} />

      {/* Decorative background */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[320px] bg-gradient-to-b from-blue-50/70 to-transparent" />
        <div className="absolute left-1/2 top-40 -translate-x-1/2 blur-3xl opacity-40 w-[640px] h-[240px] bg-blue-200/40 rounded-full" />
      </div>

      {/* Main */}
      <main className="mx-auto max-w-5xl px-6 md:px-8 py-16 md:py-24">
        <section className="grid gap-10 md:grid-cols-2 md:items-center">
          {/* Text block */}
          <div className="text-center md:text-left">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              맞춤형 1:1 AI 인터뷰
            </span>
            <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              환영합니다
            </h1>

            {/* 변경된 ‘밝고 희망찬’ 문구 */}
            <p className="mt-3 text-slate-700 md:text-lg font-medium">
              모야와 함께 자신감을 키우고, 합격으로 가는 길을 열어보세요
            </p>

            <div className="mt-8">
              <Button
                onClick={handleStartInterview}
                size="lg"
                className="rounded-full px-8 py-6 text-base md:text-lg bg-blue-600 hover:bg-blue-700 focus-visible:ring-4 focus-visible:ring-blue-200"
                aria-label="면접 시작하기"
              >
                면접시작
              </Button>
              <p className="mt-3 text-xs text-slate-500">
                시작을 누르면 서류 선택 화면으로 이동합니다
              </p>
            </div>
          </div>

          {/* Illustration block */}
          <div className="mx-auto w-full max-w-md">
            <div className="relative">
              {/* Monitor */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="p-4 border-b border-slate-100">
                  <div className="h-2 w-16 rounded-full bg-slate-200" />
                </div>

                {/* Screen */}
                <div className="p-6">
                  <div className="relative h-48 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 overflow-hidden">
                    {/* Left bubble (AI) */}
                    <div className="absolute left-4 top-4 max-w-[55%] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
                      안녕하세요 면접을 시작하겠습니다
                      <div className="absolute -right-2 top-3 h-0 w-0 border-l-8 border-l-white border-y-8 border-y-transparent" />
                    </div>
                    {/* Right bubble (User) */}
                    <div className="absolute right-4 bottom-4 max-w-[55%] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
                      준비되었습니다
                      <div className="absolute -left-2 bottom-3 h-0 w-0 border-r-8 border-r-white border-y-8 border-y-transparent" />
                    </div>

                    {/* Minimal avatar placeholders */}
                    <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-slate-300" />
                      <div className="h-7 w-7 rounded-full bg-slate-300" />
                    </div>
                  </div>

                  {/* Caption rows */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">진행 흐름</span>
                      <span className="text-[10px] text-slate-500">질문 → 꼬리질문1 → 꼬리질문2</span>
                    </div>
                    <div className="h-2 w-full rounded bg-slate-100">
                      <div className="h-2 w-1/3 rounded bg-blue-400/60" />
                    </div>
                  </div>
                </div>

                {/* Stand */}
                <div className="px-6 pb-6">
                  <div className="mx-auto mt-2 h-2 w-24 rounded-full bg-slate-200" />
                </div>
              </div>             
            </div>

            {/* Small helper list */}
            <ul className="mt-6 grid grid-cols-2 gap-3 text-xs text-slate-600">
              <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">서류 기반 맞춤 질문</li>
              <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">최대 1분 답변</li>
              <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">음성 재생 후 3초 대기</li>
              <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">자연스러운 대화 흐름</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}

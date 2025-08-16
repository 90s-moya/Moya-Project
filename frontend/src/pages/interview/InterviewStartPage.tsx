// InterviewStartPage.tsx

import { Button } from "@/components/ui/button";
import Header from "@/components/common/Header";
import { useNavigate } from "react-router-dom";

export default function Component() {
  const navigate = useNavigate();
  const handleStartInterview = () => {
    navigate("/interview/fileselect");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 font-['Pretendard']">
      <Header scrollBg={false} />

      {/* Enhanced decorative background with animations */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-[400px] bg-gradient-to-b from-blue-100/80 via-blue-50/60 to-transparent" />
        <div className="absolute left-1/2 top-40 -translate-x-1/2 blur-3xl opacity-60 w-[800px] h-[300px] bg-gradient-to-r from-blue-300/40 via-indigo-300/40 to-cyan-300/40 rounded-full animate-pulse" />
        <div
          className="absolute right-20 top-60 w-32 h-32 bg-blue-200/30 rounded-full animate-bounce"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute left-20 bottom-40 w-24 h-24 bg-indigo-200/30 rounded-full animate-bounce"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Main content with enhanced animations */}
      <main className="mx-auto max-w-6xl px-6 md:px-8 py-20 md:py-28">
        <section className="grid gap-12 md:grid-cols-2 md:items-center">
          {/* Enhanced text block with animations */}
          <div className="text-center md:text-left space-y-6">
            <div
              className="animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-blue-700 shadow-lg shadow-blue-100/50">
                개인 맞춤형 AI 인터뷰
              </span>
            </div>

            <div
              className="animate-fade-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                환영합니다
              </h1>
            </div>

            <div
              className="animate-fade-in-up"
              style={{ animationDelay: "0.6s" }}
            >
              <p className="text-slate-700 md:text-xl font-medium leading-relaxed">
                모야와 함께 자신감을 키우고,{" "}
                <span className="font-semibold text-blue-600">
                  합격으로 가는 길
                </span>
                을 열어보세요
              </p>
              <p className="text-sm text-slate-500">시작을 누르면 서류 선택 화면으로 이동합니다</p>
            </div>

            <div className="animate-fade-in-up space-y-4" style={{ animationDelay: '0.8s' }}>
              <Button
                onClick={handleStartInterview}
                size="lg"
                className="group relative h-14 px-10 rounded-2xl text-lg font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:via-indigo-700 hover:to-cyan-700 focus-visible:ring-4 focus-visible:ring-blue-200/50 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95"
                aria-label="면접 시작하기"
              >
                <span className="relative z-10">면접 시작하기</span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 opacity-75 blur-sm group-hover:opacity-100 transition-opacity duration-300" />
              </Button>
              

              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span>시작을 누르면 서류 선택 화면으로 이동합니다</span>
              </div>
            </div>
          </div>

          {/* Enhanced illustration block with animations */}
          <div
            className="mx-auto w-full max-w-lg animate-fade-in-up"
            style={{ animationDelay: "1s" }}
          >
            <div className="relative group">
              {/* Floating elements */}
              <div
                className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full animate-bounce shadow-lg"
                style={{ animationDelay: "0.3s" }}
              />
              <div
                className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full animate-bounce shadow-lg"
                style={{ animationDelay: "0.7s" }}
              />

              {/* Enhanced Monitor */}
              <div className="relative rounded-3xl border border-slate-200/60 bg-white/90 backdrop-blur-sm shadow-2xl shadow-slate-200/50 transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-blue-200/50">
                <div className="p-5 border-b border-slate-100/60">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-400 animate-pulse" />
                    <div
                      className="h-3 w-3 rounded-full bg-yellow-400 animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <div
                      className="h-3 w-3 rounded-full bg-green-400 animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>

                {/* Enhanced Screen */}
                <div className="p-8">
                  <div className="relative h-56 rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 border border-slate-200/60 overflow-hidden backdrop-blur-sm">
                    {/* Enhanced chat bubbles */}
                    <div className="absolute left-4 top-4 max-w-[60%] rounded-2xl border border-blue-200/60 bg-white/90 backdrop-blur-sm px-4 py-3 text-sm text-slate-700 shadow-lg shadow-blue-100/50 animate-fade-in-left">
                      안녕하세요! 면접을 시작하겠습니다 ✨
                      <div className="absolute -right-2 top-4 h-0 w-0 border-l-8 border-l-white border-y-8 border-y-transparent" />
                    </div>

                    <div className="absolute right-4 bottom-4 max-w-[60%] rounded-2xl border border-indigo-200/60 bg-white/90 backdrop-blur-sm px-4 py-3 text-sm text-slate-700 shadow-lg shadow-indigo-100/50 animate-fade-in-right">
                      준비되었습니다! 💪
                      <div className="absolute -left-2 bottom-4 h-0 w-0 border-r-8 border-r-white border-y-8 border-y-transparent" />
                    </div>

                    {/* Enhanced avatar placeholders */}
                    <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-4">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg animate-pulse" />
                      <div
                        className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg animate-pulse"
                        style={{ animationDelay: "0.5s" }}
                      />
                    </div>
                  </div>

                  {/* Enhanced progress indicator */}
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">
                        진행 흐름
                      </span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                        질문 → 꼬리질문1 → 꼬리질문2
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-cyan-500 rounded-full transition-all duration-1000 ease-out animate-progress"
                        style={{ width: "33.33%" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Enhanced Stand */}
                <div className="px-8 pb-6">
                  <div className="mx-auto mt-3 h-3 w-32 rounded-full bg-gradient-to-r from-slate-200 to-slate-300 shadow-inner" />
                </div>
              </div>
            </div>

            {/* Enhanced feature list */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                {
                  text: "서류 기반 맞춤 질문",
                  icon: "📄",
                  color: "from-blue-500 to-blue-600",
                },
                {
                  text: "최대 1분 답변",
                  icon: "⏱️",
                  color: "from-indigo-500 to-indigo-600",
                },
                {
                  text: "자연스러운 대화 흐름",
                  icon: "💬",
                  color: "from-cyan-500 to-cyan-600",
                },
                {
                  text: "AI 면접관 모야",
                  icon: "🤖",
                  color: "from-blue-400 to-indigo-500",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="group relative rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm px-4 py-3 text-sm text-slate-700 shadow-lg shadow-slate-100/50 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-100/50 animate-fade-in-up"
                  style={{ animationDelay: `${1.2 + index * 0.1}s` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.text}</span>
                  </div>
                  <div
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Custom CSS for animations */}
      {/* 08/16 21:06에 이 부분에서 build error이 나서 주석 처리하고 이 부분 코드는 index.css에 추가했씁니다*/}
      {/* <style jsx>{`
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

        @keyframes fade-in-left {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fade-in-right {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 33.33%;
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-fade-in-left {
          animation: fade-in-left 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-fade-in-right {
          animation: fade-in-right 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-progress {
          animation: progress 2s ease-out forwards;
        }
      `}</style> */}
    </div>
  );
}

// src/components/interview/ReadyModal.tsx
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import aiCharacter from "@/assets/images/clover.png"

interface ReadyModalProps {
  open: boolean
  onClose: () => void
  onStart: () => void
}

export default function ReadyModal({ open, onClose, onStart }: ReadyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-4 !w-[90vw] !h-[90vh] !max-w-[98vw] !max-h-[98vh] rounded-2xl border-2 border-blue-200/60 bg-white/95 backdrop-blur-sm shadow-2xl shadow-blue-200/50 font-['Pretendard']">
        <DialogHeader className="text-center mb-3">
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {/* <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-blue-200 flex items-center justify-center mb-2">
              <span className="text-xl">🚀</span>
            </div> */}
            <DialogTitle className="mt-3 text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600">
            <div className="flex items-center justify-center gap-2">
              <img 
                src={aiCharacter}
                alt="AI 캐릭터" 
                className="w-8 h-8 object-contain"
              />
              <span>AI 면접 안내</span>
              <img 
                src={aiCharacter}
                alt="AI 캐릭터" 
                className="w-8 h-8 object-contain"
              />
            </div>
          </DialogTitle>
            <p className="mt-2 text-sm text-center text-slate-700">
              원활한 면접 진행을 위해 아래 안내를 확인해 주세요 
            </p>
          </div>
        </DialogHeader>

        <div className="mx-auto max-w-4xl text-center space-y-5">
          {/* Enhanced interview process flow - 크기 확대 */}
          <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <h3 className="text-lg font-bold text-slate-800">면접 프로세스</h3>
            
            {/* Visual process flow with enhanced design - 크기 확대 */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              {/* Question 1 */}
              <div className="flex flex-col items-center gap-2">
                <span className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/25">
                  질문 1
                </span>
                <div className="flex flex-col gap-1">
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">꼬리질문 1</span>
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">꼬리질문 2</span>
                </div>
              </div>
              
              <svg className="h-6 w-6 text-blue-400 transform rotate-90 md:rotate-0" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 5l5 5-5 5"/>
              </svg>
              
              {/* Question 2 */}
              <div className="flex flex-col items-center gap-2">
                <span className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25">
                  질문 2
                </span>
                <div className="flex flex-col gap-1">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">꼬리질문 1</span>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">꼬리질문 2</span>
                </div>
              </div>
              
              <svg className="h-6 w-6 text-indigo-400 transform rotate-90 md:rotate-0" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 5l5 5-5 5"/>
              </svg>
              
              {/* Question 3 */}
              <div className="flex flex-col items-center gap-2">
                <span className="px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-cyan-500/25">
                  질문 3
                </span>
                <div className="flex flex-col gap-1">
                  <span className="px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-medium">꼬리질문 1</span>
                  <span className="px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-medium">꼬리질문 2</span>
                </div>
              </div>

              
            </div>
            {/* Process explanation */}
            <div className="mt-4 p-3 rounded-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-200/60">
              <p className="text-xs text-slate-700">
                
                총 <span className="font-bold text-indigo-600">3개의 메인 질문</span>과 <span className="font-bold text-cyan-600">6개의 꼬리질문</span>으로 구성됩니다.
              </p>
            </div>
            
            
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />

          {/* Simplified guide checklist - 박스 제거하고 간단하게 */}
          <section className="space-y-3 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <h3 className="text-lg font-bold text-slate-800">면접 가이드</h3>
            
            <div className="mx-auto inline-block text-left space-y-2">
              {[
                {
                  text: "질문을 읽고 답변 시작 버튼을 눌러 답변을 시작해주세요. 최대 1분 동안 답변할 수 있어요.",
                  icon: "⏱️"
                },
                {
                  text: "답변 완료 후 자동으로 다음 질문으로 넘어갑니다. 자연스러운 대화 흐름을 유지해주세요.",
                  icon: "💬"
                },
                {
                  text: "시선 추적이 활성화되어 있어 답변 중 집중도를 분석합니다.",
                  icon: "👁️"
                }
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-blue-200 flex items-center justify-center">
                    <span className="text-xs">{item.icon}</span>
                  </div>
                  <span className="text-sm text-slate-700 leading-relaxed">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-200/60">
              <p className="text-xs text-slate-700">
                <span className="font-semibold text-blue-600">시작</span>을 누르면 <span className="font-semibold text-indigo-600">3초 카운트다운</span> 후 면접이 바로 시작됩니다!
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
  <div className="w-full flex flex-row justify-center gap-3">
    <Button
      variant="outline"
      onClick={onClose}
      className="h-10 px-5 rounded-lg text-sm font-semibold border-2 border-slate-300 hover:bg-slate-50 hover:border-blue-300 transition-all duration-200"
    >
      취소
    </Button>
    <Button
      onClick={onStart}
      className="group relative h-10 px-5 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:via-indigo-700 hover:to-cyan-700 focus-visible:ring-4 focus-visible:ring-blue-200/50 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 active:scale-95"
    >
      <span className="relative z-10">시작하기</span>
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Button>
  </div>
</DialogFooter>

        {/* Custom CSS for animations */}
        <style>{`
          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fade-in-up {
            animation: fade-in-up 0.6s ease-out forwards;
            opacity: 0;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}

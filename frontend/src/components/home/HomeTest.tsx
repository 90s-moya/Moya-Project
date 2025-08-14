// 개발 테스트용: HomeIntroSection 복사본
import { ReactTyped } from "react-typed";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";
import CloudFriends from "@/assets/images/cloud-friends.png";
import { Mouse } from "lucide-react";

export default function HomeTest() {
  const { 
    showMiddleTyping, 
    middleTypingComplete, 
    endChar, 
    showEndCursor,
    animationComplete
  } = useTypingAnimation();

  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      <section className="relative w-full min-h-screen bg-white overflow-hidden py-16 flex items-center">
      {/* 배경 장식용 그라데이션 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[#dbcdfc]/80 to-[#c9d7ff]/60 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-0 w-80 h-80 bg-gradient-to-bl from-[#c9d7ff]/70 to-[#d8f5ff]/50 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-gradient-to-tr from-[#d8f5ff]/75 to-[#dbcdfc]/55 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/3 w-64 h-64 bg-gradient-to-tl from-[#dbcdfc]/65 to-[#c9d7ff]/45 rounded-full blur-2xl"></div>
      </div>
      
      <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-center gap-8 relative min-h-[80vh]">
        {animationComplete ? (
          /* 랜딩페이지 레이아웃 */
          <div className="flex flex-col md:flex-row items-center justify-center w-full gap-8 md:gap-4">
            {/* 이미지 영역 */}
            <div className="flex-shrink-0 w-full max-w-sm md:flex-[1.2] md:max-w-xl opacity-0"
                 style={{ animation: 'fadeIn 1s ease-in-out forwards' }}>
              <img
                src={CloudFriends}
                alt="Cloud Friends"
                className="w-full h-auto"
                draggable={false}
              />
            </div>

            {/* 컨텐츠 영역 */}
            <div className="w-full md:flex-[0.8] md:max-w-lg space-y-6 md:space-y-8 opacity-0 text-center md:text-left"
                 style={{ animation: 'fadeIn 1s ease-in-out 0.3s forwards' }}>
              {/* 메인 타이틀 */}
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 leading-tight">
                  모야? 모의면접이야!
                </h2>
                <div className="w-20 h-1 bg-[#2b7fff] rounded hidden md:block"></div>
              </div>

              {/* 설명 텍스트 */}
              <div className="space-y-4">
                <p className="text-xl md:text-2xl text-gray-600 font-medium">
                  AI와 함께하는 스마트한 면접 연습
                </p>
                <p className="text-lg text-gray-500 leading-relaxed">
                  실전 같은 면접 경험으로 자신감을 키우고,<br />
                  개인 맞춤형 피드백으로 실력을 향상하세요.
                </p>
              </div>

              {/* CTA 버튼 */}
              <div className="space-y-4">
                <button className="bg-[#2b7fff] hover:bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors duration-300 shadow-lg hover:shadow-xl">
                  지금 시작하기
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 타이핑 애니메이션 */
          <div className="text-center flex flex-col items-center gap-4">
            <h2 className="text-gray-800 font-bold min-h-[120px] flex items-center text-5xl sm:text-6xl md:text-7xl lg:text-8xl">
              {/* [모] - 고정 */}
              <span>모</span>
              
              {/* [empty → 의면접이] - 타이핑 */}
              <span className="inline-block">
                {showMiddleTyping && !middleTypingComplete ? (
                  <ReactTyped
                    strings={["의면접이"]}
                    typeSpeed={150}
                    loop={false}
                    showCursor={true}
                    cursorChar='<span style="color: #2b7fff; font-weight: 500;">|</span>'
                  />
                ) : showMiddleTyping ? (
                  <span>의면접이</span>
                ) : null}
              </span>
              
              {/* [야] - 고정 */}
              <span>야</span>
              
              {/* [? → !] - 직접 제어 */}
              <span className="inline-block">
                <span>{endChar}</span>
                {showEndCursor && (
                  <span className="animate-pulse text-[#2b7fff] font-medium">|</span>
                )}
              </span>
            </h2>
          </div>
        )}
      </div>

      {/* 스크롤 다운 인디케이터 */}
      {animationComplete && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 opacity-0"
             style={{ animation: 'fadeIn 1s ease-in-out 1s forwards' }}>
          <div className="flex flex-col items-center space-y-3 text-gray-400 hover:text-[#2b7fff] transition-colors cursor-pointer">
            <span className="text-sm font-medium">Scroll Down</span>
            <Mouse className="w-6 h-6 animate-bounce" />
          </div>
        </div>
      )}
    </section>
    </>
  );
}
import ReactFullpage from '@fullpage/react-fullpage';
import { ReactTyped } from "react-typed";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";
import { Button } from "@/components/ui/button";
import Header from "@/components/common/Header";
import CloudFriends from "@/assets/images/cloud-friends.png";
import { Mouse } from "lucide-react";
import { Link } from "react-router-dom";

export default function HomePage() {
  const { 
    showMiddleTyping, 
    middleTypingComplete, 
    endChar, 
    showEndCursor,
    animationComplete
  } = useTypingAnimation();

  const fullpageOptions = {
    navigation: true,
    navigationPosition: 'right' as const,
    showActiveTooltip: true,
    anchors: ['home', 'feature1', 'feature2', 'feature3'],
    css3: true,
    autoScrolling: true,
    fitToSection: true,
    scrollBar: false,
    responsiveWidth: 768,
    responsiveHeight: 600,
    credits: { enabled: false },
    easing: 'easeInOutCubic',
    easingcss3: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    touchSensitivity: 15,
    normalScrollElements: '.header',
    scrollHorizontally: false
  };

  return (
    <div className="relative">
      {/* 패럴랙스 배경 그라데이션 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[#dbcdfc]/80 to-[#c9d7ff]/60 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-0 w-80 h-80 bg-gradient-to-bl from-[#c9d7ff]/70 to-[#d8f5ff]/50 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-gradient-to-tr from-[#d8f5ff]/75 to-[#dbcdfc]/55 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/3 w-64 h-64 bg-gradient-to-tl from-[#dbcdfc]/65 to-[#c9d7ff]/45 rounded-full blur-2xl"></div>
      </div>
      
      <Header scrollBg />
      
      <ReactFullpage
        {...fullpageOptions}
        render={({ state, fullpageApi }: { state: any; fullpageApi: any }) => {
          return (
            <ReactFullpage.Wrapper>
              {/* 첫 번째 섹션: 타이핑 애니메이션 */}
              <div className="section relative z-10">

                <section className="relative w-full h-full overflow-hidden flex items-center">
                  <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-center gap-8 relative min-h-[80vh]">
                                         {/* 타이핑 애니메이션 */}
                     <div 
                       className={`text-center flex flex-col items-center gap-4 ${
                         animationComplete ? 'hidden' : 'block'
                       }`}
                     >
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

                                         {/* 랜딩페이지 레이아웃 */}
                     <div 
                       className={`flex flex-col md:flex-row items-center justify-center w-full md:gap-4 ${
                         animationComplete ? 'block' : 'hidden'
                       }`}
                     >
                                             {/* 이미지 영역 */}
                       <div className="flex-shrink-0 w-full max-w-sm md:flex-[1.2] md:max-w-xl animate-[slideInLeft_0.8s_ease-out_0.3s_both]">
                         <img
                           src={CloudFriends}
                           alt="Cloud Friends"
                           className="w-full h-auto"
                           draggable={false}
                         />
                       </div>

                       {/* 컨텐츠 영역 */}
                       <div className="w-full md:flex-[0.8] md:max-w-lg space-y-6 md:space-y-8 text-center md:text-left animate-[slideInRight_0.8s_ease-out_0.5s_both]">
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
                          <p className="text-lg hidden md:block text-gray-500 leading-relaxed">
                            실전 같은 면접 경험으로 자신감을 키우고,<br />
                            개인 맞춤형 피드백으로 실력을 향상하세요.
                          </p>
                        </div>

                        {/* CTA 버튼 */}
                        <div className="space-y-4">
                          <button className="bg-[#2b7fff] hover:bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105">
                            지금 시작하기
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                                     {/* 스크롤 다운 인디케이터 */}
                   <div 
                     className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 ${
                       animationComplete ? 'block' : 'hidden'
                     }`}
                   >
                    <div className="flex flex-col items-center space-y-3 text-gray-400 hover:text-[#2b7fff] transition-colors cursor-pointer">
                      <span className="text-sm font-medium">아래로 스크롤하세요</span>
                      <Mouse className="w-6 h-6 animate-bounce" />
                    </div>
                  </div>
                </section>
              </div>
              
                             {/* 두 번째 섹션: 실시간 AI 분석 */}
               <div className="section relative z-10">
                 <div className="max-w-7xl mx-auto w-full px-6 flex flex-col lg:flex-row gap-12 items-center h-full">
                   <div className="flex justify-center lg:justify-start w-full lg:w-1/2">
                     <img src="https://via.placeholder.com/500x400/2b7fff/ffffff?text=AI+Analysis+GIF" alt="AI 분석" className="w-full max-w-md rounded-xl shadow-2xl" />
                   </div>
                   <div className="w-full lg:w-1/2 text-center lg:text-left space-y-6">
                      <h2 className="text-3xl font-bold text-gray-800">실시간 AI 분석</h2>
                      <p className="text-lg text-gray-600">표정, 목소리, 자세를 실시간으로 분석하여 면접 성과를 즉시 피드백받으세요.</p>
                    </div>
                 </div>
               </div>

               {/* 세 번째 섹션: 맞춤형 질문 */}
               <div className="section relative z-10">
                 <div className="max-w-7xl mx-auto w-full px-6 flex flex-col lg:flex-row-reverse gap-12 items-center h-full">
                   <div className="flex justify-center lg:justify-end w-full lg:w-1/2">
                     <img src="https://via.placeholder.com/500x400/ff6b6b/ffffff?text=Custom+Questions+GIF" alt="맞춤형 질문" className="w-full max-w-md rounded-xl shadow-2xl" />
                   </div>
                   <div className="w-full lg:w-1/2 text-center lg:text-left space-y-6">
                      <h2 className="text-3xl font-bold text-gray-800">맞춤형 질문</h2>
                      <p className="text-lg text-gray-600">지원 직무와 경력에 맞는 개인화된 면접 질문으로 실전에 준비하세요.</p>
                    </div>
                 </div>
               </div>

               {/* 네 번째 섹션: 스터디 그룹 */}
               <div className="section relative z-10">
                 <div className="max-w-7xl mx-auto w-full px-6 flex flex-col lg:flex-row gap-12 items-center h-full">
                   <div className="flex justify-center lg:justify-start w-full lg:w-1/2">
                     <img src="https://via.placeholder.com/500x400/4ecdc4/ffffff?text=Study+Group+GIF" alt="스터디 그룹" className="w-full max-w-md rounded-xl shadow-2xl" />
                   </div>
                   <div className="w-full lg:w-1/2 text-center lg:text-left space-y-6">
                      <h2 className="text-3xl font-bold text-gray-800">스터디 그룹</h2>
                      <p className="text-lg text-gray-600">다른 지원자들과 함께 면접 스터디를 진행하며 서로의 실력을 향상시키세요.</p>
                    </div>
                 </div>
               </div>
            </ReactFullpage.Wrapper>
          );
        }}
      />
    </div>
  );
}

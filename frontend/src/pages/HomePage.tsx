import ReactFullpage from '@fullpage/react-fullpage';
import { ReactTyped } from "react-typed";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";
import { Button } from "@/components/ui/button";
import Header from "@/components/common/Header";
import CloudFriends from "@/assets/images/cloud-friends.png";
import { Mouse } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import InterviewGif from "@/assets/images/Interview.gif";
import InterviewGif2 from "@/assets/images/interviewfeedback.gif";
import StudyGif from "@/assets/images/study.gif";
import StudyGif2 from "@/assets/images/studymeeting.gif";
import StudyGif3 from "@/assets/images/studyfeedback.gif";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useMemo } from "react";

export default function HomePage() {
  const navigate = useNavigate();
  const { 
    showMiddleTyping, 
    middleTypingComplete, 
    endChar, 
    showEndCursor,
    animationComplete
  } = useTypingAnimation();

  // 현재 활성 섹션과 애니메이션 상태 관리
  const [currentSection, setCurrentSection] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // fullpage.js 콜백 함수들
  const onLeave = useCallback((origin: { index: number }, destination: { index: number }) => {
    setIsAnimating(true);
    setCurrentSection(destination.index);
  }, []);

  const afterLoad = useCallback(() => {
    setIsAnimating(false);
  }, []);

  // 애니메이션 variants 정의 (메모이제이션 + GPU 가속)
  const sectionVariants = useMemo(() => ({
    hidden: { 
      opacity: 0, 
      y: 50,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      y: -50,
      scale: 1.05,
      transition: {
        duration: 0.6
      }
    }
  } as any), []);

  const itemVariants = useMemo(() => ({
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.9
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6
      }
    }
  } as any), []);

  // 타이핑 → 랜딩페이지 전환용 애니메이션
  const landingTransitionVariants = useMemo(() => ({
    hidden: { 
      opacity: 0, 
      y: 50,
      scale: 0.8,
      filter: "blur(10px)"
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        duration: 1,
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  } as any), []);

  const landingItemVariants = useMemo(() => ({
    hidden: { 
      opacity: 0, 
      y: 60,
      scale: 0.8
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8
      }
    }
  } as any), []);

  const fullpageOptions = useMemo(() => ({
    licenseKey: 'gplv3-license',
    navigation: true,
    navigationPosition: 'right' as const,
    showActiveTooltip: true,
    anchors: ['home', 'ai-interview', 'report', 'study-matching', 'online-study', 'feedback', 'trial'],
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
    scrollHorizontally: false,
    onLeave: onLeave,
    afterLoad: afterLoad
  }), [onLeave, afterLoad]);

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
        render={({ state, fullpageApi }: { state: unknown; fullpageApi: unknown }) => {
          return (
            <ReactFullpage.Wrapper>
              {/* 첫 번째 섹션: 타이핑 애니메이션 */}
              <div className="section relative z-10">
                <motion.section 
                  className="relative w-full h-full overflow-hidden flex items-center"
                  initial="hidden"
                  animate={currentSection === 0 ? "visible" : "hidden"}
                  variants={sectionVariants}
                  style={{ willChange: 'transform, opacity' }}
                >
                  <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-center gap-8 relative min-h-[80vh]">
                    <AnimatePresence mode="wait">
                      {!animationComplete ? (
                        <motion.div 
                          key="typing"
                          className="text-center flex flex-col items-center gap-4"
                          initial={{ opacity: 1, scale: 1 }}
                          exit={{ 
                            opacity: 0, 
                            scale: 0.9, 
                            y: -50,
                            transition: { 
                              duration: 0.5
                            }
                          }}
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
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="landing"
                          className="flex flex-col md:flex-row items-center justify-center w-full md:gap-4"
                          initial="hidden"
                          animate="visible"
                          variants={landingTransitionVariants}
                          style={{ willChange: 'transform, opacity, filter' }}
                        >
                                             {/* 이미지 영역 */}
                       <motion.div 
                         className="flex-shrink-0 w-full max-w-sm md:flex-[1.2] md:max-w-xl"
                         variants={landingItemVariants}
                       >
                         <img
                           src={CloudFriends}
                           alt="Cloud Friends"
                           className="w-full h-auto"
                           draggable={false}
                         />
                       </motion.div>

                       {/* 컨텐츠 영역 */}
                       <motion.div 
                         className="w-full md:flex-[0.8] md:max-w-lg space-y-6 md:space-y-8 text-center md:text-left"
                         variants={landingItemVariants}
                       >
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
                          <button 
                            onClick={() => navigate('/interview/start')}
                            className="bg-[#2b7fff] hover:bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                          >
                            지금 시작하기
                          </button>
                        </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 스크롤 다운 인디케이터 */}
                  <AnimatePresence>
                    {animationComplete && (
                      <motion.div 
                        className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0,
                          transition: { 
                            delay: 1.2, 
                            duration: 0.6
                          }
                        }}
                        exit={{ opacity: 0, y: 20 }}
                      >
                        <div className="flex flex-col items-center space-y-3 text-gray-400">
                          <span className="text-sm font-medium">아래로 스크롤하세요</span>
                          <Mouse className="w-6 h-6 animate-bounce" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.section>
              </div>
              {/* 두 번째 섹션: AI 면접을 시작해보세요 */}
              <div className="section relative z-10">
                <motion.div 
                  className="max-w-5xl mx-auto w-full px-6 flex flex-col lg:flex-row gap-12 items-center h-full"
                  initial="hidden"
                  animate={currentSection === 1 ? "visible" : "hidden"}
                  variants={sectionVariants}
                  style={{ willChange: 'transform, opacity' }}
                >
                  <motion.div 
                    className="flex justify-center w-full lg:w-1/2"
                    variants={itemVariants}
                  >
                    <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden aspect-[4/3]">
                      <img 
                        src={InterviewGif} 
                        alt="AI Interview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </motion.div>
                  <motion.div 
                    className="w-full lg:w-1/2 text-center lg:text-left space-y-6"
                    variants={itemVariants}
                  >
                    <h2 className="text-3xl font-bold text-gray-800">AI 면접을 시작해보세요</h2>
                    <p className="text-lg text-gray-600">업로드한 서류를 바탕으로 맞춤형 질문이 주어지고,<br/>답변에 따라 꼬리질문을 유연하게 생성해요.</p>
                  </motion.div>
                </motion.div>
              </div>

              {/* 세 번째 섹션: 면접 결과 리포트 */}
              <div className="section relative z-10">
                <motion.div 
                  className="max-w-5xl mx-auto w-full px-6 flex flex-col lg:flex-row-reverse gap-12 items-center h-full"
                  initial="hidden"
                  animate={currentSection === 2 ? "visible" : "hidden"}
                  variants={sectionVariants}
                >
                  <motion.div 
                    className="flex justify-center w-full lg:w-1/2"
                    variants={itemVariants}
                  >
                    <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden aspect-[4/3]">
                      <img 
                        src={InterviewGif2}
                        alt="AI Interview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </motion.div>
                  <motion.div 
                    className="w-full lg:w-1/2 text-center lg:text-left space-y-6"
                    variants={itemVariants}
                  >
                    <h2 className="text-3xl font-bold text-gray-800">AI가 분석한 면접 리포트를 확인하세요</h2>
                    <p className="text-lg text-gray-600">나도 모르는 내 말투, 행동, 표정, 시선 습관까지 한눈에!<br/>AI 코치의 총평도 놓치지 마세요.</p>
                  </motion.div>
                </motion.div>
              </div>

              {/* 네 번째 섹션: 스터디원을 구해보세요 */}
              <div className="section relative z-10">
                <motion.div 
                  className="max-w-5xl mx-auto w-full px-6 flex flex-col lg:flex-row gap-12 items-center h-full"
                  initial="hidden"
                  animate={currentSection === 3 ? "visible" : "hidden"}
                  variants={sectionVariants}
                >
                  <motion.div 
                    className="flex justify-center w-full lg:w-1/2"
                    variants={itemVariants}
                  >
                    <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden aspect-[16/9]">
                      <img 
                        src={StudyGif} 
                        alt="AI Interview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </motion.div>
                  <motion.div 
                    className="w-full lg:w-1/2 text-center lg:text-left space-y-6"
                    variants={itemVariants}
                  >
                    <h2 className="text-3xl font-bold text-gray-800">스터디원을 구해보세요</h2>
                    <p className="text-lg text-gray-600">내가 원하는 직무, 원하는 시간대를 쉽게 찾고, <br/>모의면접을 함께할 수 있어요.</p>
                  </motion.div>
                </motion.div>
              </div>

              {/* 다섯 번째 섹션: 더 편리한 온라인 모의면접 스터디 */}
              <div className="section relative z-10">
                <motion.div 
                  className="max-w-5xl mx-auto w-full px-6 flex flex-col lg:flex-row-reverse gap-12 items-center h-full"
                  initial="hidden"
                  animate={currentSection === 4 ? "visible" : "hidden"}
                  variants={sectionVariants}
                >
                  <motion.div 
                    className="flex justify-center w-full lg:w-1/2"
                    variants={itemVariants}
                  >
                    <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden aspect-[16/9]">
                      <img 
                        src={StudyGif2}
                        alt="AI Interview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </motion.div>
                  <motion.div 
                    className="w-full lg:w-1/2 text-center lg:text-left space-y-6"
                    variants={itemVariants}
                  >
                    <h2 className="text-3xl font-bold text-gray-800">더 편리한 온라인 모의면접 스터디</h2>
                    <p className="text-lg text-gray-600">긍정 / 부정 피드백 누르고 전달하면 끝!<br />참고 자료도 간편하게 볼 수 있어요.</p>
                  </motion.div>
                </motion.div>
              </div>

              {/* 여섯 번째 섹션: 면접스터디 피드백 */}
              <div className="section relative z-10">
                <motion.div 
                  className="max-w-5xl mx-auto w-full px-6 flex flex-col lg:flex-row gap-12 items-center h-full"
                  initial="hidden"
                  animate={currentSection === 5 ? "visible" : "hidden"}
                  variants={sectionVariants}
                >
                  <motion.div 
                    className="flex justify-center w-full lg:w-1/2"
                    variants={itemVariants}
                  >
                    <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden aspect-[4/3]">
                      <img 
                        src={StudyGif3}
                        alt="AI Interview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </motion.div>
                  <motion.div 
                    className="w-full lg:w-1/2 text-center lg:text-left space-y-6"
                    variants={itemVariants}
                  >
                    <h2 className="text-3xl font-bold text-gray-800">면접스터디 피드백</h2>
                    <p className="text-lg text-gray-600">언제 어떤 피드백을 받았는지 쉽게 확인할 수 있어요.</p>
                  </motion.div>
                </motion.div>
              </div>

              {/* 일곱 번째 섹션: 무료로 체험하기 */}
              <div className="section relative z-10">
                <motion.div 
                  className="max-w-5xl mx-auto w-full px-6 flex flex-col items-center justify-center h-full text-center space-y-8"
                  initial="hidden"
                  animate={currentSection === 6 ? "visible" : "hidden"}
                  variants={sectionVariants}
                >
                  <motion.div 
                    className="space-y-6"
                    variants={itemVariants}
                  >
                    <h2 className="text-4xl lg:text-5xl font-bold text-gray-800">Try for free</h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                      모야에서 지금 바로 시작해보세요!<br />
                    </p>
                  </motion.div>
                  
                  <motion.div 
                    className="flex flex-col sm:flex-row gap-6 pt-8"
                    variants={itemVariants}
                  >
                    <button 
                      onClick={() => navigate('/interview/start')}
                      className="bg-[#2b7fff] hover:bg-blue-600 text-white px-10 py-4 rounded-xl text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 min-w-[200px]"
                    >
                      AI 면접 시작하기
                    </button>
                    <button 
                      onClick={() => navigate('/study')}
                      className="border-2 border-[#2b7fff] text-[#2b7fff] hover:bg-[#2b7fff] hover:text-white px-10 py-4 rounded-xl text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 min-w-[200px]"
                    >
                      면접 스터디 참여하기
                    </button>
                  </motion.div>
                  
                  <motion.div 
                    className="pt-16 pb-8"
                    variants={itemVariants}
                  >
                    <p className="text-gray-400 text-sm">© 2024 Moya. All rights reserved.</p>
                  </motion.div>
                </motion.div>
              </div>
            </ReactFullpage.Wrapper>
          );
        }}
      />
    </div>
  );
}

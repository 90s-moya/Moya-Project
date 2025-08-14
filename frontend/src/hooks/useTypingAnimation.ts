import { useState, useEffect } from "react";

// 앱 시작 시점 기록
const APP_START_TIME = Date.now();

export const useTypingAnimation = () => {
  // 초기 로드 여부를 미리 확인
  const timeSinceAppStart = Date.now() - APP_START_TIME;
  const isInitialLoad = timeSinceAppStart < 3000;

  const [showMiddleTyping, setShowMiddleTyping] = useState(isInitialLoad ? false : true);
  const [middleTypingComplete, setMiddleTypingComplete] = useState(isInitialLoad ? false : true);
  const [endChar, setEndChar] = useState(isInitialLoad ? "?" : "!");
  const [showEndCursor, setShowEndCursor] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(isInitialLoad ? false : true);

  useEffect(() => {
    if (isInitialLoad) {
      // 타이핑 시작
      const timer1 = setTimeout(() => {
        setShowMiddleTyping(true);
      }, 500);

      // 중간 타이핑 완료
      const timer2 = setTimeout(() => {
        setMiddleTypingComplete(true);
      }, 2000);

      // 끝 부분 커서 표시 및 변경 시작
      const timer3 = setTimeout(() => {
        setShowEndCursor(true);
        
        // 0.5초 후 ? 지우고 ! 입력
        setTimeout(() => {
          setEndChar("");
          setEndChar("!");
          
          // 0.5초 후 커서 제거 및 애니메이션 완료
          setTimeout(() => {
            setShowEndCursor(false);
            setAnimationComplete(true);
          }, 500);
        }, 200);
      }, 2200);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
    // isInitialLoad가 false인 경우는 이미 useState에서 최종 상태로 초기화됨
  }, [isInitialLoad]);

  return {
    showMiddleTyping,
    middleTypingComplete,
    endChar,
    showEndCursor,
    animationComplete,
  };
};

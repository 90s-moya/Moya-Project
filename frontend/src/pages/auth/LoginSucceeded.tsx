import React from 'react';

const LoginSucceeded: React.FC = () => {

  const goToProfile = () => {
    // 실제 구현: navigate('/profile/setup');
  };

  const goToHome = () => {
    // 실제 구현: navigate('/');
  };

  return (
    <div className="flex w-full min-h-screen">
      {/* 왼쪽 일러스트 영역 */}
      <div className="flex-1 bg-gradient-to-b from-[#B6A9FD] via-[#5BA5FF] to-[#C0F0F7] opacity-80 flex flex-col justify-center items-center relative px-15 py-15">
        <div className="font-['Wix_Madefor_Display'] font-semibold text-[48px] leading-[1.4] text-[#FAFAFC] text-left mb-10 z-2 xl:text-[32px] xl:text-center xl:mb-5 lg:text-[24px]">
          MOYA에<br />
          오신걸 환영합니다!
        </div>
        <div className="w-[400px] h-[400px] bg-white/10 rounded-full flex items-center justify-center text-[120px] z-2 backdrop-blur-[10px] border-3 border-white/20 xl:w-[200px] xl:h-[200px] xl:text-[80px] lg:w-[150px] lg:h-[150px] lg:text-[60px]">
          🎉
        </div>
      </div>
      
      {/* 오른쪽 메인 콘텐츠 영역 */}
      <div className="flex-1 bg-white flex flex-col justify-center items-center px-30 py-20 xl:px-20 xl:py-15 xl:flex-col lg:px-5 lg:py-7.5">
        <div className="max-w-[480px] xl:max-w-[400px]">
          <h1 className="font-['Wix_Madefor_Display'] font-semibold text-[40px] leading-[1.4] text-[#1B1C1F] text-center mb-15 xl:text-[28px] xl:text-center xl:mb-10 lg:text-[24px]">
            
          </h1>
          
          <div className="flex flex-col gap-[18px]">
            <button 
              className="w-[480px] h-12 bg-[#2B7FFF] text-[#FAFAFC] border-none rounded-[12px] font-['Wix_Madefor_Display'] font-semibold text-[14px] leading-[1.714] cursor-pointer transition-all duration-200 ease-in-out flex items-center justify-center px-3 py-0.75 hover:bg-[#1E6FE8] xl:w-[400px] xl:max-w-[400px] lg:w-full"
              onClick={goToProfile}
            >
              이력서 및 포트폴리오 등록하러가기
            </button>
            <button 
              className="w-[480px] h-12 bg-[#EFEFF3] text-[#404249] border-none rounded-[12px] font-['Wix_Madefor_Display'] font-semibold text-[14px] leading-[1.714] cursor-pointer transition-all duration-200 ease-in-out flex items-center justify-center px-3 py-0.75 hover:bg-[#E0E0E6] xl:w-[400px] xl:max-w-[400px] lg:w-full"
              onClick={goToHome}
            >
              홈으로
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSucceeded;
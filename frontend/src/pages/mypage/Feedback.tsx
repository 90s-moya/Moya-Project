import React from 'react';
import { useNavigate } from "react-router-dom";

const Feedback: React.FC = () => {
    const navigate = useNavigate();
  const handleGoToStudy = () => {
    alert('면접 스터디 페이지로 이동합니다.');
    // 실제 구현: router.push('/study');
  };

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      alert('로그아웃 되었습니다.');
    }
  };

  const handleNavigation = (page: string) => {
    navigate(`/interview/${page}`);
    // alert(`${menu} 페이지로 이동합니다.`);
  };

  const handleSidebarNavigation = (menu: string) => {
    navigate(`/mypage/${menu}`);
    // alert(`${menu} 페이지로 이동합니다.`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 상단바 */}
      <header className="w-full h-20 bg-white flex items-center justify-between px-8 border-b border-gray-100">
        {/* MOYA 로고 */}
        <div className="text-[50px] font-bold text-[#2B7FFF] leading-[2em] tracking-wide">
          MOYA
        </div>
        
        {/* 네비게이션 메뉴 */}
        <div className="flex items-center gap-20">
          <button 
            onClick={() => handleNavigation('start')} 
            className="text-lg font-semibold text-[#1B1C1F] hover:text-[#2B7FFF] transition-colors"
          >
            AI 모의 면접
          </button>
          <button 
            onClick={() => handleNavigation('면접 스터디')} 
            className="text-lg font-semibold text-[#1B1C1F] hover:text-[#2B7FFF] transition-colors"
          >
            면접 스터디
          </button>
          <button 
            onClick={() => handleNavigation('마이페이지')} 
            className="text-lg font-semibold text-[#1B1C1F] hover:text-[#2B7FFF] transition-colors"
          >
            마이페이지
          </button>
        </div>

        {/* 로그아웃 & 사용자명 */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLogout} 
            className="text-sm font-semibold text-[#6F727C] hover:text-[#404249] transition-colors"
          >
            로그아웃
          </button>
          <div className="bg-[#2B7FFF] text-white px-4 py-2 rounded-[10px] text-sm font-semibold">
            최참빛님
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex max-w-7xl mx-auto px-8 py-12">
        {/* 사이드바 */}
        <aside className="w-80 mr-12">
          <h1 className="text-[40px] font-semibold text-[#1B1C1F] mb-8 leading-[1.4]">
            마이페이지
          </h1>
          
          <div className="bg-[#F4F4F6] rounded-[10px] p-5">
            <div className="flex flex-col gap-6">
              <button 
                onClick={() => handleSidebarNavigation('userinfo')}
                className="text-left text-lg font-semibold text-[#6F727C] hover:text-[#2B7FFF] transition-colors"
              >
                회원정보
              </button>
              <button 
                onClick={() => handleSidebarNavigation('portfolio')}
                className="text-left text-lg font-semibold text-[#6F727C] hover:text-[#2B7FFF] transition-colors"
              >
                이력서 및 포트폴리오
              </button>
              <button 
                onClick={() => handleSidebarNavigation('모의 면접 결과')}
                className="text-left text-lg font-semibold text-[#6F727C] hover:text-[#2B7FFF] transition-colors"
              >
                모의 면접 결과
              </button>
              <button className="text-left text-lg font-semibold text-[#2B7FFF]">
                면접 스터디 피드백
              </button>
            </div>
          </div>
        </aside>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1">
          {/* 페이지 제목 */}
          <h2 className="text-2xl font-semibold text-[#2B7FFF] mb-8 leading-[1.4]">
            면접 스터디 피드백
          </h2>

          {/* 메인 콘텐츠 박스 */}
          <div className="w-full max-w-[880px] h-[360px] bg-[#FAFAFC] border border-[#EFEFF3] rounded-[10px] flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              {/* 아이콘 */}
              <div className="w-9 h-9 bg-white flex items-center justify-center">
                <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path 
                    d="M3.375 6.75H23.625M3.375 13.5H23.625M3.375 20.25H23.625M8.4375 6.75V20.25M18.5625 6.75V20.25" 
                    stroke="#989AA2" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              
              {/* 메시지 텍스트 */}
              <p className="text-center text-[#6F727C] font-semibold text-base leading-[1.875] mb-3">
                저장된 피드백이 없어요.<br />
                면접 스터디 해보시구 피드백을 받아보세요!
              </p>
              
              {/* 면접 스터디 하러가기 버튼 */}
              <button 
                onClick={handleGoToStudy}
                className="bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white px-4 py-2 rounded-[10px] text-sm font-semibold leading-[1.714] transition-colors h-10"
              >
                면접 스터디 하러가기
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* 프로필 아이콘 (우하단 고정) */}
      <div className="fixed bottom-12 right-12">
        <div className="w-15 h-15 bg-white rounded-full border border-[#EFEFF3] flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
          <div className="w-6 h-6 flex items-center justify-center">
            <svg width="17" height="19" viewBox="0 0 17 19" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 9C0 9 0 18 8.5 18C17 18 17 9 17 9" stroke="#6F727C" strokeWidth="2.5"/>
              <path d="M8.5 0.5V18.5" stroke="#6F727C" strokeWidth="2.5"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
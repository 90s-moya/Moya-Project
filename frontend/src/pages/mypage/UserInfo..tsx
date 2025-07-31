import React from 'react';

const UserInfo: React.FC = () => {
  const handleNicknameChange = () => {
    alert('닉네임 변경 페이지로 이동합니다.');
  };

  const handlePasswordChange = () => {
    alert('비밀번호 변경 페이지로 이동합니다.');
  };

  const handleWithdraw = () => {
    if (confirm('정말로 회원탈퇴를 하시겠습니까?')) {
      alert('회원탈퇴 처리되었습니다.');
    }
  };

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      alert('로그아웃 되었습니다.');
    }
  };

  const handleNavigation = (menu: string) => {
    alert(`${menu} 페이지로 이동합니다.`);
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
            onClick={() => handleNavigation('AI 모의 면접')} 
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
              <button className="text-left text-lg font-semibold text-[#2B7FFF]">
                회원정보
              </button>
              <button 
                onClick={() => handleNavigation('이력서 및 포트폴리오')} 
                className="text-left text-lg font-semibold text-[#6F727C] hover:text-[#2B7FFF] transition-colors"
              >
                이력서 및 포트폴리오
              </button>
              <button 
                onClick={() => handleNavigation('모의 면접 결과')} 
                className="text-left text-lg font-semibold text-[#6F727C] hover:text-[#2B7FFF] transition-colors"
              >
                모의 면접 결과
              </button>
              <button 
                onClick={() => handleNavigation('면접 스터디 피드백')} 
                className="text-left text-lg font-semibold text-[#6F727C] hover:text-[#2B7FFF] transition-colors"
              >
                면접 스터디 피드백
              </button>
            </div>
          </div>
        </aside>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1">
          <h2 className="text-2xl font-semibold text-[#1B1C1F] mb-8 leading-[1.4]">
            회원정보
          </h2>

          {/* 구분선 */}
          <div className="w-full h-px bg-[#DEDEE4] mb-8"></div>

          <div className="max-w-2xl space-y-8">
            {/* 닉네임 */}
            <div>
              <label className="block text-lg font-semibold text-[#404249] mb-4 leading-[1.556]">
                닉네임
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-12 bg-white border border-[#DEDEE4] rounded-xl flex items-center px-4">
                  <span className="text-sm font-semibold text-[#1B1C1F] leading-[1.714]">
                    최참빛
                  </span>
                </div>
                <button 
                  onClick={handleNicknameChange} 
                  className="w-24 h-8 bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white rounded-md text-sm font-normal flex items-center justify-center transition-colors"
                >
                  닉네임 변경
                </button>
              </div>
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-lg font-semibold text-[#404249] mb-4 leading-[1.556]">
                이메일
              </label>
              <div className="h-12 bg-white border border-[#DEDEE4] rounded-xl flex items-center px-4">
                <span className="text-sm font-semibold text-[#1B1C1F] leading-[1.714]">
                  rlawhdtn97@naver.com
                </span>
              </div>
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-lg font-semibold text-[#404249] mb-4 leading-[1.556]">
                비밀번호
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-12 bg-white border border-[#DEDEE4] rounded-xl flex items-center px-4">
                  <span className="text-sm font-semibold text-[#1B1C1F] leading-[1.714]">
                    *********
                  </span>
                </div>
                <button 
                  onClick={handlePasswordChange} 
                  className="w-24 h-8 bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white rounded-md text-sm font-normal flex items-center justify-center transition-colors"
                >
                  비밀번호 변경
                </button>
              </div>
            </div>

            {/* 회원탈퇴 */}
            <div className="pt-4">
              <button 
                onClick={handleWithdraw} 
                className="w-full h-12 bg-[#EFEFF3] hover:bg-[#E0E0E6] text-[#404249] border-none rounded-xl text-sm font-semibold flex items-center justify-center transition-colors"
              >
                회원탈퇴
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

export default UserInfo;
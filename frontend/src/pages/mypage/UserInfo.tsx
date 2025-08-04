import React from 'react';
import Header from '@/components/common/Header';
import Sidebar from '@/components/mypage/Sidebar';
import { useNavigate } from 'react-router-dom';

const UserInfo: React.FC = () => {
  const navigate = useNavigate();
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

  const handleSidebarNavigation = (menu: string) => {
    navigate(`/mypage/${menu}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* 메인 콘텐츠 */}
      <div className="flex max-w-7xl mx-auto px-8 py-12 pt-32">
        <Sidebar activeMenu="userinfo" onNavigate={handleSidebarNavigation} />

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
              <div className="h-12 bg-white border border-[#DEDEE4] rounded-xl flex items-center justify-between px-4">
                <input 
                  type="text"
                  placeholder="닉네임을 입력하세요"
                  className="flex-1 text-sm font-semibold text-[#1B1C1F] leading-[1.714] bg-transparent border-none outline-none"
                />
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
                <input 
                  type="email"
                  placeholder="이메일을 입력하세요"
                  className="w-full text-sm font-semibold text-[#1B1C1F] leading-[1.714] bg-transparent border-none outline-none"
                />
              </div>
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-lg font-semibold text-[#404249] mb-4 leading-[1.556]">
                비밀번호
              </label>
              <div className="h-12 bg-white border border-[#DEDEE4] rounded-xl flex items-center justify-between px-4">
                <input 
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  className="flex-1 text-sm font-semibold text-[#1B1C1F] leading-[1.714] bg-transparent border-none outline-none"
                />
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
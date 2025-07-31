import React from 'react';
import Header from '@/components/common/Header';
import Sidebar from '@/components/mypage/Sidebar';
import { useNavigate } from 'react-router-dom';

const Result: React.FC = () => {
  const navigate = useNavigate();
  const handleGoToInterview = () => {
    alert('AI 모의 면접 페이지로 이동합니다.');
    // 실제 구현: router.push('/interview');
  };

  const handleSidebarNavigation = (menu: string) => {
    navigate(`/mypage/${menu}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* 메인 콘텐츠 */}
      <div className="flex max-w-7xl mx-auto px-8 py-12">
        <Sidebar activeMenu="result" onNavigate={handleSidebarNavigation} />

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1">
          {/* 페이지 제목 */}
          <h2 className="text-2xl font-semibold text-[#2B7FFF] mb-8 leading-[1.4]">
            모의 면접 결과
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
                모의면접 결과가 존재하지 않아요!<br />
                모의면접 하시고 결과를 저장해보세요!
              </p>
              
              {/* AI 모의 면접 하러가기 버튼 */}
              <button 
                onClick={handleGoToInterview}
                className="bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white px-4 py-2 rounded-[10px] text-sm font-semibold leading-[1.714] transition-colors h-10"
              >
                AI 모의 면접 하러가기
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

export default Result;
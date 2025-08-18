import React from "react";
import Header from '@/components/common/Header';
import Sidebar from '@/components/mypage/Sidebar';
import { useNavigate } from 'react-router-dom';

interface MypageLayoutProps {
  children: React.ReactNode;
  activeMenu: string;
}

const MypageLayout: React.FC<MypageLayoutProps> = ({ children, activeMenu }) => {
  const navigate = useNavigate();

  const handleSidebarNavigation = (menu: string) => {
    navigate(`/mypage/${menu}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* 레이아웃 컨테이너 - 모바일: 세로 배치, 데스크톱: 가로 배치 */}
      <div className="flex flex-col md:flex-row max-w-7xl mx-auto py-12 pt-20">
        {/* 사이드바 (모바일: 상단, 데스크톱: 좌측) */}
        <Sidebar activeMenu={activeMenu} onNavigate={handleSidebarNavigation} />

        {/* 메인 콘텐츠 영역 (모바일: 하단, 데스크톱: 우측) */}
        <main className="flex-1 md:ml-12 px-8 md:pt-12 md:min-w-[600px]">
          {children}
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

export default MypageLayout; 
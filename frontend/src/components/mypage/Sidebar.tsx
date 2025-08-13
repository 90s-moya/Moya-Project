import React from "react";

interface SidebarProps {
  activeMenu: string;
  onNavigate: (menu: string) => void;
}

const menuItems = [
  { key: "userinfo", label: "회원정보" },
  { key: "resume", label: "이력서 / 포트폴리오 / 자기소개서" },
  { key: "result", label: "모의 면접 결과" },
  { key: "feedback", label: "면접 스터디 피드백" },
  { key: "room", label: "참여 면접 스터디 목록" },
];

const Sidebar: React.FC<SidebarProps> = ({ activeMenu, onNavigate }) => {
  return (
    <aside className="w-full md:w-60 md:mr-12 md:pt-12">
      {/* 데스크톱 버전 - 세로 배치 */}
      <div className="hidden md:block">
        <h1 className="text-[40px] font-semibold text-[#1B1C1F] mb-8 leading-[1.4]">
          마이페이지
        </h1>

        <div className="bg-[#F4F4F6] rounded-[10px] p-5">
          <div className="flex flex-col gap-6">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`text-left text-lg font-semibold transition-colors ${
                  activeMenu === item.key
                    ? "text-[#2B7FFF]"
                    : "text-[#6F727C] hover:text-[#2B7FFF]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* 모바일 버전 - 가로 배치 (topbar 스타일) */}
      <div className="md:hidden mb-6">
        <div className="bg-white rounded-[10px] py-2 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 px-4 whitespace-nowrap w-max">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeMenu === item.key
                    ? "text-[#2B7FFF]"
                    : "bg-white text-[#6F727C] hover:bg-[#E3F0FF] hover:text-[#2B7FFF]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

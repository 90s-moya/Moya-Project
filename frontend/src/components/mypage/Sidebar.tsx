import React from "react";

interface SidebarProps {
  activeMenu: string;
  onNavigate: (menu: string) => void;
}

const menuItems = [
  { key: "userinfo", label: "회원정보" },
  { key: "resume", label: "이력서 및 포트폴리오" },
  { key: "result", label: "모의 면접 결과" },
  { key: "feedback", label: "면접 스터디 피드백" },
];

const Sidebar: React.FC<SidebarProps> = ({ activeMenu, onNavigate }) => {
  return (
    <aside className="w-80 mr-12">
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
    </aside>
  );
};

export default Sidebar;

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  scrollBg?: boolean;
}

export default function Header({ scrollBg = false }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!scrollBg) return; // 메인페이지가 아니면 스크롤 이벤트 등록 X

    const scrollContainer = document.querySelector(".scroll-container");
    const onScroll = () => {
      if (scrollContainer) {
        setScrolled(scrollContainer.scrollTop > 10);
      }
    };

    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", onScroll);
      setScrolled(scrollContainer.scrollTop > 10);
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", onScroll);
      }
    };
  }, [scrollBg]);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-colors duration-300 ${
        scrollBg
          ? scrolled
            ? "bg-white border-b border-[#dedee4] shadow"
            : "bg-transparent"
          : "bg-white border-b border-[#dedee4] shadow"
      }`}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between h-20 px-8">
        {/* 좌측: 로고 */}
        <div className="flex-1 flex justify-start">
          <div className="text-[#2b7fff] text-2xl font-bold select-none">
            MOYA
          </div>
        </div>
        {/* 중앙: 네비게이션 */}
        <nav className="flex-1 flex justify-center">
          <div className="flex space-x-10">
            <a
              href="#"
              className={`font-semibold transition-colors ${
                scrolled ? "text-[#1b1c1f]" : "text-white"
              } hover:text-[#2b7fff]`}
            >
              AI 모의면접
            </a>
            <a
              href="#"
              className={`font-semibold transition-colors ${
                scrolled ? "text-[#1b1c1f]" : "text-white"
              } hover:text-[#2b7fff]`}
            >
              면접 스터디
            </a>
            <a
              href="#"
              className={`font-semibold transition-colors ${
                scrolled ? "text-[#1b1c1f]" : "text-white"
              } hover:text-[#2b7fff]`}
            >
              마이페이지
            </a>
          </div>
        </nav>
        {/* 우측: 로그인/회원가입 */}
        <div className="flex-1 flex justify-end items-center space-x-4">
          <button className="text-gray-700 hover:text-[#2b7fff] font-medium transition-colors">
            로그인
          </button>
          <Button className="bg-[#2b7fff] hover:bg-blue-600 text-white px-6 py-2 rounded-lg">
            회원가입
          </Button>
        </div>
      </div>
    </header>
  );
}

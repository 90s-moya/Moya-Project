// 반응형 Header 리팩토링 + 텍스트 색상 문제 해결
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";

interface HeaderProps {
  scrollBg?: boolean;
}

export default function Header({ scrollBg = false }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!scrollBg) return;
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollBg]);

  const navLinkClass = (baseColor: string) =>
    `text-lg md:text-xl font-semibold transition-colors ${baseColor} hover:text-[#2b7fff]`;

  const linkColor = scrollBg
    ? scrolled
      ? "text-[#1b1c1f]"
      : "text-white"
    : "text-[#1b1c1f]";

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
      <div className="max-w-[1180px] mx-auto flex items-center justify-between h-20 px-4 md:px-8">
        {/* 로고 */}
        <div className="text-[#2b7fff] text-2xl md:text-3xl font-bold select-none">
          <Link to="/">MOYA</Link>
        </div>

        {/* 모바일 메뉴 버튼 */}
        <button
          className="md:hidden text-gray-700"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu size={28} />
        </button>

        {/* 데스크탑 네비게이션 */}
        <nav className="hidden md:flex items-center space-x-10">
          <Link to="/interview/start" className={navLinkClass(linkColor)}>
            AI 모의면접
          </Link>
          <Link to="/study" className={navLinkClass(linkColor)}>
            면접 스터디
          </Link>
          <Link to="#" className={navLinkClass(linkColor)}>
            마이페이지
          </Link>
        </nav>

        {/* 데스크탑 로그인/회원가입 */}
        <div className="hidden md:flex items-center space-x-4">
          <Link
            to="/login"
            className="text-gray-700 hover:text-[#2b7fff] text-lg font-medium"
          >
            로그인
          </Link>
          <Button className="bg-[#2b7fff] hover:bg-blue-600 text-white text-lg px-6 py-2 rounded-lg">
            <Link to="">회원가입</Link>
          </Button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {mobileMenuOpen && (
        <div className={`md:hidden px-6 pb-6 pt-2 space-y-4 bg-white shadow`}>
          <nav className="flex flex-col space-y-2">
            <Link
              to="/interview/start"
              className="text-gray-800 text-lg font-medium"
            >
              AI 모의면접
            </Link>
            <Link to="#" className="text-gray-800 text-lg font-medium">
              면접 스터디
            </Link>
            <Link to="#" className="text-gray-800 text-lg font-medium">
              마이페이지
            </Link>
          </nav>
          <div className="pt-4 flex flex-col gap-2">
            <Link to="/login" className="text-gray-700 text-lg font-medium">
              로그인
            </Link>
            <Button className="w-full bg-[#2b7fff] hover:bg-blue-600 text-white text-lg py-2">
              <Link to="">회원가입</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

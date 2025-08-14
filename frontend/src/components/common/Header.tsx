// 반응형 Header 리팩토링 + 텍스트 색상 문제 해결
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

interface HeaderProps {
  scrollBg?: boolean;
}

export default function Header({ scrollBg = false }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isLogin, logout } = useAuthStore();

  // console.log("Header - isLogin:", isLogin);

  useEffect(() => {
    if (!scrollBg) return;
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollBg]);

  const navLinkClass = (baseColor: string) =>
    `text-base md:text-lg font-medium transition-colors ${baseColor} hover:text-[#2b7fff]`;

  const linkColor = scrollBg
    ? scrolled
      ? "text-gray-600"
      : "text-white"
    : "text-gray-600";

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-colors duration-300 ${
        scrollBg
          ? scrolled
            ? "bg-white border-b border-gray-200 shadow-sm"
            : "bg-transparent"
          : "bg-white border-b border-gray-200 shadow-sm"
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
          <Link to="/mypage/userinfo" className={navLinkClass(linkColor)}>
            마이페이지
          </Link>
        </nav>

        {/* 데스크탑 로그인/회원가입 */}
        <div className="hidden md:flex items-center space-x-4">
          {isLogin ? (
            <button
              onClick={logout}
              className="text-gray-600 hover:text-[#2b7fff] text-base font-medium"
            >
              로그아웃
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="text-gray-600 hover:text-[#2b7fff] text-base font-medium"
              >
                로그인
              </Link>
              <Button className="bg-[#2b7fff] hover:bg-blue-600 text-white text-base px-6 py-2 rounded-lg">
                <Link to="/signup/detail">회원가입</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 모바일 메뉴 오버레이 */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* 배경 블러 오버레이 */}
          <div 
            className="absolute inset-0 bg-white/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* 메뉴 컨테이너 */}
          <div className="absolute top-0 left-0 w-full h-full backdrop-blur-md">
            <div className="flex flex-col h-full">
              {/* 헤더 영역 */}
              <div className="flex items-center justify-between p-6">
                <div className="text-[#2b7fff] text-2xl font-bold">MOYA</div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* 메뉴 아이템들 */}
              <div className="flex-1 flex flex-col justify-start px-8 pt-8 space-y-8">
                <nav className="space-y-8">
                  <Link
                    to="/interview/start"
                    className="block text-xl font-medium text-gray-800 hover:text-[#2b7fff] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    AI 모의면접
                  </Link>
                  <Link 
                    to="/study" 
                    className="block text-xl font-medium text-gray-800 hover:text-[#2b7fff] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    면접 스터디
                  </Link>
                  <Link 
                    to="/mypage/userinfo" 
                    className="block text-xl font-medium text-gray-800 hover:text-[#2b7fff] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    마이페이지
                  </Link>
                </nav>
                
                {/* 로그인/회원가입 영역 */}
                <div className="space-y-8">
                  {isLogin ? (
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left text-xl font-medium text-gray-700 hover:text-[#2b7fff] transition-colors"
                    >
                      로그아웃
                    </button>
                  ) : (
                    <>
                      <Link 
                        to="/login" 
                        className="block text-xl font-medium text-gray-700 hover:text-[#2b7fff] transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        로그인
                      </Link>
                      <Link 
                        to="/signup/detail" 
                        className="block text-xl font-medium text-gray-700 hover:text-[#2b7fff] transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        회원가입
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

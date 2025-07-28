import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="flex fixed w-full z-11 items-center justify-between px-6 py-4 border-b border-[#dedee4]">
      <div className="flex items-center space-x-8">
        <div className="text-[#2b7fff] text-2xl font-bold">MOYA</div>
        <nav className="flex space-x-8">
          <a href="#" className="text-[#1b1c1f] hover:text-[#2b7fff]">
            AI 모의 면접
          </a>
          <a href="#" className="text-[#1b1c1f] hover:text-[#2b7fff]">
            면접 스터디
          </a>
          <a href="#" className="text-[#1b1c1f] hover:text-[#2b7fff]">
            마이페이지
          </a>
        </nav>
      </div>
      <div className="flex items-center space-x-4">
        <button className="text-gray-700 hover:text-[#2b7fff] font-medium">
          로그인
        </button>
        <Button className="bg-[#2b7fff] hover:bg-blue-600 text-white px-6 py-2 rounded-lg">
          회원가입
        </Button>
      </div>
    </header>
  );
}

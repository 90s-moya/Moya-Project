import { Button } from "@/components/ui/button";
import CloudFriends from "@/assets/images/cloud-friends.png";

export default function HomeStudySection() {
  return (
    <div className="h-screen bg-gradient-to-b from-[#c8b5ff] via-[#b8a8ff] to-[#a8d8ff]">
      {/* Main Content */}
      <main className="flex items-center justify-between px-6 py-16 max-w-7xl mx-auto">
        <div className="flex-1 max-w-2xl">
          <p className="text-white text-lg mb-6 font-medium">
            다양한 사람들과 면접 스터디를 경험해보세요
          </p>

          <h1 className="text-white text-6xl font-bold mb-8 leading-tight">
            모야? 모의 면접 스터디야!
          </h1>

          <p className="text-white text-xl mb-12 opacity-90">
            당신만을 위한 모의 면접을 시작할 수 있습니다.
          </p>

          <div className="pt-6 flex justify-center lg:justify-start">
            <Button className="bg-[#2b7fff] hover:bg-blue-500 text-white px-6 py-9 text-lg md:text-xl font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
              면접 스터디 시작하기
            </Button>
          </div>
        </div>

        {/* Character Illustrations */}
        <div className="flex-1 flex justify-end items-center relative">
          <img
            src={CloudFriends}
            alt="AI 면접 캐릭터"
            className="w-[480px] md:w-[520px] lg:w-[580px] h-auto drop-shadow-xl scale-x-[-1]"
            draggable={false}
          />
        </div>
      </main>
    </div>
  );
}

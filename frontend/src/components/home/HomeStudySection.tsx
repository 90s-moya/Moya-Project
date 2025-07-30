import { Button } from "@/components/ui/button";
import CloudFriends from "@/assets/images/cloud-friends.png";
import { Link } from "react-router-dom";

export default function HomeStudySection() {
  return (
    <section className="min-h-screen bg-gradient-to-b from-[#c8b5ff] via-[#b8a8ff] to-[#a8d8ff] flex items-center py-12">
      <div className="max-w-7xl mx-auto w-full px-6 flex flex-col lg:flex-row gap-12 items-center">
        {/* 왼쪽: 텍스트 */}
        <div className="w-full lg:w-1/2 text-center lg:text-left space-y-6">
          <p className="text-white text-lg md:text-2xl font-medium drop-shadow-sm">
            다양한 사람들과 면접 스터디를 경험해보세요
          </p>

          <h1 className="text-white text-4xl md:text-6xl font-extrabold leading-tight drop-shadow-md">
            모야? 모의 면접 스터디야!
          </h1>

          <p className="text-white text-lg md:text-2xl opacity-90 drop-shadow-sm">
            당신만을 위한 모의 면접을 시작할 수 있습니다.
          </p>

          <div className="pt-6 flex justify-center lg:justify-start">
            <Button className="bg-[#2b7fff] hover:bg-blue-500 text-white px-6 py-4 md:py-6 text-lg md:text-xl font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
              <Link to="/study/start">AI 모의 면접 시작하기</Link>
            </Button>
          </div>
        </div>

        {/* 오른쪽: 캐릭터 이미지 */}
        <div className="flex justify-center lg:justify-end w-full lg:w-1/2">
          <img
            src={CloudFriends}
            alt="AI 면접 캐릭터"
            className="w-72 sm:w-80 md:w-96 lg:w-[520px] xl:w-[580px] h-auto drop-shadow-xl"
            draggable={false}
          />
        </div>
      </div>
    </section>
  );
}

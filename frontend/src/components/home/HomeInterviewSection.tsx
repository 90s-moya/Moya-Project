import { Button } from "@/components/ui/button";
import CloudFriends from "@/assets/images/cloud-friends.png";

export default function HomeInterviewSection() {
  return (
    <section className="h-screen bg-gradient-to-b from-[#c8b5ff] via-[#b8c5ff] to-[#a8d5ff] flex items-center">
      <div className="max-w-7xl mx-auto w-full px-6 grid lg:grid-cols-2 gap-12 items-center">
        {/* 왼쪽: 캐릭터 이미지 */}
        <div className="flex justify-center lg:justify-start">
          <img
            src={CloudFriends}
            alt="AI 면접 캐릭터"
            className="w-[480px] md:w-[520px] lg:w-[580px] h-auto drop-shadow-xl"
            draggable={false}
          />
        </div>

        {/* 오른쪽: 텍스트 */}
        <div className="text-center lg:text-left space-y-6">
          {/* 소제목 */}
          <p className="text-white text-xl md:text-2xl font-medium drop-shadow-sm">
            AI 면접관과 실전처럼 연습하세요.
          </p>

          {/* 메인 타이틀 */}
          <h2 className="text-white text-5xl md:text-6xl font-extrabold leading-tight drop-shadow-md">
            모야? AI 모의 면접이야!
          </h2>

          {/* 설명 */}
          <p className="text-white text-xl opacity-90 drop-shadow-sm max-w-xl mx-auto lg:mx-0">
            당신만을 위한 모의 면접을 시작할 수 있습니다.
          </p>

          {/* CTA 버튼 */}
          <div className="pt-6 flex justify-center lg:justify-end">
            <Button className="bg-[#2b7fff] hover:bg-blue-500 text-white px-6 py-9 text-lg md:text-xl font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
              AI 모의 면접 시작하기
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

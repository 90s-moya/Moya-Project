// 리팩토링: HomeIntroSection 중앙 텍스트 크기 확대
import WhiteCharacter from "@/assets/images/white-character.png";
import AiCharacter from "@/assets/images/ai-character.png";
import Heart from "@/assets/images/heart.png";
import WhiteMoya from "@/assets/images/white-moya.png";
import Clover from "@/assets/images/clover.png";

export default function HomeIntroSection() {
  return (
    <section className="relative w-full min-h-screen bg-gradient-to-b from-[#dbcdfc] via-[#c9d7ff] to-[#d8f5ff] overflow-hidden py-16 flex items-center">
      <div className="max-w-7xl mx-auto w-full px-6 flex flex-col md:flex-row items-center justify-between gap-8 relative">
        {/* 왼쪽 캐릭터 */}
        <div className="flex-shrink-0 w-40 sm:w-60 md:w-72">
          <img
            src={WhiteCharacter}
            alt="화이트 캐릭터"
            className="w-full h-auto"
            draggable={false}
          />
        </div>

        {/* 중앙 텍스트 */}
        <div className="relative text-center flex flex-col items-center gap-4">
          {/* 하트 */}
          <img
            src={Heart}
            alt="하트"
            className="hidden md:block absolute -top-10 left-0 w-16 sm:w-20 md:w-24"
            draggable={false}
          />

          {/* 클로버 */}
          <img
            src={Clover}
            alt="클로버"
            className="hidden md:block absolute top-0 right-0 w-10 sm:w-14"
            draggable={false}
          />

          <h2 className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold drop-shadow-md">
            모야?
          </h2>
          <h3 className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold drop-shadow-md">
            모의 면접이야!
          </h3>

          {/* MOYA 이미지 로고 */}
          <img
            src={WhiteMoya}
            alt="MOYA 로고"
            className="w-60 md:w-72"
            draggable={false}
          />
        </div>

        {/* 오른쪽 캐릭터 */}
        <div className="flex-shrink-0 w-36 sm:w-56 md:w-64">
          <img
            src={AiCharacter}
            alt="AI 캐릭터"
            className="w-full h-auto"
            draggable={false}
          />
        </div>
      </div>
    </section>
  );
}

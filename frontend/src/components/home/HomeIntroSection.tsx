import WhiteCharacter from "@/assets/images/white-character.png";
import AiCharacter from "@/assets/images/ai-character.png";
import Heart from "@/assets/images/heart.png";
import WhiteMoya from "@/assets/images/white-moya.png";
import Clover from "@/assets/images/clover.png";

export default function HomeIntroSection() {
  return (
    <section className="relative w-full h-screen bg-gradient-to-b from-[#dbcdfc] via-[#c9d7ff] to-[#d8f5ff] overflow-hidden">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-8 relative">
        {/* 왼쪽 캐릭터 */}
        <div className="flex-shrink-0 transform translate-x-4 translate-y-2">
          <img
            src={WhiteCharacter}
            alt="화이트 캐릭터"
            className="w-96 h-auto"
            draggable={false}
          />
        </div>

        {/* 중앙 텍스트 + 장식 요소들 */}
        <div className="relative flex flex-col items-center justify-center text-center px-4">
          {/* 하트 */}
          <img
            src={Heart}
            alt="하트"
            className="absolute -top-20 -left-34 w-32 md:w-36"
            draggable={false}
          />
          {/* 클로버 */}
          <img
            src={Clover}
            alt="클로버"
            className="absolute top-4 -right-15 w-20 md:w-24"
            draggable={false}
          />
          {/* 텍스트 */}
          <h2
            className="text-white text-5xl md:text-6xl font-extrabold drop-shadow-md mb-3"
            style={{ transform: "translateX(-100px)" }}
          >
            모야?
          </h2>
          <h3
            className="text-white text-4xl md:text-5xl font-extrabold drop-shadow-md mb-6"
            style={{ transform: "translateX(30px)" }}
          >
            모의 면접이야!
          </h3>
          {/* MOYA 이미지 로고 */}
          <img
            src={WhiteMoya}
            alt="MOYA 로고"
            className="w-80 md:w-96"
            draggable={false}
          />
        </div>

        {/* 오른쪽 캐릭터 */}
        <div className="flex-shrink-0 transform translate-y-2">
          <img
            src={AiCharacter}
            alt="AI 캐릭터"
            className="w-72 h-auto"
            draggable={false}
          />
        </div>
      </div>
    </section>
  );
}

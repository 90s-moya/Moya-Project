import { Button } from "@/components/ui/button";

type Props = {
  vh: string;
};

export default function HomeStudySection({ vh }: Props) {
  return (
    <div
      className=" bg-gradient-to-b from-[#c8b5ff] via-[#b8a8ff] to-[#a8d8ff]"
      style={{ height: vh }}
    >
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

          <Button className="bg-[#2b7fff] hover:bg-[#1e5fd4] text-white px-8 py-4 text-lg rounded-lg font-medium">
            면접 스터디 시작하기
          </Button>
        </div>

        {/* Character Illustrations */}
        <div className="flex-1 flex justify-end items-center relative">
          <div className="relative">
            {/* Main cloud character */}
            <div className="relative">
              <img
                src="/placeholder.svg?height=400&width=350"
                alt="MOYA Character"
                className="w-80 h-96 object-contain"
              />
            </div>

            {/* Smaller character with graduation cap */}
            <div className="absolute bottom-0 left-0">
              <img
                src="/placeholder.svg?height=150&width=150"
                alt="Study Character"
                className="w-32 h-32 object-contain"
              />
            </div>

            {/* Yellow star decoration */}
            <div className="absolute top-8 right-8">
              <img
                src="/placeholder.svg?height=60&width=60"
                alt="Star"
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

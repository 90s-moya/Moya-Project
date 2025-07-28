import { Button } from "@/components/ui/button";

type Props = {
  vh: string;
};

export default function HomeInterviewSection({ vh }: Props) {
  return (
    <div
      className=" bg-gradient-to-b from-[#c8b5ff] via-[#b8c5ff] to-[#a8d5ff]"
      style={{ height: vh }}
    >
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Character illustration */}
          <div className="relative flex justify-center lg:justify-start">
            {/* Star decoration */}
            <div className="absolute top-0 left-8 text-yellow-400 text-4xl">
              ⭐
            </div>

            {/* Main character illustration placeholder */}
            <div className="relative">
              <img
                src="/placeholder.svg?height=400&width=400"
                alt="AI tutoring characters"
                className="w-96 h-96 object-contain"
              />
            </div>
          </div>

          {/* Right side - Content */}
          <div className="text-center lg:text-left space-y-8">
            {/* Subtitle */}
            <p className="text-white text-lg font-medium opacity-90">
              AI 면접관과 실전처럼 연습하세요
            </p>

            {/* Main heading */}
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight">
              모야? AI 모의 면접이야!
            </h1>

            {/* Description */}
            <p className="text-white text-lg opacity-80 max-w-md mx-auto lg:mx-0">
              당신만을 위한 모의 면접을 시작할 수 있습니다.
            </p>

            {/* CTA Button */}
            <div className="pt-4">
              <Button className="bg-[#2b7fff] hover:bg-blue-600 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                AI 모의 면접 시작하기
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

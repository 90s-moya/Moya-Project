import Header from "@/components/common/Header";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-blue-200 to-pink-200 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/20 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-purple-300/30 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-pink-300/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-40 right-1/3 w-40 h-40 bg-blue-300/25 rounded-full blur-xl"></div>
      </div>

      <Header></Header>

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Left Character */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              {/* Star decoration */}
              <div className="absolute -top-8 -left-8 text-yellow-400 text-3xl">
                ⭐
              </div>

              {/* Cloud character placeholder */}
              <div className="w-48 h-56 bg-gradient-to-b from-white to-gray-100 rounded-full relative shadow-lg">
                {/* Face */}
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2">
                  <div className="flex space-x-3">
                    <div className="w-2 h-2 bg-black rounded-full"></div>
                    <div className="w-2 h-2 bg-black rounded-full"></div>
                  </div>
                  <div className="w-1 h-1 bg-black rounded-full mx-auto mt-2"></div>
                </div>

                {/* Blush */}
                <div className="absolute top-20 left-8 w-4 h-3 bg-pink-200 rounded-full opacity-60"></div>
                <div className="absolute top-20 right-8 w-4 h-3 bg-pink-200 rounded-full opacity-60"></div>

                {/* Body */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-24 bg-slate-700 rounded-t-3xl"></div>

                {/* Tablet */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-16 h-12 bg-gray-200 rounded border-2 border-gray-300"></div>
              </div>
            </div>
          </div>

          {/* Center Content */}
          <div className="text-center space-y-6">
            {/* Speech bubble */}
            <div className="relative inline-block">
              <div className="bg-red-500 text-white px-4 py-2 rounded-full relative">
                <span className="text-lg font-medium">모야?</span>
                <div className="absolute top-2 right-2 text-white">❤️</div>
              </div>
            </div>

            {/* Main heading */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">
              모의 면접이야!
            </h1>

            {/* MOYA logo */}
            <div className="text-6xl md:text-8xl font-bold text-white relative">
              M
              <span className="relative inline-block">
                O
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <span className="text-black text-sm">😊</span>
                  </div>
                </div>
              </span>
              YA
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 text-green-400 text-2xl">
              🌟
            </div>
            <div className="absolute bottom-0 left-0 text-yellow-400 text-xl">
              ✨
            </div>
          </div>

          {/* Right AI Character */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative">
              {/* Sparkle decoration */}
              <div className="absolute -top-4 -right-4 text-white text-2xl">
                ✨
              </div>

              {/* AI Monitor */}
              <div className="w-48 h-40 bg-slate-600 rounded-lg shadow-lg relative">
                {/* Screen */}
                <div className="absolute top-4 left-4 right-4 bottom-12 bg-gradient-to-b from-blue-100 to-blue-200 rounded">
                  {/* AI Character face */}
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="flex justify-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                        <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                      </div>
                      <div className="w-8 h-1 bg-slate-600 rounded-full mx-auto"></div>
                    </div>
                  </div>
                </div>

                {/* AI Label */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-slate-700 text-white px-4 py-1 rounded-full text-sm font-bold">
                  AI
                </div>
              </div>

              {/* Small decorative cloud */}
              <div className="absolute -bottom-4 -left-4 w-8 h-6 bg-green-300 rounded-full flex items-center justify-center text-xs">
                😊
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

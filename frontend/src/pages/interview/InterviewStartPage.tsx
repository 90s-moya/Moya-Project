// InterviewStartPage.tsx

import { Button } from "@/components/ui/button"
import Header from "@/components/common/Header"
import { useNavigate } from "react-router-dom";

export default function Component() {
  const navigate = useNavigate()
  const handleStartInterview = () => {
    navigate("/interview/documentlist")
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <Header scrollBg={false} />
      
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16 mt-16">
        <div className="text-center">
          {/* Illustration */}
          <div className="mb-12 flex justify-center">
            <div className="relative">
              {/* Computer Monitor */}
              <div className="bg-blue-100 rounded-lg p-8 relative">
                <div className="bg-white rounded-lg border-4 border-blue-300 p-6 w-80 h-48 flex items-center justify-center relative">
                  {/* Person illustration */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <div className="w-12 h-12 bg-blue-300 rounded-full flex items-center justify-center">
                        <div className="text-blue-700 text-xl">👤</div>
                      </div>
                    </div>
                    <div className="w-20 h-8 bg-blue-300 rounded mx-auto"></div>
                  </div>

                  {/* Speech bubble */}
                  <div className="absolute -left-16 top-4 bg-white border-2 border-gray-300 rounded-lg px-3 py-2 shadow-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    </div>
                    <div className="absolute top-4 -right-2 w-0 h-0 border-l-8 border-l-white border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
                  </div>
                </div>

                {/* Monitor stand */}
                <div className="w-16 h-8 bg-blue-300 mx-auto mt-2 rounded-b-lg"></div>
                <div className="w-24 h-2 bg-blue-400 mx-auto mt-1 rounded-full"></div>
              </div>

              {/* Plant decoration */}
              <div className="absolute -right-8 bottom-8">
                <div className="w-12 h-16 bg-amber-100 rounded-b-full flex items-end justify-center">
                  <div className="text-green-500 text-2xl mb-2">🌱</div>
                </div>
              </div>
            </div>
          </div>

          {/* Welcome text */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">환영합니다!</h1>
            <p className="text-lg text-gray-600 mb-8">AI와 함께 맞춤형 1:1 면접을 시작해보세요.</p>
          </div>

          {/* Start button */}
          <Button onClick={handleStartInterview} 
            size="lg" className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 text-lg rounded-full">
            면접시작
          </Button>
        </div>
      </main>
    </div>
  )
}

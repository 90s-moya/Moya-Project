"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function InterviewerSelection() {
  const [selectedPersonality, setSelectedPersonality] = useState<string | null>(null)

  const handlePersonalitySelect = (personalityId: string) => {
    setSelectedPersonality(personalityId)
  }

  const handleNext = () => {
    if (selectedPersonality) {
      alert("다음 단계로 이동합니다!")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <div className="text-2xl font-bold text-blue-500">MOYA</div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-700 hover:text-blue-500 font-medium">
              AI 모의 면접
            </a>
            <a href="#" className="text-gray-700 hover:text-blue-500 font-medium">
              면접 스터디
            </a>
            <a href="#" className="text-gray-700 hover:text-blue-500 font-medium">
              마이페이지
            </a>
          </nav>

          {/* User section */}
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">로그인</span>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">00님</Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="text-center mb-16">
          <h1 className="text-2xl font-bold text-gray-800">AI 면접관 성향 선택</h1>
        </div>

        {/* Personality Selection */}
        <div className="flex justify-center gap-12 mb-20">
          {/* 대화형 */}
          <div className="flex flex-col items-center">
            {/* Image Placeholder */}
            <div className="w-64 h-40 bg-gray-400 rounded-lg mb-6"></div>

            {/* Selection Button */}
            <Button
              onClick={() => handlePersonalitySelect("conversational")}
              className={`w-64 h-14 text-base font-medium rounded-lg transition-all ${
                selectedPersonality === "conversational"
                  ? "bg-blue-600 text-white ring-2 ring-blue-700"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              <div className="text-center">
                <div>대화형</div>
                <div className="text-sm">(따뜻함)</div>
              </div>
            </Button>
          </div>

          {/* 압박형 */}
          <div className="flex flex-col items-center">
            {/* Image Placeholder */}
            <div className="w-64 h-40 bg-gray-400 rounded-lg mb-6"></div>

            {/* Selection Button */}
            <Button
              onClick={() => handlePersonalitySelect("pressure")}
              className={`w-64 h-14 text-base font-medium rounded-lg transition-all ${
                selectedPersonality === "pressure"
                  ? "bg-blue-600 text-white ring-2 ring-blue-700"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              <div className="text-center">
                <div>압박형</div>
                <div className="text-sm">(꼼꼼 철저함, 냉정함)</div>
              </div>
            </Button>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex justify-between items-center">
          <div className="text-gray-500 text-lg">2/4</div>
          <Button
            onClick={handleNext}
            disabled={!selectedPersonality}
            className={`px-8 py-3 text-lg rounded-lg ${
              selectedPersonality
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            다음
          </Button>
        </div>
      </main>
    </div>
  )
}

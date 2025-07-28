import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/common/Header";

export default function StudySetupPage() {
  return (
    <div className="min-h-screen bg-[#fafafc]">
      {/* Header */}
      <Header></Header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-[#1b1c1f] text-center mb-12">
          면접스터디를 위한 환경을 설정해 주세요
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Video Preview */}
          <div className="space-y-6">
            <div className="relative bg-[#000000] rounded-2xl overflow-hidden aspect-video">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 relative">
                  {/* Character placeholder - using a simple avatar representation */}
                  <div className="w-full h-full bg-gradient-to-b from-[#f4d03f] to-[#f39c12] rounded-full relative overflow-hidden">
                    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-[#1b1c1f] rounded-full"></div>
                    <div className="absolute top-8 right-12 w-4 h-4 bg-[#1b1c1f] rounded-full"></div>
                    <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-[#1b1c1f] rounded-full"></div>
                    <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-[#1b1c1f] rounded-full"></div>
                  </div>
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-32 h-24 bg-[#8e44ad] rounded-t-3xl"></div>
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-6 h-16 bg-[#2b7fff]"></div>
                </div>
              </div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                <div className="w-2 h-2 bg-[#ffffff] rounded-full opacity-50"></div>
                <div className="w-2 h-2 bg-[#ffffff] rounded-full opacity-50"></div>
                <div className="w-2 h-2 bg-[#ffffff] rounded-full opacity-50"></div>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button className="bg-[#2b7fff] hover:bg-[#1a5fd9] text-white px-6 py-3 rounded-full flex items-center space-x-2">
                <span>비디오 시작</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
              <Button className="bg-[#2b7fff] hover:bg-[#1a5fd9] text-white px-6 py-3 rounded-full flex items-center space-x-2">
                <span>비디오 시작</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Settings Panel */}
          <div className="space-y-4">
            <div className="bg-[#ffffff] border border-[#dedee4] rounded-2xl p-6 flex items-center justify-between hover:shadow-sm transition-shadow">
              <span className="text-[#1b1c1f] font-medium">이력서</span>
              <Plus className="w-6 h-6 text-[#2b7fff]" />
            </div>

            <div className="bg-[#ffffff] border border-[#dedee4] rounded-2xl p-6 flex items-center justify-between hover:shadow-sm transition-shadow">
              <span className="text-[#1b1c1f] font-medium">포트폴리오</span>
              <Plus className="w-6 h-6 text-[#2b7fff]" />
            </div>

            <div className="bg-[#ffffff] border border-[#dedee4] rounded-2xl p-6 flex items-center justify-between hover:shadow-sm transition-shadow">
              <span className="text-[#1b1c1f] font-medium">자기소개서</span>
              <Plus className="w-6 h-6 text-[#2b7fff]" />
            </div>

            <div className="pt-6">
              <Button className="w-full bg-[#2b7fff] hover:bg-[#1a5fd9] text-white py-4 rounded-2xl text-lg font-medium">
                참여하기
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll to top button */}
        <div className="fixed bottom-8 right-8">
          <Button
            size="icon"
            className="bg-[#ffffff] hover:bg-[#efeff3] text-[#6f727c] border border-[#dedee4] rounded-full shadow-sm"
          >
            <ChevronUp className="w-5 h-5" />
          </Button>
        </div>
      </main>
    </div>
  );
}

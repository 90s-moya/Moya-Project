"use client";

import { Search, ChevronLeft, ChevronRight, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/common/Header";

export default function StudyListPage() {
  return (
    <div className="min-h-screen bg-[#ffffff]">
      {/* Header */}
      <Header></Header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1b1c1f] mb-2">
            면접 스터디 모집
          </h1>
          <p className="text-[#6f727c] mb-6">
            회원님에게 맞는 면접 스터디를 찾아보세요!
          </p>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Input
              placeholder="면접 스터디를 검색해보세요"
              className="pl-4 pr-10 py-3 border border-[#dedee4] rounded-lg focus:border-[#2b7fff] focus:ring-1 focus:ring-[#2b7fff]"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#6f727c] w-5 h-5" />
          </div>
        </div>

        {/* Recruitment Notice */}
        <div className="mb-8">
          <p className="text-[#2b7fff] font-medium">
            모집 인원이 얼마 안남았어요!
          </p>
        </div>

        {/* Study Cards Section 1 */}
        <div className="relative mb-12">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10"
            >
              <ChevronLeft className="w-6 h-6 text-[#6f727c]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10"
            >
              <ChevronRight className="w-6 h-6 text-[#2b7fff]" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-12">
            {[1, 2, 3].map((index) => (
              <div
                key={index}
                className="bg-[#fafafc] border border-[#dedee4] rounded-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-[#1b1c1f] font-semibold text-lg leading-tight">
                    SK 그룹 보안 솔루션 운영자 면스 모집
                  </h3>
                  <a
                    href="#"
                    className="text-[#2b7fff] text-sm hover:underline"
                  >
                    취급법
                  </a>
                </div>
                <p className="text-[#6f727c] text-sm mb-4">참여인원 4/6</p>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-[#6f727c] text-sm">평양</span>
                    <a
                      href="#"
                      className="text-[#2b7fff] text-sm hover:underline"
                    >
                      취급법
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6f727c] text-sm">일시</span>
                    <span className="text-[#1b1c1f] text-sm">
                      2025-07-28 18:00
                    </span>
                  </div>
                </div>
                <Button className="w-full bg-[#2b7fff] hover:bg-[#3758f9] text-white py-3 rounded-lg">
                  참여하기
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Find Studies Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[#1b1c1f] mb-6">
            면접 스터디를 찾아보세요!
          </h2>

          {/* Tabs */}
          <div className="flex space-x-8 mb-6">
            <button className="text-[#1b1c1f] font-medium border-b-2 border-[#1b1c1f] pb-2">
              마감임 순
            </button>
            <button className="text-[#6f727c] hover:text-[#1b1c1f] pb-2">
              최근 순
            </button>
          </div>

          {/* Category Filter */}
          <div className="mb-6">
            <p className="text-[#1b1c1f] font-medium">
              대분류(Ex : IT,금융 등등)
            </p>
          </div>

          {/* Study Cards Section 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((index) => (
              <div
                key={index}
                className="bg-[#fafafc] border border-[#dedee4] rounded-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-[#1b1c1f] font-semibold text-lg leading-tight">
                    SK 그룹 보안 솔루션 운영자 면스 모집
                  </h3>
                  <a
                    href="#"
                    className="text-[#2b7fff] text-sm hover:underline"
                  >
                    취급법
                  </a>
                </div>
                <p className="text-[#6f727c] text-sm mb-4">참여인원 4/6</p>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-[#6f727c] text-sm">평양</span>
                    <a
                      href="#"
                      className="text-[#2b7fff] text-sm hover:underline"
                    >
                      취급법
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6f727c] text-sm">일시</span>
                    <span className="text-[#1b1c1f] text-sm">
                      2025-07-28 18:00
                    </span>
                  </div>
                </div>
                <Button className="w-full bg-[#2b7fff] hover:bg-[#3758f9] text-white py-3 rounded-lg">
                  참여하기
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll to Top Button */}
        <div className="fixed bottom-8 right-8">
          <Button
            size="icon"
            className="bg-[#efeff3] hover:bg-[#dedee4] text-[#6f727c] rounded-full shadow-lg"
          >
            <ArrowUp className="w-5 h-5" />
          </Button>
        </div>
      </main>
    </div>
  );
}

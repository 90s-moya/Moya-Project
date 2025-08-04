import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/common/Header";
import StudyCard from "@/components/study/StudyCard";
import type { StudyRoom } from "@/types/study";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const studyData: Record<string, StudyRoom[]> = {
  featured: [],
  deadline: [],
  recent: [],
};

export default function StudyListPage() {
  const [rooms, setRooms] = useState<StudyRoom[]>([]); // 스터디 룸

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"deadline" | "recent">("deadline");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(6);

  const visibleStudies = studyData[activeTab].slice(0, visibleCount);
  const hasMore = visibleCount < studyData[activeTab].length;

  useEffect(() => {
    selectRooms();
  }, []);

  const selectRooms = async () => {
    const authStorage = localStorage.getItem("auth-storage");
    let token = "";
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      token = parsed.state.token;
      console.log(token); // → 바로 JWT 토큰 값만 나옴!
    }

    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/v1/room`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      console.log("✅ 데이터:", res.data); // 이건 배열 형태로 출력돼야 함
      console.log("check");
    } catch (err) {
      console.error("❌ 에러 발생", err);
    }
  };

  const visibleFeatured = studyData.featured.slice(
    carouselIndex,
    carouselIndex + 3
  );

  const handlePrev = () => {
    setCarouselIndex((prev) => (prev > 0 ? prev - 1 : 0));
  };

  const handleNext = () => {
    if (carouselIndex + 3 < studyData.featured.length) {
      setCarouselIndex(carouselIndex + 1);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header scrollBg={false} />

      <main className="max-w-[1180px] mx-auto px-4 md:px-6 lg:px-8 pt-[120px] pb-12 text-[17px] leading-relaxed">
        {/* Title Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-[#1b1c1f] mb-2">
              면접 스터디 모집
            </h1>
            <p className="text-[#4b4e57] text-lg">
              회원님에게 맞는 면접 스터디를 찾아보세요!
            </p>
          </div>
          <div className="w-full md:w-[420px] space-y-3">
            <div className="relative">
              <Input
                placeholder="면접 스터디를 검색해보세요"
                className="pl-6 pr-10 py-4 text-base border border-[#dedee4] rounded-lg focus:border-[#2b7fff] focus:ring-1 focus:ring-[#2b7fff] placeholder:text-base md:placeholder:text-lg"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#6f727c] w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Recruitment Notice */}
        <div className="mb-8 flex items-center justify-between">
          <p className="text-[#2b7fff] font-semibold text-2xl">
            모집 인원이 얼마 안남았어요!
          </p>
          <Button
            onClick={() => navigate("/study/create")}
            className="w-40 h-14 bg-[#2b7fff] hover:bg-blue-600 text-white font-semibold text-lg rounded-lg"
          >
            스터디 방 생성하기
          </Button>
        </div>

        {/* Study Cards Section 1 - Carousel*/}
        <div className="relative mb-16">
          <Button
            onClick={handlePrev}
            variant="ghost"
            size="icon"
            className="absolute -left-6 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-md hover:bg-gray-100"
            disabled={carouselIndex === 0}
          >
            <ChevronLeft className="w-6 h-6 text-[#6f727c]" />
          </Button>
          <Button
            onClick={handleNext}
            variant="ghost"
            size="icon"
            className="absolute -right-6 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-md hover:bg-gray-100"
            disabled={carouselIndex + 3 >= studyData.featured.length}
          >
            <ChevronRight className="w-6 h-6 text-[#2b7fff]" />
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 px-6">
            {visibleFeatured.map((study) => (
              <StudyCard key={study.room_id} {...study} />
            ))}
          </div>
        </div>

        {/* Study Cards Section */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-[#1b1c1f] mb-6">
            면접 스터디를 찾아보세요!
          </h2>

          {/* Tabs */}
          <div className="flex space-x-8 mb-6 text-base">
            <button
              onClick={() => {
                setActiveTab("deadline");
                setVisibleCount(6);
              }}
              className={`text-xl font-semibold pb-2 border-b-2 ${
                activeTab === "deadline"
                  ? "text-[#1b1c1f] border-[#1b1c1f]"
                  : "text-[#6f727c] border-transparent hover:text-[#1b1c1f]"
              }`}
            >
              마감순
            </button>
            <button
              onClick={() => {
                setActiveTab("recent");
                setVisibleCount(6);
              }}
              className={`text-xl font-semibold pb-2 border-b-2 ${
                activeTab === "recent"
                  ? "text-[#1b1c1f] border-[#1b1c1f]"
                  : "text-[#6f727c] border-transparent hover:text-[#1b1c1f]"
              }`}
            >
              최신순
            </button>
          </div>

          {/* Cards Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-[16px]">
            {visibleStudies.length === 0 ? (
              <p className="text-[#6f727c] col-span-full text-center">
                해당 조건의 면접 스터디가 없습니다.
              </p>
            ) : (
              visibleStudies.map((study) => (
                <StudyCard key={study.room_id} {...study} />
              ))
            )}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-10 flex justify-center">
              <Button
                onClick={() => setVisibleCount((prev) => prev + 6)}
                className="bg-[#2b7fff] hover:bg-blue-600 text-white px-8 py-3 rounded-lg text-lg"
              >
                더보기
              </Button>
            </div>
          )}
        </div>

        {/* Scroll to Top */}
        <div className="fixed bottom-8 right-8">
          <Button
            size="icon"
            className="bg-[#efeff3] hover:bg-[#dedee4] text-[#6f727c] rounded-full shadow-lg"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ArrowUp className="w-5 h-5" />
          </Button>
        </div>
      </main>
    </div>
  );
}

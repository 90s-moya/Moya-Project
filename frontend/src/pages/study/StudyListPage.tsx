import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/common/Header";
import StudyCard from "@/components/study/StudyCard";
import type { StudyRoom } from "@/types/study";
import { useNavigate } from "react-router-dom";
import { getRoomList } from "@/api/studyApi";

export default function StudyListPage() {
  const [rooms, setRooms] = useState<StudyRoom[]>([]); // 스터디 룸

  const navigate = useNavigate();

  // 캐로셀 관련 변수들
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(6);

  const [activeTab, setActiveTab] = useState<"deadline" | "recent">("deadline");

  useEffect(() => {
    const requestRooms = async () => {
      try {
        const data = await getRoomList();
        console.log("룸 전체 조회 결과 : ", data);
        setRooms(data);
      } catch (err) {
        console.error("에러 발생", err);
      }
    };

    requestRooms();
  }, []);

  // 최신순으로 정렬된 rooms
  const recentSortedRooms = [...rooms].sort(
    (a, b) => new Date(b.openAt).getTime() - new Date(a.openAt).getTime()
  );

  // 마감순으로 정렬된 rooms
  const deadlineSortedRooms = [...rooms].sort(
    (a, b) => new Date(a.expiredAt).getTime() - new Date(b.expiredAt).getTime()
  );

  // activeTab에 따라서 변하는 sortedRooms
  const sortedRooms =
    activeTab === "recent" ? recentSortedRooms : deadlineSortedRooms;

  // 실제로 보여지는 room의 개수 (더보기 버튼 있음)
  const visibleRooms = sortedRooms.slice(0, visibleCount);

  // 더보기 버튼 관련 변수
  const hasMore = visibleCount < sortedRooms.length;

  // 캐로셀에 쓰이는 rooms (참여 인원 차이가 1인 방만 필터링)
  const filteredCarouselRooms = deadlineSortedRooms.filter(
    (room) => room.maxUser - room.joinUser === 1
  );

  const carouselRooms = filteredCarouselRooms.slice(
    carouselIndex,
    carouselIndex + 3
  );

  // 캐로셀 이전 버튼 클릭 시 호출되는 함수
  const handlePrev = () => {
    setCarouselIndex((prev) => (prev > 0 ? prev - 1 : 0));
  };

  // 캐로셀 다음 버튼 클릭 시 호출되는 함수
  const handleNext = () => {
    if (carouselIndex + 3 < filteredCarouselRooms.length) {
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
            <ChevronLeft className="w-6 h-6 text-[#2b7fff]" />
          </Button>
          <Button
            onClick={handleNext}
            variant="ghost"
            size="icon"
            className="absolute -right-6 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-md hover:bg-gray-100"
            disabled={carouselIndex + 3 >= filteredCarouselRooms.length}
          >
            <ChevronRight className="w-6 h-6 text-[#2b7fff]" />
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 px-6">
            {carouselRooms.map((room) => (
              <StudyCard key={room.id} {...room} isCarousel={true} />
            ))}
          </div>
        </div>

        {/* 스터디 룸 카드  */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-[#1b1c1f] mb-6">
            면접 스터디를 찾아보세요!
          </h2>

          {/* 마감순 및 최신순 탭 */}
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
            {visibleRooms.length === 0 ? (
              <p className="text-[#6f727c] col-span-full text-center">
                해당 조건의 면접 스터디가 없습니다.
              </p>
            ) : (
              visibleRooms.map((room) => <StudyCard key={room.id} {...room} />)
            )}
          </div>

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

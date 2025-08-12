import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  Plus,
  Clock,
  Calendar,
  Users,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  // 긴급 모집 스터디 필터링 및 정렬
  const urgentRooms = rooms
    .filter((room) => room.maxUser - room.joinUser === 1) // 참여 인원 차이가 1인 방만
    .sort((a, b) => {
      // 마감일이 없는 스터디는 가장 후순위
      if (!a.expiredAt && !b.expiredAt) return 0;
      if (!a.expiredAt) return 1;
      if (!b.expiredAt) return -1;

      // 마감일이 가까운 순서로 정렬
      const now = new Date();
      const aTimeLeft = new Date(a.expiredAt).getTime() - now.getTime();
      const bTimeLeft = new Date(b.expiredAt).getTime() - now.getTime();

      return aTimeLeft - bTimeLeft;
    })
    .slice(0, 10); // 최대 10개만 표시

  const carouselRooms = urgentRooms.slice(carouselIndex, carouselIndex + 3);

  // 캐로셀 이전 버튼 클릭 시 호출되는 함수
  const handlePrev = () => {
    setCarouselIndex((prev) => (prev > 0 ? prev - 1 : 0));
  };

  // 캐로셀 다음 버튼 클릭 시 호출되는 함수
  const handleNext = () => {
    if (carouselIndex + 3 < urgentRooms.length) {
      setCarouselIndex(carouselIndex + 1);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header scrollBg={false} />

      <main className="max-w-[1180px] mx-auto px-4 md:px-6 lg:px-8 pt-[120px] pb-12 text-[17px] leading-relaxed">
        {/* Title Section */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-[#1b1c1f] mb-2">
            면접 스터디 모집
          </h1>
          <p className="text-[#4b4e57] text-lg">
            회원님에게 맞는 면접 스터디를 찾아보세요!
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex justify-end">
          <Button
            onClick={() => navigate("/study/create")}
            className="bg-[#2b7fff] hover:bg-blue-600 text-white font-semibold text-lg rounded-lg px-6 py-6 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            스터디 생성하기
          </Button>
        </div>

        {/* Urgent Recruitment Section */}
        {urgentRooms.length > 0 && (
          <Card className="p-8 mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#1b1c1f] mb-2 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-[#2b7fff]" />
                긴급 모집 중인 스터디
              </h2>
              <p className="text-[#4b4e57] text-lg">
                마감이 임박한 스터디를 놓치지 마세요!
              </p>
            </div>

            <div className="relative">
              <Button
                onClick={handlePrev}
                variant="ghost"
                size="icon"
                className="absolute -left-6 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-md hover:bg-gray-100 border border-gray-200"
                disabled={carouselIndex === 0}
              >
                <ChevronLeft className="w-6 h-6 text-[#2b7fff]" />
              </Button>
              <Button
                onClick={handleNext}
                variant="ghost"
                size="icon"
                className="absolute -right-6 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-md hover:bg-gray-100 border border-gray-200"
                disabled={carouselIndex + 3 >= urgentRooms.length}
              >
                <ChevronRight className="w-6 h-6 text-[#2b7fff]" />
              </Button>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 px-6">
                {carouselRooms.map((room) => (
                  <StudyCard key={room.id} {...room} isCarousel={true} />
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* All Study Rooms Section */}
        <Card className="p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1b1c1f] mb-2 flex items-center gap-2">
              <Users className="w-6 h-6 text-[#2b7fff]" />
              전체 스터디 목록
            </h2>
            <p className="text-[#4b4e57] text-lg">
              다양한 면접 스터디를 둘러보고 참여해보세요!
            </p>
          </div>

          {/* Sorting Tabs */}
          <div className="flex space-x-8 mb-8">
            <button
              onClick={() => {
                setActiveTab("deadline");
                setVisibleCount(6);
              }}
              className={`flex items-center gap-2 text-xl font-semibold pb-3 border-b-2 transition-colors ${
                activeTab === "deadline"
                  ? "text-[#2b7fff] border-[#2b7fff]"
                  : "text-[#6f727c] border-transparent hover:text-[#2b7fff] hover:border-[#2b7fff]"
              }`}
            >
              <Clock className="w-5 h-5" />
              마감순
            </button>
            <button
              onClick={() => {
                setActiveTab("recent");
                setVisibleCount(6);
              }}
              className={`flex items-center gap-2 text-xl font-semibold pb-3 border-b-2 transition-colors ${
                activeTab === "recent"
                  ? "text-[#2b7fff] border-[#2b7fff]"
                  : "text-[#6f727c] border-transparent hover:text-[#2b7fff] hover:border-[#2b7fff]"
              }`}
            >
              <Calendar className="w-5 h-5" />
              최신순
            </button>
          </div>

          {/* Study Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-[16px]">
            {visibleRooms.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-[#6f727c] text-lg">
                    해당 조건의 면접 스터디가 없습니다.
                  </p>
                  <p className="text-[#4b4e57] text-base">
                    새로운 스터디를 만들어보세요!
                  </p>
                </div>
              </div>
            ) : (
              visibleRooms.map((room) => <StudyCard key={room.id} {...room} />)
            )}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-10 flex justify-center">
              <Button
                onClick={() => setVisibleCount((prev) => prev + 6)}
                className="bg-[#2b7fff] hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold flex items-center gap-2"
              >
                <TrendingUp className="w-5 h-5" />
                더보기
              </Button>
            </div>
          )}
        </Card>

        {/* Scroll to Top */}
        <div className="fixed bottom-8 right-8">
          <Button
            size="icon"
            className="bg-white hover:bg-gray-50 text-[#6f727c] rounded-full shadow-lg border border-gray-200 transition-all duration-200 hover:shadow-xl"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ArrowUp className="w-5 h-5" />
          </Button>
        </div>
      </main>
    </div>
  );
}

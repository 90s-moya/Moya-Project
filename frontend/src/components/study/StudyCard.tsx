// src/components/study/StudyCard.tsx
import { useNavigate } from "react-router-dom";
import type { StudyRoom } from "@/types/study";
import { formatDateTime } from "@/util/date";

export default function StudyCard({
  categoryName,
  expiredAt,
  id,
  maxUser,
  openAt,
  title,
  joinUser,
  isCarousel = false,
}: StudyRoom & { isCarousel?: boolean }) {
  const navigate = useNavigate();

  // 스터디 상태 확인
  const now = new Date();
  const openAtDate = new Date(openAt);
  const isStarted = openAtDate <= now;
  const isFull = joinUser >= maxUser;
  const isExpired = expiredAt ? new Date(expiredAt) < now : false;

  // 회색 처리 조건: 시작했거나 인원이 다 찬 경우
  const shouldGrayOut = isStarted || isFull;

  // 부각 처리 조건: 시작 전이고 인원이 다 안 찬 경우
  const shouldHighlight = !isStarted && !isFull;

  return (
    <div
      onClick={() => navigate(`/study/detail/${id}`)}
      className={`group rounded-lg p-6 h-full flex flex-col justify-between min-h-[260px] text-base cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${
        shouldGrayOut
          ? "bg-[#f5f5f5] border border-[#e0e0e0] opacity-50"
          : shouldHighlight
          ? "bg-gradient-to-br border-2 border-[#2B7FFF] shadow-md"
          : "bg-[#fafafc] border border-[#dedee4]"
      }`}
    >
      <div>
        <div className="min-h-[5.5rem] mb-4">
          <h3
            className={`font-semibold text-xl leading-snug transition-colors duration-200 ${
              shouldHighlight
                ? "text-[#1b1c1f] group-hover:text-[#1E6FE8]"
                : "text-[#1b1c1f] group-hover:text-[#2b7fff]"
            }`}
          >
            {title}
          </h3>
        </div>

        <div className="space-y-2 min-h-[4.5rem]">
          <div className="flex justify-between text-base">
            <span className="text-[#6f727c]">참여 중인 인원 수</span>
            <span
              className={`font-medium ${
                isCarousel
                  ? "text-red-500"
                  : isFull
                  ? "text-red-500"
                  : "text-[#1b1c1f]"
              }`}
            >
              {joinUser}/{maxUser}
            </span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-[#6f727c]">카테고리명</span>
            <span className="text-[#1b1c1f] font-medium">{categoryName}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-[#6f727c]">시작일시</span>
            <span className="text-[#1b1c1f] font-medium">
              {formatDateTime(openAt)}
            </span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-[#6f727c]">종료일시</span>
            <span
              className={`font-medium ${
                isExpired ? "text-red-500" : "text-[#1b1c1f]"
              }`}
            >
              {formatDateTime(expiredAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

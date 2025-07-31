// src/components/study/StudyCard.tsx
import { useNavigate } from "react-router-dom";
import type { StudyRoom } from "@/types/study";

export default function StudyCard({
  id,
  title,
  participants,
  leader,
  date,
}: StudyRoom) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/study/detail/${id}`)}
      className="group bg-[#fafafc] border border-[#dedee4] rounded-lg p-6 h-full flex flex-col justify-between min-h-[260px] text-[18px] cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
    >
      <div>
        <div className="min-h-[5.5rem] mb-4">
          <h3 className="font-semibold text-2xl leading-snug text-[#1b1c1f] group-hover:text-[#2b7fff] transition-colors duration-200">
            {title}
          </h3>
        </div>
        <div className="min-h-[3rem]">
          <p className="text-[#6f727c] text-base mb-2">
            참여인원 {participants}
          </p>
        </div>
        <div className="space-y-2 min-h-[4.5rem]">
          <div className="flex justify-between text-base">
            <span className="text-[#6f727c]">방장</span>
            <span className="text-[#1b1c1f] font-medium">{leader}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-[#6f727c]">일시</span>
            <span className="text-[#1b1c1f] font-medium">{date}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

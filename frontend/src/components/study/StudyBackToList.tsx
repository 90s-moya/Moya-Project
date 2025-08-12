import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";

export default function StudyBackToList() {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <Button
        variant="ghost"
        className="text-[#2b7fff] hover:text-blue-600 font-semibold text-lg flex items-center gap-2 transition-colors px-0"
        onClick={() => navigate("/study")}
      >
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="leading-none">스터디 목록으로 돌아가기</span>
      </Button>
    </div>
  );
}

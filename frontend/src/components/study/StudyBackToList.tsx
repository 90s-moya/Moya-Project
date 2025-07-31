import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";

export default function StudyBackToList() {
  const navigate = useNavigate();

  return (
    <div className="mt-10 text-right">
      <Button
        variant="ghost"
        className="text-[#6f727c] hover:text-[#1b1c1f] underline text-lg"
        onClick={() => navigate("/study")}
      >
        ← 스터디 목록으로 돌아가기
      </Button>
    </div>
  );
}

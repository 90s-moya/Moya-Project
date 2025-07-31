import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Header from "@/components/common/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import StudyBackToList from "@/components/study/StudyBackToList";

type StudyFormData = {
  title: string;
  leader: string;
  category: string;
  date: string;
  participants: number;
  description: string;
};

export default function StudyCreatePage() {
  const { register, handleSubmit, formState } = useForm<StudyFormData>();
  const navigate = useNavigate();

  const onSubmit = (data: StudyFormData) => {
    console.log("스터디 생성 데이터:", data);
    alert("스터디가 생성되었습니다!");
    // 실제로는 POST API 요청 후 -> navigate(`/study/${newId}`)
    navigate("/study");
  };

  return (
    <div className="min-h-screen bg-white">
      <Header scrollBg={false} />

      <main className="max-w-[720px] mx-auto px-4 pt-[120px] pb-20 text-[17px] leading-relaxed">
        {/* Title */}
        <h1 className="text-4xl font-bold text-[#1b1c1f] mb-10">
          스터디 방 생성하기
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          {/* 제목 */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-3xl font-semibold">
              스터디 제목
            </Label>
            <Input
              id="title"
              {...register("title", { required: true })}
              placeholder="예: SK 보안 솔루션 운영자 면접 스터디"
              className="text-xl px-7 py-7 placeholder:text-lg"
            />
          </div>

          {/* 방장명 */}
          <div className="space-y-2">
            <Label htmlFor="leader" className="text-3xl font-semibold">
              방장명
            </Label>
            <Input
              id="leader"
              {...register("leader", { required: true })}
              placeholder="이름을 입력하세요"
              className="text-xl px-7 py-7 placeholder:text-lg"
            />
          </div>

          {/* 카테고리 */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-3xl font-semibold">
              대분류
            </Label>
            <select
              id="category"
              {...register("category", { required: true })}
              className="w-full border border-[#dedee4] rounded-lg px-7 py-7 text-"
            >
              <option value="">카테고리를 선택하세요</option>
              <option value="IT">IT</option>
              <option value="금융">금융</option>
              <option value="제조">제조</option>
              <option value="의료">의료</option>
              <option value="기타">기타</option>
            </select>
          </div>

          {/* 일시 */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-3xl font-semibold">
              스터디 일시
            </Label>
            <Input
              id="date"
              type="datetime-local"
              {...register("date", { required: true })}
              className="text-xl px-7 py-7 placeholder:text-lg"
            />
          </div>

          {/* 참여 인원 */}
          <div className="space-y-2">
            <Label htmlFor="participants" className="text-3xl font-semibold">
              참여 인원
            </Label>
            <Input
              id="participants"
              type="number"
              min={2}
              max={20}
              {...register("participants", { required: true })}
              placeholder="예: 6"
              className="text-xl px-7 py-7 placeholder:text-lg"
            />
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-3xl font-semibold">
              상세 설명
            </Label>
            <Textarea
              id="description"
              rows={6}
              {...register("description", { required: true })}
              placeholder="스터디 목적, 방식, 주의사항 등을 입력하세요."
              className="text-xl px-7 py-7 placeholder:text-lg"
            />
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-between items-center pt-4">
            <StudyBackToList />
            <Button
              type="submit"
              className="bg-[#2b7fff] hover:bg-blue-600 text-white px-8 py-7 rounded-lg text-lg"
              disabled={formState.isSubmitting}
            >
              스터디 생성하기
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

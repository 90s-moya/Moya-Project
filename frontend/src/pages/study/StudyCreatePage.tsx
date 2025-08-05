import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Header from "@/components/common/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import StudyBackToList from "@/components/study/StudyBackToList";
import axios from "axios";

type CreateFormData = {
  categoryId: string;
  title: string;
  body: string;
  maxUser: number;
  openAt: string;
  expiredAt: string;
};

export default function StudyCreatePage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormData>();
  const navigate = useNavigate();

  // 방 생성 API 요청 함수
  const onSubmit = async (formData: CreateFormData) => {
    // 로컬 스토리지로부터 토큰 받아오기
    const authStorage = localStorage.getItem("auth-storage");
    let token = "";

    // 파싱해서 token만 가져오기
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      token = parsed.state.token;
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/v1/room`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("방 생성 API 요청에 대한 응답 : ", res);
      alert("스터디가 생성되었습니다!");
    } catch (err) {
      console.error("스터디 생성 실패", err);
      alert("스터디가 생성 실패...");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header scrollBg={false} />

      <main className="max-w-[720px] mx-auto px-4 pt-[120px] pb-20 text-[17px] leading-relaxed">
        {/* Title */}
        <h1 className="text-4xl font-bold text-blue-500 mb-10">
          스터디 방 생성하기
        </h1>

        {/* form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          {/* 카테고리 */}
          <div className="space-y-2">
            <Label className="text-3xl font-semibold">카테고리명</Label>
            <select
              {...register("categoryId", {
                required: "카테고리명은 필수입니다.",
              })}
              className="w-full border border-[#dedee4] rounded-lg px-7 py-7 text-"
            >
              <option value="">카테고리 선택</option>
              <option value="IT">IT</option>
              <option value="금융">금융</option>
              <option value="제조">제조</option>
              <option value="의료">의료</option>
              <option value="기타">기타</option>
            </select>
            {errors.categoryId && (
              <p className="text-red-500">{errors.categoryId.message}</p>
            )}
          </div>
          {/* title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-3xl font-semibold">
              스터디 제목
            </Label>
            <Input
              id="title"
              {...register("title", { required: "제목은 필수입니다" })}
              placeholder="스터디방의 제목을 입력해주세요"
              className="text-xl px-7 py-7 placeholder:text-lg"
            />
            {errors.title && (
              <p className="text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="body" className="text-3xl font-semibold">
              설명
            </Label>
            <Input
              id="body"
              {...register("body")}
              placeholder="스터디방에 대한 설명을 입력해주세요"
              className="text-xl px-7 py-7 placeholder:text-lg"
            />
            {errors.body && (
              <p className="text-red-500">{errors.body.message}</p>
            )}
          </div>

          {/* 일시 */}
          <div className="space-y-2">
            <Label htmlFor="openAt" className="text-3xl font-semibold">
              방 생성 일시
            </Label>
            <Input
              id="openAt"
              type="datetime-local"
              {...register("openAt", { required: true })}
              className="text-xl px-7 py-7 placeholder:text-lg"
            />
          </div>

          {/* 참여 인원 */}
          <div className="space-y-2">
            <Label htmlFor="maxUser" className="text-3xl font-semibold">
              참여 인원
            </Label>
            <Input
              id="maxUser"
              type="number"
              min={2}
              max={20}
              {...register("maxUser", { required: true })}
              placeholder="예: 6"
              className="text-xl px-7 py-7 placeholder:text-lg"
            />
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-between items-center pt-4">
            <StudyBackToList />
            <Button
              type="submit"
              className="bg-[#2b7fff] hover:bg-blue-600 text-white px-8 py-7 rounded-lg text-lg"
              // disabled={formState.isSubmitting}
            >
              스터디 생성하기
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Header from "@/components/common/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import StudyBackToList from "@/components/study/StudyBackToList";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import type { CreateFormData, Category } from "@/types/study";
import { createRoom, getCategory } from "@/api/studyApi";

export default function StudyCreatePage() {
  // 폼 관련 변수 및 함수들
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormData>();

  //
  const [category, setCategory] = useState<Category[]>([]);

  const navigate = useNavigate();

  // 마운트 시 카테고리 API 요청
  useEffect(() => {
    const requestCategory = async () => {
      try {
        const data = await getCategory();
        console.log("카테고리 조회 결과 : ", data);
        setCategory(data);
      } catch (err) {
        console.error("카테고리 조회 에러 발생 : ", err);
      }
    };

    requestCategory();
  }, []);

  // 폼 데이터 제출 함수
  const onSubmit = async (formData: CreateFormData) => {
    // 스터디 생성 일시 생성
    const open_at = dayjs().add(9, "hour").toISOString();

    // 사용자가 입력한 formData에 openAt 추가
    const fullData: CreateFormData = {
      ...formData,
      open_at,
    };

    console.log("요청 시 사용되는 formData는 다음과 같습니다.", fullData);

    try {
      const data = await createRoom(fullData);

      console.log("방 생성 API 요청에 대한 응답 : ", data);
      navigate("/study");
    } catch (err) {
      console.error("스터디 생성 실패", err);
      alert("스터디가 생성 실패...");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header scrollBg={false} />

      <main className="max-w-[720px] mx-auto px-4 pt-[120px] pb-20 text-[17px] leading-relaxed">
        {/* Back to List */}
        <StudyBackToList />

        {/* Title */}
        <h1 className="text-4xl font-bold text-[#1b1c1f] mb-10">
          스터디 방 생성하기
        </h1>

        {/* form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          {/* 카테고리 */}
          <div className="space-y-3">
            <Label className="text-2xl font-bold text-[#1b1c1f]">
              카테고리명
            </Label>
            <select
              {...register("category_id", {
                required: "카테고리명은 필수입니다.",
              })}
              className="w-full border border-[#dedee4] rounded-lg px-6 py-5 text-lg focus:border-[#2b7fff] focus:outline-none transition-colors"
            >
              <option value="">카테고리 선택</option>
              {category.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.categoryName}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <p className="text-red-500">{errors.category_id.message}</p>
            )}
          </div>
          {/* title */}
          <div className="space-y-3">
            <Label
              htmlFor="title"
              className="text-2xl font-bold text-[#1b1c1f]"
            >
              스터디 제목
            </Label>
            <Input
              id="title"
              {...register("title", { required: "제목은 필수입니다" })}
              placeholder="스터디방의 제목을 입력해주세요"
              className="text-lg px-6 py-5 placeholder:text-[#6f727c] focus:outline-none transition-colors border-[#dedee4] focus:ring-0 custom-focus"
            />
            {errors.title && (
              <p className="text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* 설명 */}
          <div className="space-y-3">
            <Label htmlFor="body" className="text-2xl font-bold text-[#1b1c1f]">
              설명
            </Label>
            <Textarea
              id="body"
              {...register("body")}
              placeholder="스터디방에 대한 설명을 입력해주세요"
              className="text-lg px-6 py-5 placeholder:text-[#6f727c] focus:outline-none transition-colors min-h-[120px] border-[#dedee4] focus:ring-0 custom-focus"
            />
            {errors.body && (
              <p className="text-red-500">{errors.body.message}</p>
            )}
          </div>

          {/* 스터디 마감 일시 */}
          <div className="space-y-3">
            <Label
              htmlFor="expiredAt"
              className="text-2xl font-bold text-[#1b1c1f]"
            >
              스터디 마감 일시
            </Label>
            <div className="relative group">
              <Input
                id="expiredAt"
                type="datetime-local"
                {...register("expired_at", {
                  required: true,
                  setValueAs: (v) =>
                    dayjs(v).isValid()
                      ? dayjs(v).add(9, "hour").toISOString()
                      : "",
                })}
                className="text-lg px-6 py-5 focus:outline-none transition-all duration-200 cursor-pointer border-[#dedee4] focus:ring-0 custom-focus group-hover:border-[#2b7fff]/50"
                style={{
                  fontSize: "16px", // 모바일에서 줌 방지
                  minHeight: "60px",
                }}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none">
                <svg
                  className="w-6 h-6 text-[#6f727c] group-hover:text-[#2b7fff] transition-colors duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="absolute -bottom-8 left-0 text-sm text-[#6f727c]">
                최소 1시간 후부터 설정 가능합니다
              </div>
            </div>
            {errors.expired_at && (
              <p className="text-red-500">{errors.expired_at.message}</p>
            )}
          </div>

          {/* 최대 참여 인원 수 */}
          <div className="space-y-3">
            <Label
              htmlFor="maxUser"
              className="text-2xl font-bold text-[#1b1c1f]"
            >
              최대 참여 인원 수
            </Label>
            <Input
              id="maxUser"
              type="number"
              min={2}
              max={6}
              {...register("max_user", {
                required: "최대 참여 인원 수를 입력해주세요",
                valueAsNumber: true,
              })}
              placeholder="2~6명 사이의 숫자를 입력해주세요"
              className="text-lg px-6 py-5 placeholder:text-[#6f727c] focus:outline-none transition-colors border-[#dedee4] focus:ring-0 custom-focus"
            />
            {errors.max_user && (
              <p className="text-red-500">{errors.max_user.message}</p>
            )}
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end items-center pt-4">
            <Button
              type="submit"
              className="bg-[#2b7fff] hover:bg-blue-600 text-white px-8 py-7 rounded-lg text-lg"
              disabled={isSubmitting}
            >
              스터디 생성하기
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

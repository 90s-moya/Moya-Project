import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Header from "@/components/common/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import StudyBackToList from "@/components/study/StudyBackToList";
import axios from "axios";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { getTokenFromLocalStorage } from "../../util/getToken";

type CreateFormData = {
  category_id: string;
  title: string;
  body: string;
  max_user: number;
  open_at: string;
  expired_at: string;
};

type Category = {
  categoryId: string;
  categoryName: string;
};

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

  // 카테고리 API 요청 함수
  useEffect(() => {
    const requestCategory = async () => {
      const token = getTokenFromLocalStorage();

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/v1/category`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        // console.log(
        //   "카테고리 API 호출에 대한 응답은 다음과 같습니다.",
        //   res.data
        // );
        setCategory(res.data);
      } catch (err) {
        console.error("카테고리 API 호출 실패", err);
      }
    };

    requestCategory();
  }, []);

  // 방 생성 API 요청 함수
  const onSubmit = async (formData: CreateFormData) => {
    const token = getTokenFromLocalStorage();

    // 스터디 생성 일시
    const open_at = dayjs().add(9, "hour").toISOString();

    // 사용자가 입력한 formData에 openAt 추가
    const fullData: CreateFormData = {
      ...formData,
      open_at,
    };

    console.log("요청 시 사용되는 formData는 다음과 같습니다.", fullData);

    try {
      console.log(token);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/v1/room`,
        fullData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // console.log("방 생성 API 요청에 대한 응답 : ", res);
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
              {...register("category_id", {
                required: "카테고리명은 필수입니다.",
              })}
              className="w-full border border-[#dedee4] rounded-lg px-7 py-7 text-"
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
            <Textarea
              id="body"
              {...register("body")}
              placeholder="스터디방에 대한 설명을 입력해주세요"
              className="text-xl px-7 py-7 placeholder:text-lg"
            />
            {errors.body && (
              <p className="text-red-500">{errors.body.message}</p>
            )}
          </div>

          {/* 스터디 마감 일시 */}
          <div className="space-y-2">
            <Label htmlFor="expiredAt" className="text-3xl font-semibold">
              스터디 마감 일시
            </Label>
            <Input
              id="expiredAt"
              type="datetime-local"
              {...register("expired_at", {
                required: true,
                setValueAs: (v) =>
                  dayjs(v).isValid()
                    ? dayjs(v).format("YYYY-MM-DDTHH:mm:ss")
                    : "",
              })}
              className="text-xl px-7 py-7 placeholder:text-lg"
            />
            {errors.expired_at && (
              <p className="text-red-500">{errors.expired_at.message}</p>
            )}
          </div>

          {/* 최대 참여 인원 수 */}
          <div className="space-y-2">
            <Label htmlFor="maxUser" className="text-3xl font-semibold">
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
              placeholder="숫자만 입력해주세요"
              className="text-xl px-7 py-7 placeholder:text-lg"
            />
            {errors.max_user && (
              <p className="text-red-500">{errors.max_user.message}</p>
            )}
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-between items-center pt-4">
            <StudyBackToList />
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

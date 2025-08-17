// React 관련
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

// UI 컴포넌트
import Header from "@/components/common/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import StudyBackToList from "@/components/study/StudyBackToList";

// 날짜 처리
import dayjs from "dayjs";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// 타입 및 API
import type { CreateFormData, Category } from "@/types/study";
import { createRoom, getCategory } from "@/api/studyApi";

// 아이콘
import { Info, Calendar, Users, FileText, Tag } from "lucide-react";

export default function StudyCreatePage() {
  // React Hook Form
  const {
    register, // 폼 필드 등록
    handleSubmit, // 폼 제출 처리
    formState: { errors, isSubmitting }, // 폼 상태
    setValue, // 폼 값 설정
    watch, // 폼 값 감시
  } = useForm<CreateFormData>();

  // 로컬 상태
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null); // 시작 시간용
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null); // 종료 시간용
  const [category, setCategory] = useState<Category[]>([]); // 카테고리 목록
  const navigate = useNavigate(); // 페이지 이동
  const watchedValues = watch(); // 실시간 폼 값 감시

  // 컴포넌트 마운트 시 카테고리 API 호출
  useEffect(() => {
    const requestCategory = async () => {
      try {
        const data = await getCategory();
        // console.log("카테고리 조회 결과 : ", data);
        setCategory(data);
      } catch (err) {
        console.error("카테고리 조회 에러 발생 : ", err);
      }
    };

    requestCategory();
  }, []);

  // 시작 시간 선택 핸들러
  const handleStartDateChange = (date: Date | null) => {
    setSelectedStartDate(date);
    if (date) {
      // dayjs를 사용하여 9시간을 더하고 ISO 문자열로 변환
      const isoString = dayjs(date).add(9, "hour").toISOString();
      setValue("open_at", isoString);
    } else {
      setValue("open_at", "");
    }
  };

  // 종료 시간 선택 핸들러
  const handleEndDateChange = (date: Date | null) => {
    if(selectedStartDate == null){
      alert("시작 일시 먼저 선택해주세요.");
      return;
    }
    if(!date){
      alert("날짜를 선택해주세요.");
      return;
    }
    if(selectedStartDate> date){
      alert("종료시간은 시작 시간보다 늦어야 합니다.");
      return;
    }
    setSelectedEndDate(date);
    if (date) {
      // dayjs를 사용하여 9시간을 더하고 ISO 문자열로 변환
      const isoString = dayjs(date).add(9, "hour").toISOString();
      setValue("expired_at", isoString);
    } else {
      setValue("expired_at", "");
    }
  };

  // 폼 데이터 제출 함수
  const onSubmit = async (formData: CreateFormData) => {
    // console.log("요청 시 사용되는 formData는 다음과 같습니다.", formData);

    try {
      await createRoom(formData);

      // console.log("방 생성 API 요청에 대한 응답 : ", data);
      navigate("/mypage/studyRoom");
    } catch (err) {
      console.error("스터디 생성 실패", err);
      alert("스터디가 생성 실패...");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header scrollBg={false} />

      <main className="max-w-[1180px] mx-auto px-4 md:px-6 lg:px-8 pt-[120px] pb-12 text-base leading-relaxed">
        {/* Back to List */}
        <StudyBackToList />

        {/* Title Section */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-[#2B7FFF] mb-2">
            스터디 방 생성하기
          </h1>
          <p className="text-[#4b4e57] text-base">
            새로운 면접 스터디를 만들어보세요!
          </p>
        </div>

        {/* 2단 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 좌측: 폼 영역 */}
          <div className="lg:col-span-2">
            <Card className="p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* 스터디 제목 */}
                <div className="space-y-3">
                  <Label
                    htmlFor="title"
                    className="text-xl font-semibold text-[#1b1c1f] flex items-center gap-2"
                  >
                    <FileText className="w-5 h-5 text-[#2b7fff]" />
                    스터디 제목
                  </Label>
                  <Input
                    id="title"
                    {...register("title", { required: "제목은 필수입니다" })}
                    placeholder="스터디 제목을 입력해주세요"
                    className="text-base px-6 py-5 placeholder:text-[#6f727c] focus:outline-none transition-colors border-[#dedee4] focus:ring-0 custom-focus"
                  />
                  {errors.title && (
                    <p className="text-red-500 text-sm">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                {/* 설명 */}
                <div className="space-y-3">
                  <Label
                    htmlFor="body"
                    className="text-xl font-semibold text-[#1b1c1f] flex items-center gap-2"
                  >
                    <FileText className="w-5 h-5 text-[#2b7fff]" />
                    스터디 설명
                  </Label>
                  <Textarea
                    id="body"
                    {...register("body")}
                    placeholder="스터디에 대한 설명을 입력해주세요"
                    className="text-base px-6 py-5 placeholder:text-[#6f727c] focus:outline-none transition-colors min-h-[120px] border-[#dedee4] focus:ring-0 custom-focus"
                  />
                  {errors.body && (
                    <p className="text-red-500 text-sm">
                      {errors.body.message}
                    </p>
                  )}
                </div>

                {/* 카테고리 */}
                <div className="space-y-3">
                  <Label className="text-xl font-semibold text-[#1b1c1f] flex items-center gap-2">
                    <Tag className="w-5 h-5 text-[#2b7fff]" />
                    카테고리
                  </Label>
                  <select
                    {...register("category_id", {
                      required: "카테고리명은 필수입니다.",
                    })}
                    className="w-full border border-[#dedee4] rounded-lg px-6 py-5 text-base focus:border-[#2b7fff] focus:outline-none transition-colors"
                  >
                    <option value="">카테고리를 선택해주세요</option>
                    {category.map((c) => (
                      <option key={c.categoryId} value={c.categoryId}>
                        {c.categoryName}
                      </option>
                    ))}
                  </select>
                  {errors.category_id && (
                    <p className="text-red-500 text-sm">
                      {errors.category_id.message}
                    </p>
                  )}
                </div>

                {/* 스터디 시작 일시 */}
                <div className="space-y-3">
                  <Label
                    htmlFor="openAt"
                    className="text-xl font-semibold text-[#1b1c1f] flex items-center gap-2"
                  >
                    <Calendar className="w-5 h-5 text-[#2b7fff]" />
                    스터디 시작 일시
                  </Label>
                  <div className="relative group">
                    <DatePicker
                      selected={selectedStartDate}
                      onChange={handleStartDateChange}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="yyyy년 MM월 dd일 HH:mm"
                      placeholderText="시작 날짜와 시간을 선택해주세요"
                      minDate={dayjs().add(1, "hour").toDate()}
                      className="w-full border border-[#dedee4] rounded-lg px-6 py-5 text-base focus:border-[#2b7fff] focus:outline-none transition-colors cursor-pointer"
                      wrapperClassName="w-full"
                      popperClassName="z-50"
                      popperPlacement="bottom-start"
                      customInput={
                        <Input
                          {...register("open_at", {
                            required: "시작 일시는 필수입니다",
                          })}
                          className="text-base px-6 py-5 focus:outline-none transition-all duration-200 cursor-pointer border-[#dedee4] focus:ring-0 custom-focus group-hover:border-[#2b7fff]/50"
                          style={{
                            fontSize: "16px", // 모바일에서 줌 방지
                            minHeight: "60px",
                          }}
                        />
                      }
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
                  </div>
                  {errors.open_at && (
                    <p className="text-red-500 text-sm">
                      {errors.open_at.message}
                    </p>
                  )}
                </div>

                {/* 스터디 종료 일시 */}
                <div className="space-y-3">
                  <Label
                    htmlFor="expiredAt"
                    className="text-xl font-semibold text-[#1b1c1f] flex items-center gap-2"
                  >
                    <Calendar className="w-5 h-5 text-[#2b7fff]" />
                    스터디 종료 일시
                  </Label>
                  <div className="relative group">
                    <DatePicker
                      selected={selectedEndDate}
                      onChange={handleEndDateChange}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="yyyy년 MM월 dd일 HH:mm"
                      placeholderText="종료 날짜와 시간을 선택해주세요"
                      minDate={
                        selectedStartDate || dayjs().add(1, "hour").toDate()
                      }
                      className="w-full border border-[#dedee4] rounded-lg px-6 py-5 text-base focus:border-[#2b7fff] focus:outline-none transition-colors cursor-pointer"
                      wrapperClassName="w-full"
                      popperClassName="z-50"
                      popperPlacement="bottom-start"
                      customInput={
                        <Input
                          {...register("expired_at", {
                            required: "종료 일시는 필수입니다",
                          })}
                          className="text-base px-6 py-5 focus:outline-none transition-all duration-200 cursor-pointer border-[#dedee4] focus:ring-0 custom-focus group-hover:border-[#2b7fff]/50"
                          style={{
                            fontSize: "16px", // 모바일에서 줌 방지
                            minHeight: "60px",
                          }}
                        />
                      }
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
                  </div>
                  {errors.expired_at && (
                    <p className="text-red-500 text-sm">
                      {errors.expired_at.message}
                    </p>
                  )}
                </div>

                {/* 최대 참여 인원 수 */}
                <div className="space-y-3">
                  <Label
                    htmlFor="maxUser"
                    className="text-xl font-semibold text-[#1b1c1f] flex items-center gap-2"
                  >
                    <Users className="w-5 h-5 text-[#2b7fff]" />
                    최대 참여 인원
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
                    className="text-base px-6 py-5 placeholder:text-[#6f727c] focus:outline-none transition-colors border-[#dedee4] focus:ring-0 custom-focus"
                  />
                  {errors.max_user && (
                    <p className="text-red-500 text-sm">
                      {errors.max_user.message}
                    </p>
                  )}
                </div>

                {/* 제출 버튼 */}
                <div className="flex justify-end items-center pt-6">
                  <Button
                    type="submit"
                    className="bg-[#2b7fff] hover:bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-semibold h-10"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "생성 중..." : "스터디 생성하기"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* 우측: 미리보기 및 안내 */}
          <div className="space-y-6">
            {/* 미리보기 카드 */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-[#1b1c1f] mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-[#2b7fff]" />
                스터디 미리보기
              </h3>
              <div className="space-y-4">
                {/* 제목 */}
                <div className="min-h-[5.5rem]">
                  <h3 className="font-semibold text-xl leading-snug text-[#1b1c1f]">
                    {watchedValues.title || "스터디 제목을 입력해주세요"}
                  </h3>
                </div>

                {/* 정보 목록 */}
                <div className="space-y-2 text-base">
                  <div className="flex justify-between">
                    <span className="text-[#6f727c]">참여 중인 인원 수</span>
                    <span className="font-medium text-[#1b1c1f]">
                      1/{watchedValues.max_user || "?"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6f727c]">카테고리명</span>
                    <span className="text-[#1b1c1f] font-medium">
                      {category.find(
                        (c) => c.categoryId === watchedValues.category_id
                      )?.categoryName || "선택 예정"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6f727c]">시작일시</span>
                    <span className="text-[#1b1c1f] font-medium">
                      {selectedStartDate
                        ? dayjs(selectedStartDate).format("MM/DD HH:mm")
                        : "설정 예정"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6f727c]">종료일시</span>
                    <span className="text-[#1b1c1f] font-medium">
                      {selectedEndDate
                        ? dayjs(selectedEndDate).format("MM/DD HH:mm")
                        : "설정 예정"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* 안내 카드 */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="text-base font-semibold text-[#1b1c1f] mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#2b7fff]" />
                스터디 생성 안내
              </h3>
              <ul className="space-y-2 text-sm text-[#4b4e57]">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-[#2b7fff] rounded-full mt-2 flex-shrink-0"></span>
                  <span>최대 참여 인원은 2~6명 사이로 설정해주세요</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-[#2b7fff] rounded-full mt-2 flex-shrink-0"></span>
                  <span>스터디 생성자는 자동으로 방장이 됩니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-[#2b7fff] rounded-full mt-2 flex-shrink-0"></span>
                  <span>스터디 진행 시 배려와 존중을 해주세요</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

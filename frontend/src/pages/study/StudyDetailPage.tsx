import { Button } from "@/components/ui/button";
import Header from "@/components/common/Header";
import StudyBackToList from "@/components/study/StudyBackToList";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { formatDateTime } from "@/util/date";

// 방장 정보 인터페이스
interface MasterInfo {
  nickname: string;
  makeRoomCnt: number;
  createdAt: string;
}

// 룸 상세 정보 인터페이스
interface StudyRoomDetail {
  body: string;
  categoryName: string;
  expiredAt: string;
  joinUsers: string[];
  masterInfo: MasterInfo;
  maxUser: number;
  openAt: string;
  title: string;
}

export default function StudyDetailPage() {
  const { id } = useParams();
  const [roomDetail, setRoomDetail] = useState<StudyRoomDetail>();

  const navigate = useNavigate();

  // 마운트 시 방 상세 API 요청 보내기
  useEffect(() => {
    // id가 undefined일 경우 return
    if (!id) {
      return;
    }

    requestRoomDetail(id);
  }, [id]);

  // API 요청 함수
  const requestRoomDetail = async (id: string) => {
    // 로컬 스토리지로부터 토큰 받아오기
    const authStorage = localStorage.getItem("auth-storage");
    let token = "";

    // 파싱해서 token만 가져오기
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      token = parsed.state.token;
    }

    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/v1/room/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("API를 통해 받은 룸 상세 정보 : ", res.data);
      setRoomDetail(res.data);
    } catch (err) {
      console.error("❌ 에러 발생", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[17px] leading-relaxed">
      {/* 헤더 */}
      <Header />
      {/* 메인 */}
      <main className="max-w-7xl mx-auto px-6 py-10 pt-[110px]">
        {/* 이름 */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center space-x-3">
            <h2 className="text-3xl font-bold text-[#1b1c1f]">방 제목 : {roomDetail?.title}</h2>
          </div>
          <Button onClick={() => navigate("/study/setup")} className="bg-[#2b7fff] hover:bg-[#2b7fff]/90 text-white px-6 py-5 rounded-lg text-lg font-semibold">
            참여하기
          </Button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column - Job Information */}
          <div className="lg:col-span-2 space-y-10">
            {/* Room Info */}
            <div>
              <h3 className="text-3xl font-semibold text-[#1b1c1f] mb-4">방 정보</h3>
              <div className="space-y-4 text-lg text-[#1b1c1f]">
                <div className="flex">
                  <span className="w-24 text-[#6f727c] font-semibold">카테고리명</span>
                  <span className="text-xl">{roomDetail?.categoryName}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-[#6f727c] font-semibold">참여 중인 인원</span>
                  <span className="text-xl">{roomDetail?.joinUsers.length}명</span>
                </div>
                <div className="flex items-start">
                  <span className="w-24 text-[#6f727c] text-lg font-semibold">참여자 정보</span>
                  <div className="space-y-1 text-xl">
                    {roomDetail?.joinUsers?.map((name, index) => {
                      return <div key={index}>{name}</div>;
                    })}
                  </div>
                </div>
                <div className="flex">
                  <span className="w-24 text-[#6f727c] text-lg font-semibold">생성 일시</span>
                  <span className="text-xl">{roomDetail?.openAt ? formatDateTime(roomDetail.openAt) : "일정 미정"}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-[#6f727c] text-lg font-semibold">마감 일시</span>
                  <span className="text-xl">{roomDetail?.expiredAt ? formatDateTime(roomDetail.expiredAt) : "일정 미정"}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-4xl font-semibold text-[#1b1c1f] mb-4">상세 설명</h3>
              <div className="space-y-6 text-[17px] text-[#404249]">
                <div>
                  <p className="font-semibold text-3xl mb-2">내용</p>
                  <p>{roomDetail?.body}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Company Info */}
          <div>
            <h3 className="text-2xl font-semibold text-[#1b1c1f] mb-4">방장 정보</h3>
            <div className="space-y-4 text-base">
              <div className="flex">
                <span className="w-28 text-[#6f727c] text-xl">방장명</span>
                <span className="text-[#1b1c1f] text-xl">{roomDetail?.masterInfo.nickname}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-[#6f727c] text-xl">방 생성 횟수</span>
                <span className="text-[#1b1c1f] text-xl">{roomDetail?.masterInfo.makeRoomCnt}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-[#6f727c] text-xl">회원 가입일</span>
                <span className="text-[#1b1c1f] text-xl">{roomDetail?.masterInfo.createdAt ? formatDateTime(roomDetail?.masterInfo.createdAt) : "가입일 불러오기 실패"}</span>
              </div>
            </div>
            <Button onClick={() => navigate("/study/setup")} className="w-full bg-[#2b7fff] hover:bg-[#3758f9] text-white py-7 text-lg rounded-lg mt-5">
              참여하기
            </Button>
            <StudyBackToList />
          </div>
        </div>
      </main>
    </div>
  );
}

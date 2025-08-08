import { Button } from "@/components/ui/button";
import Header from "@/components/common/Header";
import StudyBackToList from "@/components/study/StudyBackToList";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDateTime } from "@/util/date";
import { deleteRoom, getRoomDetail } from "@/api/studyApi";
import type { StudyRoomDetail } from "@/types/study";
import { useAuthStore } from "@/store/useAuthStore";

export default function StudyDetailPage() {
  const { id } = useParams();
  const [roomDetail, setRoomDetail] = useState<StudyRoomDetail>();
  const [isMine, setIsMine] = useState(false);

  const navigate = useNavigate();
  // 방 삭제 시 참고할 현재 사용자의 UUID
  const UUID = useAuthStore((state) => state.UUID);

  // 마운트 시 방 상세 API 요청 보내기
  useEffect(() => {
    // id가 undefined일 경우 return
    if (!id) {
      return;
    }

    const requestRoomDetail = async (id: string) => {
      try {
        const data = await getRoomDetail(id);
        console.log("방 상세 조회 결과 : ", data);

        setRoomDetail(data);
      } catch (err) {
        console.log("방 상세 조회 에러 발생 : ", err);
      }
    };

    requestRoomDetail(id);
  }, [id]);

  // 방 삭제하는 함수
  const handleDeleteRoom = async () => {
    if (!id) {
      return;
    }

    // 삭제하기 전의 확인 대화창
    const confirmed = window.confirm("정말 이 방을 삭제하시겠습니까?");

    if (!confirmed) return;

    try {
      const data = await deleteRoom(id);

      console.log("방 삭제 완료!", data);
      // 방 목록 페이지로 이동
      navigate(`/study`);
    } catch (err) {
      console.error("방 삭제 에러 발생", err);
      alert("방 삭제에 실패하였습니다.");
    }
  };

  // 방 상세 조회를 통해 받은 방장 ID와 현재 사용자의 ID가 같다면 삭제 버튼 활성화
  useEffect(() => {
    if (roomDetail?.masterInfo.masterId === UUID) {
      setIsMine(true);
    }
  }, [roomDetail, UUID]);

  return (
    <div className="min-h-screen bg-[#ffffff] text-[17px] leading-relaxed">
      {/* 헤더 */}
      <Header />
      {/* 메인 */}
      <main className="max-w-7xl mx-auto px-6 py-10 pt-[110px]">
        {/* 이름 */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center space-x-3">
            <h2 className="text-3xl font-bold text-[#1b1c1f]">
              방 제목 : {roomDetail?.title}
            </h2>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column - Job Information */}
          <div className="lg:col-span-2 space-y-10">
            {/* Room Info */}
            <div>
              <h3 className="text-3xl font-semibold text-[#1b1c1f] mb-4">
                방 정보
              </h3>
              <div className="space-y-4 text-lg text-[#1b1c1f]">
                <div className="flex">
                  <span className="w-24 text-[#6f727c] font-semibold">
                    카테고리명
                  </span>
                  <span className="text-xl">{roomDetail?.categoryName}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-[#6f727c] font-semibold">
                    참여 중인 인원
                  </span>
                  <span className="text-xl">
                    {roomDetail?.joinUsers.length}명
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="w-24 text-[#6f727c] text-lg font-semibold">
                    참여자 정보
                  </span>
                  <div className="space-y-1 text-xl">
                    {roomDetail?.joinUsers?.map((name, index) => {
                      return <div key={index}>{name}</div>;
                    })}
                  </div>
                </div>
                <div className="flex">
                  <span className="w-24 text-[#6f727c] text-lg font-semibold">
                    생성 일시
                  </span>
                  <span className="text-xl">
                    {roomDetail?.openAt
                      ? formatDateTime(roomDetail.openAt)
                      : "일정 미정"}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-24 text-[#6f727c] text-lg font-semibold">
                    마감 일시
                  </span>
                  <span className="text-xl">
                    {roomDetail?.expiredAt
                      ? formatDateTime(roomDetail.expiredAt)
                      : "일정 미정"}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              {/* <h3 className="text-4xl font-semibold text-[#1b1c1f] mb-4">상세 설명</h3> */}
              <div className="space-y-6 text-[17px] text-[#404249]">
                <div>
                  <h3 className="font-bold text-3xl mb-2">내용</h3>
                  <p>{roomDetail?.body}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Company Info */}
          <div>
            <h3 className="text-2xl font-semibold text-[#1b1c1f] mb-4">
              방장 정보
            </h3>
            <div className="space-y-4 text-base">
              <div className="flex">
                <span className="w-28 text-[#6f727c] text-xl">방장명</span>
                <span className="text-[#1b1c1f] text-xl">
                  {roomDetail?.masterInfo.nickname}
                </span>
              </div>
              <div className="flex">
                <span className="w-28 text-[#6f727c] text-xl">
                  방 생성 횟수
                </span>
                <span className="text-[#1b1c1f] text-xl">
                  {roomDetail?.masterInfo.makeRoomCnt}회
                </span>
              </div>
              <div className="flex">
                <span className="w-28 text-[#6f727c] text-xl">회원 가입일</span>
                <span className="text-[#1b1c1f] text-xl">
                  {roomDetail?.masterInfo.createdAt
                    ? formatDateTime(roomDetail?.masterInfo.createdAt)
                    : "가입일 불러오기 실패"}
                </span>
              </div>
            </div>
            <Button
              onClick={() => navigate(`/study/setup/${id}`)}
              className="w-full bg-[#2b7fff] hover:bg-[#3758f9] text-white py-7 text-lg rounded-lg mt-5"
            >
              참여하기
            </Button>
            <StudyBackToList />
            <div className="flex justify-end">
              <Button
                disabled={!isMine}
                onClick={handleDeleteRoom}
                className="w-30 bg-red-500 hover:bg-red-700 text-white py-7 text-lg rounded-lg mt-5"
              >
                방 삭제하기
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

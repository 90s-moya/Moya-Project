import React, { useEffect, useMemo, useState } from "react";
import MypageLayout from "@/layouts/MypageLayout";
import { getMyRegisteredRooms } from "@/api/studyApi";
import type { MyRegisteredRoom } from "@/types/study";
import { useNavigate } from "react-router-dom";
import { formatDateTime } from "@/util/date";

type SortOption = "deadline";

const StudyRoom: React.FC = () => {
  const [registeredRooms, setRegisteredRooms] = useState<MyRegisteredRoom[]>(
    []
  );
  const [sortOption, setSortOption] = useState<SortOption>("deadline");
  const navigate = useNavigate();

  // 등록한 방 목록 조회
  useEffect(() => {
    const fetchRegisteredRooms = async () => {
      try {
        const data = await getMyRegisteredRooms();
        setRegisteredRooms(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchRegisteredRooms();
  }, []);

  // 정렬된 방 목록
  const sortedRooms = useMemo(() => {
    const sorted = [...registeredRooms];

    // 마감순 (openAt 기준으로 현재 시간에 가장 가까운 순서)
    return sorted.sort((a, b) => {
      const now = new Date().getTime();
      const aTimeDiff = Math.abs(new Date(a.openAt).getTime() - now);
      const bTimeDiff = Math.abs(new Date(b.openAt).getTime() - now);
      return aTimeDiff - bTimeDiff;
    });
  }, [registeredRooms]);

  // 룸 상세 페이지로 이동 핸들러
  // const handleRoomClick = (roomId: string) => {
  //   navigate(`/study/detail/${roomId}`);
  // };

  // 참여하기 버튼 클릭 핸들러 (이벤트 전파 방지)
  const handleJoinRoom = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    navigate(`/study/setup/${roomId}`);
  };

  // 정렬 옵션 변경 핸들러
  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(event.target.value as SortOption);
  };

  return (
    <MypageLayout activeMenu="studyroom">
      {/* 페이지 제목 */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-semibold text-[#2B7FFF] leading-[1.4]">
          등록한 스터디 목록
        </h3>
      </div>

      {/* 참여한 스터디 리스트 */}
      {registeredRooms.length === 0 ? (
        <div className="w-full max-w-[880px] h-[360px] bg-[#FAFAFC] border border-[#EFEFF3] rounded-[10px] flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            {/* 아이콘 */}
            <div className="w-9 h-9 bg-white flex items-center justify-center">
              <svg
                width="27"
                height="27"
                viewBox="0 0 27 27"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.375 6.75H23.625M3.375 13.5H23.625M3.375 20.25H23.625M8.4375 6.75V20.25M18.5625 6.75V20.25"
                  stroke="#989AA2"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            {/* 메시지 텍스트 */}
            <p className="text-center text-[#6F727C] font-semibold text-base leading-[1.875] mb-3">
              등록한 스터디 방이 없어요.
              <br />
              면접 스터디를 생성하거나 등록하고 참여해보세요!
            </p>
            {/* 면접 스터디 하러가기 버튼 */}
            <button
              onClick={() => navigate("/study")}
              className="bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white px-4 py-2 rounded-[10px] text-sm font-semibold leading-[1.714] transition-colors h-10"
            >
              면접 스터디 목록으로 가기
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 w-full">
          {sortedRooms.map((room) => (
            <div
              key={room.id}
              // onClick={() => handleRoomClick(room.id)}
              className="relative bg-[#fafafc] border border-[#dedee4] rounded-lg p-6 h-full flex flex-col justify-between min-h-[120px] text-[18px] transition-all hover:shadow-lg hover:-translate-y-1 w-full cursor-pointer"
            >
              <div>
                <div className="mb-2">
                  <h3 className="font-semibold text-2xl leading-snug text-[#1b1c1f] group-hover:text-[#2b7fff] transition-colors duration-200">
                    {room.title}
                  </h3>
                </div>
                <p className="text-[#6F727C] text-lg leading-[1.5] mb-4">
                  {room.body}
                </p>
              </div>

              <div className="flex items-center justify-between">
                {/* 카테고리 태그 (왼쪽) */}
                <span className="text-base px-3 py-1 bg-[#e3f0ff] text-[#2B7FFF] rounded-xl font-medium">
                  {room.categoryName}
                </span>
                <span className="text-base px-3 py-1 bg-[#e3f0ff] text-[#2B7FFF] rounded-xl font-medium">
                  {room.joinUser}/{room.maxUser}명
                </span>
                <span className="text-base px-3 py-1 bg-[#e3f0ff] text-[#2B7FFF] rounded-xl font-medium">
                  {formatDateTime(room.openAt)}
                </span>
                <span className="text-base px-3 py-1 bg-[#e3f0ff] text-[#2B7FFF] rounded-xl font-medium">
                  {formatDateTime(room.expiredAt)}
                </span>

                <div className="flex items-center gap-4">
                  {/* 참여하기 버튼 */}
                  <button
                    onClick={(e) => handleJoinRoom(e, room.id)}
                    className="bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white px-4 py-2 rounded-[10px] text-lg font-semibold leading-[1.714] transition-colors h-11"
                  >
                    참여하기
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </MypageLayout>
  );
};

export default StudyRoom;

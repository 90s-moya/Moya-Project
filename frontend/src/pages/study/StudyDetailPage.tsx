import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Header from "@/components/common/Header";
import StudyBackToList from "@/components/study/StudyBackToList";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDateTime } from "@/util/date";
import { deleteRoom, getRoomDetail, registerForRoom } from "@/api/studyApi";
import type { StudyRoomDetail } from "@/types/study";
import { useAuthStore } from "@/store/useAuthStore";
import UserApi from "@/api/userApi";
import dayjs from "dayjs";
import {
  FileText,
  Users,
  Calendar,
  Tag,
  User,
  Clock,
  AlertTriangle,
  Trash2,
  CheckCircle,
  Info,
} from "lucide-react";

export default function StudyDetailPage() {
  const { roomId } = useParams();
  const [roomDetail, setRoomDetail] = useState<StudyRoomDetail>();
  const [isMine, setIsMine] = useState(false);

  const navigate = useNavigate();
  // 스터디 삭제 시 참고할 현재 사용자의 UUID
  const UUID = useAuthStore((state) => state.UUID);

  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [userNickname, setUserNickname] = useState<string>("");

  // 사용자 닉네임 조회
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await UserApi.getMyInfo();
        setUserNickname(res.data.nickname);
      } catch (error) {
        console.error("사용자 닉네임 조회 실패:", error);
      }
    };

    fetchUserInfo();
  }, []);

  // 마운트 시 스터디 상세 조회 API 요청 보내기
  useEffect(() => {
    // id가 undefined일 경우 return
    if (!roomId) {
      return;
    }

    const requestRoomDetail = async (roomId: string) => {
      try {
        const data = await getRoomDetail(roomId);
        // console.log("스터디 상세 조회 결과 : ", data);

        setRoomDetail(data);
      } catch (err) {
        console.log("스터디 상세 조회 에러 발생 : ", err);
      }
    };

    requestRoomDetail(roomId);
  }, [roomId]);

  // 스터디 상세 조회 시 이미 참여한 방인지 확인
  useEffect(() => {
    if (roomDetail?.joinUsers && userNickname) {
      const isRegistered = roomDetail.joinUsers.includes(userNickname);
      setIsAlreadyRegistered(isRegistered);
    }
  }, [roomDetail, userNickname]);

  // 스터디 삭제하는 함수
  const handleDeleteRoom = async () => {
    if (!roomId) {
      return;
    }

    // 삭제하기 전의 확인 대화창
    const confirmed = window.confirm("정말 이 방을 삭제하시겠습니까?");

    if (!confirmed) return;

    try {
      const data = await deleteRoom(roomId);

      console.log("스터디 삭제 완료!", data);
      // 스터디 목록 페이지로 이동
      navigate(`/study`);
    } catch (err) {
      console.error("스터디 삭제 에러 발생", err);
      alert("스터디 삭제에 실패하였습니다.");
    }
  };

  // 스터디 상세 조회를 통해 받은 방장 ID와 현재 사용자의 ID가 같다면 삭제 버튼 활성화
  useEffect(() => {
    if (roomDetail?.masterInfo.masterId === UUID) {
      setIsMine(true);
    }
  }, [roomDetail, UUID]);

  // 스터디 참여 등록 함수
  const handleRegisterForRoom = async () => {
    try {
      if (!roomId) {
        alert("잘못된 요청입니다.");
        navigate("/");
        return;
      }

      if (isAlreadyRegistered) {
        alert("이미 참여한 방입니다.");
        return;
      }

      const data = await registerForRoom(roomId);
      console.log("스터디 참여 등록 성공:", data);

      navigate(`/mypage/room`);
    } catch (error) {
      console.error("스터디 등록 에러: ", error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header scrollBg={false} />

      <main className="max-w-[1180px] mx-auto px-4 md:px-6 lg:px-8 pt-[120px] pb-12 text-[17px] leading-relaxed">
        {/* Back to List */}
        <StudyBackToList />

        {/* Title Section */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-[#1b1c1f] mb-2">
            스터디 상세보기
          </h1>
          <p className="text-[#4b4e57] text-lg">
            스터디의 상세 정보를 확인하고 참여해보세요!
          </p>
        </div>

        {/* 2단 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 좌측: 스터디 정보 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 스터디 제목 카드 */}
            <Card className="p-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[#1b1c1f]">
                  {roomDetail?.title || "제목을 불러오는 중..."}
                </h2>
              </div>
            </Card>

            {/* 스터디 정보 카드 */}
            <Card className="p-8">
              <h3 className="text-xl font-bold text-[#1b1c1f] mb-6 flex items-center gap-2">
                <Info className="w-5 h-5 text-[#2b7fff]" />
                스터디 정보
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Tag className="w-5 h-5 text-[#6f727c] flex-shrink-0" />
                  <span className="text-[#6f727c] font-medium w-24 flex-shrink-0">
                    카테고리
                  </span>
                  <span className="text-[#1b1c1f] font-semibold">
                    {roomDetail?.categoryName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-[#6f727c] flex-shrink-0" />
                  <span className="text-[#6f727c] font-medium w-24 flex-shrink-0">
                    참여 인원
                  </span>
                  <span className="text-[#1b1c1f] font-semibold">
                    {roomDetail?.joinUsers.length}명
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#6f727c] flex-shrink-0 mt-1" />
                  <span className="text-[#6f727c] font-medium w-24 flex-shrink-0">
                    시작 일시
                  </span>
                  <span className="text-[#1b1c1f] font-semibold break-words">
                    {roomDetail?.openAt
                      ? formatDateTime(roomDetail.openAt)
                      : "일정 미정"}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#6f727c] flex-shrink-0 mt-1" />
                  <span className="text-[#6f727c] font-medium w-24 flex-shrink-0">
                    종료 일시
                  </span>
                  <span className="text-[#1b1c1f] font-semibold break-words">
                    {roomDetail?.expiredAt
                      ? formatDateTime(roomDetail.expiredAt)
                      : "일정 미정"}
                  </span>
                </div>
              </div>
            </Card>

            {/* 참여자 정보 카드 */}
            <Card className="p-8">
              <h3 className="text-xl font-bold text-[#1b1c1f] mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#2b7fff]" />
                참여자 목록
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {roomDetail?.joinUsers?.map((name, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                  >
                    <User className="w-4 h-4 text-[#2b7fff]" />
                    <span className="text-[#1b1c1f] font-medium">{name}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 상세 설명 카드 */}
            <Card className="p-8">
              <h3 className="text-xl font-bold text-[#1b1c1f] mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2b7fff]" />
                상세 설명
              </h3>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-[#404249] leading-relaxed whitespace-pre-wrap">
                  {roomDetail?.body || "상세 설명이 없습니다."}
                </p>
              </div>
            </Card>
          </div>

          {/* 우측: 방장 정보 및 액션 */}
          <div className="space-y-6">
            {/* 방장 정보 카드 */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-[#1b1c1f] mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-[#2b7fff]" />
                방장 정보
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#6f727c] font-medium">방장명</span>
                  <span className="text-[#1b1c1f] font-semibold">
                    {roomDetail?.masterInfo.nickname}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6f727c] font-medium">
                    스터디 생성 횟수
                  </span>
                  <span className="text-[#1b1c1f] font-semibold">
                    {roomDetail?.masterInfo.makeRoomCnt}회
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6f727c] font-medium">가입일</span>
                  <span className="text-[#1b1c1f] font-semibold">
                    {roomDetail?.masterInfo.createdAt
                      ? (() => {
                          const parsed = dayjs(roomDetail.masterInfo.createdAt);
                          if (!parsed.isValid()) return "정보 없음";

                          const now = dayjs();
                          const diffDays = now.diff(parsed, "day");

                          return `${parsed.format(
                            "YYYY년 M월 D일"
                          )} (+${diffDays}일)`;
                        })()
                      : "정보 없음"}
                  </span>
                </div>
              </div>
            </Card>

            {/* 액션 버튼들 */}
            <Card className="p-6">
              <div className="space-y-4">
                {!isAlreadyRegistered ? (
                  <Button
                    onClick={handleRegisterForRoom}
                    className="w-full bg-[#2b7fff] hover:bg-blue-600 text-white py-4 text-lg font-semibold rounded-lg transition-all duration-200"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Users className="w-5 h-5" />
                      스터디 등록하기
                    </div>
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate("/mypage/room")}
                    className="w-full bg-[#2b7fff] hover:bg-blue-600 text-white py-4 text-lg font-semibold rounded-lg transition-all duration-200"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <User className="w-5 h-5" />
                      등록한 스터디 목록 가기
                    </div>
                  </Button>
                )}

                {isMine && (
                  <Button
                    onClick={handleDeleteRoom}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-4 text-lg font-semibold rounded-lg transition-all duration-200"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Trash2 className="w-5 h-5" />
                      스터디 삭제하기
                    </div>
                  </Button>
                )}
              </div>
            </Card>

            {/* 안내 카드 */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="text-lg font-bold text-[#1b1c1f] mB-0 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#2b7fff]" />
                안내
              </h3>
              <ul className="space-y-2 text-sm text-[#4b4e57]">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-[#2b7fff] rounded-full mt-2 flex-shrink-0"></span>
                  <span>
                    스터디 참여 목록은 마이페이지에서 확인할 수 있습니다
                  </span>
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

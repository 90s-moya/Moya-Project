import StudyRoomHeader from "@/components/study/StudyRoomHeader";
import StudyRoomContent from "@/components/study/StudyRoomContent";
import StudyRoomFooter from "@/components/study/StudyRoomFooter";
import { useStudyRoom } from "@/hooks/useStudyRoom";
import { formatDateTime } from "@/util/date";
import { Clock, Users, User, Calendar, FileText, X } from "lucide-react";
import { useState } from "react";

export default function StudyRoomPage() {
  const {
    participants,
    localStream,
    focusedUserId,
    showCarousel,
    roomId,
    roomInfo,
    getParticipantDocs,
    handleDocsClick,
    handleCloseCarousel,
    getCarouselItems,
    getGridColumns,
    handleLeaveRoom,
    setFocusedUserId,
    setShowCarousel,
  } = useStudyRoom();

  const [showRoomInfo, setShowRoomInfo] = useState(false);

  if (!roomId) {
    return <div>방 ID가 없습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-white text-[#1b1c1f] flex flex-col">
      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-hidden relative">
        {/* 헤더 (포커스 모드일 때만 표시) */}
        <StudyRoomHeader
          participants={participants}
          focusedUserId={focusedUserId}
          setFocusedUserId={(userId) => {
            setFocusedUserId(userId);
            setShowCarousel(false);
          }}
          getParticipantDocs={getParticipantDocs}
          handleDocsClick={handleDocsClick}
          roomId={roomId}
        />

        {/* 메인 콘텐츠 */}
        <StudyRoomContent
          participants={participants}
          focusedUserId={focusedUserId}
          showCarousel={showCarousel}
          getParticipantDocs={getParticipantDocs}
          handleDocsClick={handleDocsClick}
          handleCloseCarousel={handleCloseCarousel}
          getCarouselItems={getCarouselItems}
          getGridColumns={getGridColumns}
          roomId={roomId}
        />
      </main>

      {/* 푸터 */}
      <StudyRoomFooter
        localStream={localStream}
        onLeaveRoom={handleLeaveRoom}
        onShowRoomInfo={() => setShowRoomInfo(true)}
      />

      {/* 방 정보 모달 */}
      {showRoomInfo && roomInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-[#1b1c1f]">방 정보</h2>
              <button
                onClick={() => setShowRoomInfo(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6 space-y-6">
              {/* 방 제목 및 설명 */}
              <div>
                <h3 className="text-lg font-semibold text-[#1b1c1f] mb-2">
                  {roomInfo.title}
                </h3>
                <p className="text-[#6f727c] text-sm leading-relaxed">
                  {roomInfo.body}
                </p>
              </div>

              {/* 방 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-[#2b7fff]" />
                    <div>
                      <span className="text-sm text-[#6f727c]">참여 인원</span>
                      <p className="text-[#1b1c1f] font-medium">
                        {roomInfo.joinUsers.length}/{roomInfo.maxUser}명
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-[#2b7fff]" />
                    <div>
                      <span className="text-sm text-[#6f727c]">카테고리</span>
                      <p className="text-[#1b1c1f] font-medium">
                        {roomInfo.categoryName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-[#2b7fff]" />
                    <div>
                      <span className="text-sm text-[#6f727c]">방장</span>
                      <p className="text-[#1b1c1f] font-medium">
                        {roomInfo.masterInfo.nickname}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-[#2b7fff]" />
                    <div>
                      <span className="text-sm text-[#6f727c]">시작일시</span>
                      <p className="text-[#1b1c1f] font-medium">
                        {formatDateTime(roomInfo.openAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-[#2b7fff]" />
                    <div>
                      <span className="text-sm text-[#6f727c]">종료일시</span>
                      <p className="text-[#1b1c1f] font-medium">
                        {formatDateTime(roomInfo.expiredAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-[#2b7fff]" />
                    <div>
                      <span className="text-sm text-[#6f727c]">방 생성일</span>
                      <p className="text-[#1b1c1f] font-medium">
                        {formatDateTime(roomInfo.masterInfo.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 참여자 목록 */}
              <div>
                <h4 className="text-md font-semibold text-[#1b1c1f] mb-3">
                  참여자 목록
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {roomInfo.joinUsers.map((userId, index) => (
                    <div
                      key={userId}
                      className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md"
                    >
                      <div className="w-8 h-8 bg-[#2b7fff] rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="text-sm text-[#1b1c1f] truncate">
                        {userId}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex justify-end p-6 border-t">
              <button
                onClick={() => setShowRoomInfo(false)}
                className="bg-[#2b7fff] hover:bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import StudyRoomHeader from "@/components/study/StudyRoomHeader";
import StudyRoomContent from "@/components/study/StudyRoomContent";
import StudyRoomFooter from "@/components/study/StudyRoomFooter";
import { useStudyRoom } from "@/hooks/useStudyRoom";

export default function StudyRoomPage() {
  const {
    participants,
    localStream,
    focusedUserId,
    showCarousel,
    roomId,
    getParticipantDocs,
    handleDocsClick,
    handleCloseCarousel,
    getCarouselItems,
    getGridColumns,
    handleLeaveRoom,
    setFocusedUserId,
    setShowCarousel,
  } = useStudyRoom();

  if (!roomId) {
    return <div>방 ID가 없습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-white text-[#1b1c1f] flex flex-col">
      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-hidden">
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
      />
    </div>
  );
}

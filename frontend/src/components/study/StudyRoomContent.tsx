import VideoTile from "./VideoTile";
import Carousel from "./FileCarousel";

type Participant = {
  id: string;
  stream: MediaStream | null;
  isLocal?: boolean;
};

type ParticipantsDocs = {
  docsId: string;
  userId: string;
  fileUrl: string;
  docsStatus: string;
};

type DocItem = {
  id: string;
  title: string;
  fileUrl: string;
  type: "RESUME" | "COVERLETTER" | "PORTFOLIO";
};

interface StudyRoomContentProps {
  participants: Participant[];
  focusedUserId: string | null;
  showCarousel: boolean;
  getParticipantDocs: (participantId: string) => ParticipantsDocs[];
  handleDocsClick: (userId: string) => void;
  handleCloseCarousel: () => void;
  getCarouselItems: () => DocItem[];
  getGridColumns: (count: number) => number;
  roomId: string;
}

export default function StudyRoomContent({
  participants,
  focusedUserId,
  showCarousel,
  getParticipantDocs,
  handleDocsClick,
  handleCloseCarousel,
  getCarouselItems,
  getGridColumns,
  roomId,
}: StudyRoomContentProps) {
  // VideoTile 렌더링 함수
  const renderVideoTile = (participant: Participant) => {
    const userDocs = getParticipantDocs(participant.id);
    const isFocused = focusedUserId === participant.id;

    return (
      <div
        key={participant.id}
        className={`w-full aspect-video transition-all duration-300 ${
          isFocused ? "col-span-2 row-span-2" : ""
        }`}
      >
        <VideoTile
          stream={participant.stream}
          isLocal={participant.isLocal}
          userId={participant.id}
          roomId={roomId}
          userDocs={userDocs}
          onDocsClick={handleDocsClick}
        />
      </div>
    );
  };

  return (
    <div className="h-full pt-[50px] px-4">
      {/* 포커스 모드일 때: 왼쪽 포커스된 비디오 + 오른쪽 서류 */}
      {focusedUserId ? (
        <div className="flex gap-4 h-full">
          {/* 왼쪽: 포커스된 비디오 (화면의 절반) */}
          <div className="w-1/2 h-[68vh]">
            {participants
              .filter((p) => p.id === focusedUserId)
              .map((participant) => (
                <div key={participant.id} className="w-full h-full">
                  <VideoTile
                    stream={participant.stream}
                    isLocal={participant.isLocal}
                    userId={participant.id}
                    roomId={roomId}
                    userDocs={getParticipantDocs(participant.id)}
                    onDocsClick={handleDocsClick}
                  />
                </div>
              ))}
          </div>

          {/* 오른쪽: 서류 캐러셀 (화면의 절반) */}
          <div className="w-1/2 h-[68vh] bg-gray-50 rounded-lg overflow-hidden">
            <Carousel
              items={getCarouselItems()}
              onClose={handleCloseCarousel}
            />
          </div>
        </div>
      ) : (
        /* 일반 모드: 그리드 레이아웃 (참가자 수 기반 반응형) */
        <div
          className={`grid gap-4 h-full transition-[grid-template-columns] duration-300`}
          style={{
            gridTemplateColumns: `repeat(${getGridColumns(
              participants.length
            )}, minmax(0, 1fr))`,
          }}
        >
          {participants.map(renderVideoTile)}
        </div>
      )}
    </div>
  );
}

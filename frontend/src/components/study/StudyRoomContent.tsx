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
  // 참가자 수에 따른 그리드 행 개수 계산
  const getGridRows = (count: number) => {
    const cols = getGridColumns(count);
    return Math.ceil(count / cols);
  };

  // VideoTile 렌더링 함수
  const renderVideoTile = (participant: Participant) => {
    const userDocs = getParticipantDocs(participant.id);

    return (
      <div key={participant.id} className="w-full h-full">
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
    <div
      className="px-4"
      style={{
        height: focusedUserId
          ? "calc(100vh - 210px)" // 포커스 모드: header(~140px) + footer(~60px) + 여유(~10px) 제외
          : "calc(100vh - 60px)", // 일반 모드: footer(~60px)만 제외
        paddingBottom: focusedUserId ? "4px" : "4px",
      }}
    >
      {/* 포커스 모드일 때: 왼쪽 포커스된 비디오 + 오른쪽 서류 */}
      {focusedUserId ? (
        <div className="flex gap-3 h-full animate-in fade-in duration-200">
          {/* 왼쪽: 포커스된 비디오 (화면의 절반) */}
          <div className="w-1/2 h-full">
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
          <div className="w-1/2 h-full bg-gray-50 rounded-md overflow-hidden">
            <Carousel
              items={getCarouselItems()}
              onClose={handleCloseCarousel}
            />
          </div>
        </div>
      ) : (
        /* 일반 모드: 그리드 레이아웃 (참가자 수 기반 반응형) */
        <div
          className="grid h-full animate-in fade-in duration-200"
          style={{
            gridTemplateColumns: `repeat(${getGridColumns(
              participants.length
            )}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${getGridRows(
              participants.length
            )}, minmax(0, 1fr))`,
            gap:
              participants.length <= 4
                ? "8px"
                : participants.length <= 6
                ? "6px"
                : "4px", // 참가자 수에 따라 갭 조정
          }}
        >
          {participants.map(renderVideoTile)}
        </div>
      )}
    </div>
  );
}

import VideoTile from "./VideoTile";

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

interface StudyRoomHeaderProps {
  participants: Participant[];
  focusedUserId: string | null;
  setFocusedUserId: (userId: string) => void;
  getParticipantDocs: (participantId: string) => ParticipantsDocs[];
  handleDocsClick: (userId: string) => void;
  roomId: string;
}

export default function StudyRoomHeader({
  participants,
  focusedUserId,
  setFocusedUserId,
  getParticipantDocs,
  handleDocsClick,
  roomId,
}: StudyRoomHeaderProps) {
  if (!focusedUserId) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mt-2 mb-4 justify-center">
      {participants
        .filter((p) => p.id !== focusedUserId)
        .sort((a, b) => {
          // isLocal이 true인 참가자(나)를 제일 앞으로 정렬
          if (a.isLocal && !b.isLocal) return -1;
          if (!a.isLocal && b.isLocal) return 1;
          return 0;
        })
        .slice(0, 5)
        .map((p) => (
          <button
            key={`thumb-${p.id}`}
            onClick={() => setFocusedUserId(p.id)}
            className="shrink-0 w-45 h-30 rounded-md overflow-hidden border border-gray-300 hover:border-gray-400 transition-all duration-200"
            title={p.isLocal ? "나" : p.id}
          >
            <div className="w-full h-full bg-black/20 relative">
              <VideoTile
                stream={p.stream}
                isLocal={p.isLocal}
                userId={p.id}
                roomId={roomId}
                userDocs={getParticipantDocs(p.id)}
                onDocsClick={handleDocsClick}
                hideOverlay
              />
            </div>
          </button>
        ))}
      {/* 5명 초과 시 더보기 표시 (포커스된 유저 제외한 수 기준) */}
      {participants.filter((p) => p.id !== focusedUserId).length > 5 && (
        <div className="shrink-0 w-45 h-30 rounded-md border border-gray-300 bg-gray-100 flex items-center justify-center text-sm text-gray-600">
          +{participants.filter((p) => p.id !== focusedUserId).length - 5}
        </div>
      )}
    </div>
  );
}

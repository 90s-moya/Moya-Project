import VideoTile from "./VideoTile";
import { Users } from "lucide-react";

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

  const otherParticipants = participants
    .filter((p) => p.id !== focusedUserId)
    .sort((a, b) => {
      // isLocal이 true인 참가자(나)를 제일 앞으로 정렬
      if (a.isLocal && !b.isLocal) return -1;
      if (!a.isLocal && b.isLocal) return 1;
      return 0;
    });

  return (
    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-2">
      <div className="max-w-6xl mx-auto">
        {/* 썸네일 목록 */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide justify-center">
          {otherParticipants.map((p) => (
            <button
              key={`thumb-${p.id}`}
              onClick={() => setFocusedUserId(p.id)}
              className="group shrink-0 relative"
              title={p.isLocal ? "나" : `참여자 ${p.id.slice(0, 8)}`}
            >
              {/* 썸네일 비디오 */}
              <div className="w-24 h-15 sm:w-32 sm:h-20 md:w-40 md:h-24 lg:w-45 lg:h-27 rounded-lg sm:rounded-xl overflow-hidden border-2 border-transparent group-hover:border-[#2b7fff] transition-all duration-200 shadow-sm group-hover:shadow-md">
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

              {/* 호버 시 표시되는 오버레이 */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="bg-white/90 rounded-full p-1">
                    <Users className="w-3 h-3 text-[#2b7fff]" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

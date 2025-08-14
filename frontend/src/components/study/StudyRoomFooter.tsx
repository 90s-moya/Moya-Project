import { PhoneOff, Info } from "lucide-react";
import CameraControlPanel from "./CameraControlPanel";
import MicControlPanel from "./MicControlPanel";

interface StudyRoomFooterProps {
  localStream: MediaStream | null;
  onLeaveRoom: () => void;
  onShowRoomInfo: () => void;
}

export default function StudyRoomFooter({
  localStream,
  onLeaveRoom,
  onShowRoomInfo,
}: StudyRoomFooterProps) {
  return (
    <footer className="relative bg-white border-gray-200">
      {/* 컨트롤 패널 */}
      <div className="bg-blue-500/95 backdrop-blur-sm border-blue-600 py-3 shadow-lg">
        <div className="flex justify-center items-center gap-3">
          {/* 방 정보 버튼 */}
          <button
            onClick={onShowRoomInfo}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white rounded-full px-4 py-2 shadow-md backdrop-blur-sm border border-white/30"
            title="방 정보 보기"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* 마이크 컨트롤 */}
          <div className="rounded-full px-4 py-2 border bg-white/20 backdrop-blur-sm">
            <MicControlPanel stream={localStream} />
          </div>

          {/* 카메라 컨트롤 */}
          <div className="rounded-full px-4 py-2 border bg-white/20 backdrop-blur-sm">
            <CameraControlPanel stream={localStream} />
          </div>

          {/* 나가기 버튼 */}
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-2 shadow-md"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}

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
    <footer className="relative bg-white border-t border-gray-200 shadow-lg">
      {/* 메인 컨트롤 패널 */}
      <div className="bg-gradient-to-r from-[#2b7fff] to-[#1e6fe8] py-4 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center gap-6">
            {/* 방 정보 버튼 */}
            <button
              onClick={onShowRoomInfo}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white rounded-lg px-4 py-2.5 transition-all duration-200 backdrop-blur-sm border border-white/30 hover:shadow-md"
              title="방 정보 보기"
            >
              <Info className="w-4 h-4" />
              <span className="text-sm font-medium">방 정보</span>
            </button>

            {/* 마이크 컨트롤 */}
            <button
              onClick={() => {
                const micButton = document.querySelector(
                  "[data-mic-button]"
                ) as HTMLButtonElement;
                micButton?.click();
              }}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white rounded-lg px-4 py-2.5 transition-all duration-200 backdrop-blur-sm border border-white/30 hover:shadow-md"
              title="마이크 제어"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <MicControlPanel stream={localStream} />
              </div>
              <span className="text-sm font-medium">마이크</span>
            </button>

            {/* 카메라 컨트롤 */}
            <button
              onClick={() => {
                const cameraButton = document.querySelector(
                  "[data-camera-button]"
                ) as HTMLButtonElement;
                cameraButton?.click();
              }}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white rounded-lg px-4 py-2.5 transition-all duration-200 backdrop-blur-sm border border-white/30 hover:shadow-md"
              title="카메라 제어"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <CameraControlPanel stream={localStream} />
              </div>
              <span className="text-sm font-medium">카메라</span>
            </button>

            {/* 나가기 버튼 */}
            <button
              onClick={onLeaveRoom}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-lg px-6 py-2.5 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
              title="방 나가기"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="text-sm font-medium">나가기</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

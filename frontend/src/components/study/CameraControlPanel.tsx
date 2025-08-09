import { Video, VideoOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  stream: MediaStream | null; // 부모(StudyRoomPage)의 localStream을 받음
}

export default function CameraControlPanel({stream}: Props) {

  // 초기 상태는 현재 트랙 상태에서 결정
  const initial = useMemo(() => stream?.getVideoTracks()[0]?.enabled ?? true,[stream]);

  const [isCameraOn, setIsCameraOn] = useState<boolean>(initial);

  const toggle = () => {
    const next = !isCameraOn;
    setIsCameraOn(next);

    const track = stream?.getVideoTracks()[0];
    if(track) {
      track.enabled = next;
    }
  }
 
  return (
    <div className="relative">
      {/* 카메라 토글 버튼 */}
      <button
        onClick={toggle}
        className="flex items-center gap-1 text-[#2b7fff] hover:text-blue-600 transition"
      >
        {isCameraOn ? 
          <Video className="w-5 h-5" />
         : 
          <VideoOff className="w-5 h-5" />
        }
        <span className="text-base font-medium">카메라</span>
      </button>
    </div>
  );
}

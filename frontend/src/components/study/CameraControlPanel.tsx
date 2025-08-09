import { Video, VideoOff } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  stream: MediaStream | null; // 부모(StudyRoomPage)의 localStream을 받음
}

export default function CameraControlPanel({stream}: Props) {
  const track = stream?.getVideoTracks()[0] ?? null;

  // 초기 상태는 현재 트랙 상태에서 결정
  const initialEnabled = useMemo(() => track?.enabled ?? true,[track]);

  const [isCameraOn, setIsCameraOn] = useState<boolean>(initialEnabled);

  const toggle = () => {
    if(!track) return;
    const next = !isCameraOn;
    setIsCameraOn(next);

    track.enabled = next;
  }
 
  return (
    <div className="relative">
      {/* 카메라 토글 버튼 */}
      <button
        onClick={toggle}
        disabled={!track}
        className="flex items-center gap-1 text-white hover:text-white/80 transition disabled:opacity-50"
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

import { Mic, MicOff } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  stream: MediaStream | null
};

export default function MicControlPanel({stream}: Props) {
  const track = stream?.getAudioTracks()[0] ?? null;

  // 초기 상태는 현재 트랙 상태에서 결정
  const initialEnabled = useMemo(() => track?.enabled ?? true,[track]);

  const [isMicOn, setIsMicOn] = useState<boolean>(initialEnabled);

  const toggle = () => {
    if(!track) return;
    const next = !isMicOn;
    setIsMicOn(next);

    track.enabled = next;
  }
  

  return (
    <div className="relative">
    {/* 카메라 토글 버튼 */}
    <button
      onClick={toggle}
      disabled={!track}
      className="flex items-center gap-1 text-[#2b7fff] hover:text-blue-600 transition"
    >
      {isMicOn ? 
        <Mic className="w-5 h-5" />
       : 
        <MicOff className="w-5 h-5" />
      }
      <span className="text-base font-medium">마이크</span>
    </button>
  </div>
  );
}

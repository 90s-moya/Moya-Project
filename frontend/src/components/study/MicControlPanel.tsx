import { Mic, MicOff } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  stream: MediaStream | null;
};

export default function MicControlPanel({ stream }: Props) {
  const track = stream?.getAudioTracks()[0] ?? null;

  // 초기 상태는 현재 트랙 상태에서 결정
  const initialEnabled = useMemo(() => track?.enabled ?? true, [track]);

  const [isMicOn, setIsMicOn] = useState<boolean>(initialEnabled);

  const toggle = () => {
    if (!track) return;
    const next = !isMicOn;
    setIsMicOn(next);

    track.enabled = next;
  };

  return (
    <button
      data-mic-button
      onClick={toggle}
      disabled={!track}
      className="text-white hover:text-white/80 transition-all duration-200 disabled:opacity-50"
      title={isMicOn ? "마이크 끄기" : "마이크 켜기"}
    >
      {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
    </button>
  );
}

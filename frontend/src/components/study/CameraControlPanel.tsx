import { Video, VideoOff } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  stream: MediaStream | null;
};

export default function CameraControlPanel({ stream }: Props) {
  const track = stream?.getVideoTracks()[0] ?? null;

  // 초기 상태는 현재 트랙 상태에서 결정
  const initialEnabled = useMemo(() => track?.enabled ?? true, [track]);

  const [isCameraOn, setIsCameraOn] = useState<boolean>(initialEnabled);

  const toggle = () => {
    if (!track) return;
    const next = !isCameraOn;
    setIsCameraOn(next);

    track.enabled = next;
  };

  return (
    <button
      data-camera-button
      onClick={toggle}
      disabled={!track}
      className="text-white hover:text-white/80 transition-all duration-200 disabled:opacity-50"
      title={isCameraOn ? "카메라 끄기" : "카메라 켜기"}
    >
      {isCameraOn ? (
        <Video className="w-4 h-4" />
      ) : (
        <VideoOff className="w-4 h-4" />
      )}
    </button>
  );
}

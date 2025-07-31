import { useEffect, useRef } from "react";

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
}

export default function VideoTile({
  stream,
  name,
  isLocal = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-lg w-full h-full bg-gray-400 overflow-hidden">
      {/* 비디오 스트림 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />

      {/* 사용자 이름 */}
      <div className="absolute bottom-2 left-2 bg-blue-500 bg-opacity-50 text-white text-lg px-3 py-1 rounded-full shadow">
        {name}
      </div>

      {/* 오른쪽 상단 아이콘 3개 */}
      <div className="absolute top-2 right-2 flex flex-col items-center gap-2 text-black">
        <div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-[#e0e7ff] cursor-pointer">
          📄
        </div>
        <div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-[#e0e7ff] cursor-pointer">
          📝
        </div>
        <div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-[#e0e7ff] cursor-pointer">
          📁
        </div>
      </div>

      {/* 오른쪽 하단 감정 피드백 */}
      <div className="absolute bottom-2 right-2 flex gap-2">
        <button className="text-xl bg-white rounded-full shadow px-2 hover:bg-[#f0f4ff]">
          🙂
        </button>
        <button className="text-xl bg-white rounded-full shadow px-2 hover:bg-[#f0f4ff]">
          😢
        </button>
      </div>
    </div>
  );
}

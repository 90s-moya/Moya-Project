import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function MicControlPanel() {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 마이크 스트림 설정
  useEffect(() => {
    const startMic = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = stream;

        if (audioRef.current) {
          audioRef.current.srcObject = stream;
          audioRef.current.volume = volume;
          audioRef.current.muted = isMuted;
        }
      } catch (err) {
        console.error("마이크 접근 실패:", err);
        alert("마이크 접근 실패:");
      }
    };

    startMic();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 음소거 / 볼륨 변경 시 오디오 적용
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.volume = volume;
    }
  }, [isMuted, volume]);

  return (
    <div className="relative">
      {/* 마이크 버튼 */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1 text-[#2b7fff] hover:text-blue-600 transition"
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        <span className="text-base font-medium">마이크</span>
      </button>

      {/* 슬라이더 패널 */}
      {isOpen && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white border border-[#dedee4] shadow-lg rounded-lg p-4 w-64 z-50">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-700">
              볼륨 조절
            </label>
            <button
              onClick={() => setIsMuted((prev) => !prev)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {isMuted ? "🔇 음소거 해제" : "🔈 음소거"}
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {/* 실제 오디오 */}
      <audio ref={audioRef} autoPlay />
    </div>
  );
}

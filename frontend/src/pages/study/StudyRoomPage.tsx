import CameraControlPanel from "@/components/study/CameraControlPanel";
import MicControlPanel from "@/components/study/MicControlPanel";
import VideoTile from "@/components/study/VideoTile";
import { useNavigate } from "react-router-dom";

type Participant = {
  id: string;
  name: string;
  stream: MediaStream | null;
  isLocal?: boolean;
};

const myStream: MediaStream | null = null;
const remoteStream1: MediaStream | null = null;
const remoteStream2: MediaStream | null = null;
const remoteStream3: MediaStream | null = null;
const remoteStream4: MediaStream | null = null;

export default function StudyRoomPage() {
  const navigate = useNavigate();

  const participants: Participant[] = [
    { id: "me", name: "나", stream: myStream, isLocal: true },
    { id: "a1", name: "김지원", stream: remoteStream1 },
    { id: "a2", name: "홍길동", stream: remoteStream2 },
    { id: "a3", name: "최진혁", stream: remoteStream3 },
    { id: "a4", name: "최참빛", stream: remoteStream4 },
  ];

  return (
    <div className="min-h-screen bg-white text-[#1b1c1f] flex flex-col">
      {/* 상단 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white border-b border-[#dedee4] h-[72px] flex items-center justify-center px-6 shadow-sm">
        <h1 className="text-xl font-semibold text-[#2b7fff]">
          모의 면접 스터디
        </h1>
      </header>

      {/* 참가자 비디오 그리드 */}
      <main className="flex-1 pt-[100px] pb-24  w-full px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {participants.map((p) => (
            <div key={p.id} className="w-full aspect-video">
              <VideoTile stream={p.stream} name={p.name} isLocal={p.isLocal} />
            </div>
          ))}
        </div>
      </main>

      {/* 미디어 컨트롤 바 */}
      <footer className="fixed bottom-4 left-0 right-0 bg-white border-t border-[#dedee4] py-4 shadow-inner z-20">
        <div className="flex justify-center gap-10">
          <MicControlPanel></MicControlPanel>
          <CameraControlPanel></CameraControlPanel>
          <button
            onClick={() => navigate("/study")}
            className="text-red-400 text-xl font-semibold hover:text-red-700"
          >
            📤 나가기
          </button>
        </div>
      </footer>
    </div>
  );
}

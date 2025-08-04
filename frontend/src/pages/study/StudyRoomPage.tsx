import CameraControlPanel from "@/components/study/CameraControlPanel";
import MicControlPanel from "@/components/study/MicControlPanel";
import VideoTile from "@/components/study/VideoTile";
import { useNavigate } from "react-router-dom";
import {useEffect, useState, useRef} from "react";
import {SignalingClient} from "@/lib/webrtc/SignallingClient";
import {PeerConnectionManager} from "@/lib/webrtc/PeerConnectionManager";

type Participant = {
  id: string;
  name: string;
  stream: MediaStream | null;
  isLocal?: boolean;
};

export default function StudyRoomPage() {
  const navigate = useNavigate();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
 
  const peerManagerRef = useRef<PeerConnectionManager | null>(null);

  const handleLeaveRoom = () => {
    console.log(localStream)
    localStream?.getTracks().forEach((track) => track.stop());
    navigate("/study");
  };

  useEffect(()=>{
    // TODO: 로그인 한 유저 ID 정보로 변경해야함 ㅎ
    const myId = crypto.randomUUID();

    const signaling = new SignalingClient(`wss://${import.meta.env.VITE_RTC_API_URL}/ws`, myId, async (data) => {
      const peerManager = peerManagerRef.current;
      if(!peerManager) return;

      console.log("받은 메세지", data);

      if(data.type === "join"){
        await peerManager.createConnectionWith(data.senderId);
        console.log("새 참여자 연결!");
        return;
      }
      await peerManager.handleSignal(data);
    });
    const peerManager = new PeerConnectionManager(myId, signaling);
    peerManagerRef.current = peerManager;

    peerManager.onRemoteStream = (peerId, stream) => {
        setParticipants((prev) => [
          ...prev.filter((p) => p.id !== peerId),
          { id: peerId, name: `참여자-${peerId.slice(0, 4)}`, stream },
        ]);
      };

    (async ()=>{
      const local = await navigator.mediaDevices.getUserMedia({video:true, audio:true});
      setLocalStream(local);
      // TODO : 사용자 정보에 맞게 보내주세요!
      setParticipants((prev) => [
        ...prev.filter((p) => p.id !== myId),
        { id: myId, name: "나", stream: local, isLocal: true },
      ]);
      peerManager.setLocalStream(local);
      signaling.send({type:"join", senderId:myId});
    })();
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#1b1c1f] flex flex-col">
      {/* 상단 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white border-b border-[#dedee4] h-[72px] flex items-center justify-center px-6 shadow-sm">
        <h1 className="text-xl font-semibold text-[#2b7fff]">
          모의 면접 스터디
        </h1>
      </header>

      {/* 참가자 비디오 그리드 */}
      <main className="flex-1 pt-[100px] pb-24 w-full px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {participants.map((p) => (
            <div key={p.id} className="w-full aspect-video">
              <VideoTile
                stream={p.stream}
                name={p.name}
                isLocal={p.isLocal}
              />
            </div>
          ))}
        </div>
      </main>

      {/* 미디어 컨트롤 바 */}
      <footer className="fixed bottom-4 left-0 right-0 bg-white border-t border-[#dedee4] py-4 shadow-inner z-20">
        <div className="flex justify-center gap-10">
          <MicControlPanel />
          <CameraControlPanel />
          <button
            onClick={handleLeaveRoom}
            className="text-red-400 text-xl font-semibold hover:text-red-700"
          >
            📤 나가기
          </button>
        </div>
      </footer>
    </div>
  );
}

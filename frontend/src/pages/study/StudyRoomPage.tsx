import CameraControlPanel from "@/components/study/CameraControlPanel";
import MicControlPanel from "@/components/study/MicControlPanel";
import VideoTile from "@/components/study/VideoTile";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { SignalingClient } from "@/lib/webrtc/SignallingClient";
import { PeerConnectionManager } from "@/lib/webrtc/PeerConnectionManager";
import UserApi from "@/api/userApi";

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
  const myIdRef = useRef<string>("");
  const peerManagerRef = useRef<PeerConnectionManager | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const [nickname, setNickname] = useState("");

  // 닉네임 저장용 Map
  const nicknameMapRef = useRef<Map<string, string>>(new Map());

  // 유저 닉네임을 불러와서 저장하는 useEffect
  useEffect(() => {
    const requestMyInfo = async () => {
      try {
        const res = await UserApi.getMyInfo();

        console.log("getMyInfo의 결과입니다.", res.data.nickname);
        setNickname(res.data.nickname);
      } catch (err) {
        alert("getMyInfo 에러 발생");
      }
    };
    requestMyInfo();
  }, []);

  const handleLeaveRoom = () => {
    console.log("disconnection video", localStream);

    // peer제거
    peerManagerRef.current?.removeLocalTracks();

    // stream 중지
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    // srcObject 해제
    document.querySelectorAll("video").forEach((video) => {
      (video as HTMLVideoElement).srcObject = null;
    });

    setLocalStream(null);
    setParticipants((prev) => prev.filter((p) => p.id !== myIdRef.current));

    // webrtc 연결 종료
    peerManagerRef.current?.closeAllConnections?.();

    // websocket 메시지 전송
    signalingRef.current?.send({
      type: "leave",
      senderId: myIdRef.current,
    });

    //websocket 종료
    signalingRef.current?.close();
    navigate("/study");
  };

  useEffect(() => {
    if (!nickname) return;

    if (signalingRef.current) return;
    const userInfo = localStorage.getItem("auth-storage");
    const parsed = JSON.parse(userInfo!);
    const myId = parsed.state.UUID;
    myIdRef.current = myId;

    // 배포용
    const signaling = new SignalingClient(
      `wss://${import.meta.env.VITE_RTC_API_URL}/ws`,
      myId,
      async (data) => {
        // 테스트 용
        // const signaling = new SignalingClient(
        //   `ws://${import.meta.env.VITE_RTC_API_URL_TMP}/ws`,
        //   myId,
        //   async (data) => {
        const peerManager = peerManagerRef.current;
        if (!peerManager) return;

        console.log("다른 사용자로부터 받은 메세지", data);

        if (data.type === "join") {
          // 닉네임 저장
          if (data.nickname) {
            nicknameMapRef.current.set(data.senderId, data.nickname);
          }
          await peerManager.createConnectionWith(data.senderId);

          console.log("새 참여자 연결!");
          return;
        }
        if (data.type === "leave") {
          setParticipants((prev) =>
            prev.filter((p) => {
              if (p.id === data.senderId && p.stream) {
                p.stream.getTracks().forEach((track) => track.stop());
              }
              return p.id !== data.senderId;
            })
          );

          peerManager.removeConnection(data.senderId);
          console.log("퇴장함~", data.senderId);
          return;
        }
        await peerManager.handleSignal(data);
      }
    );

    signalingRef.current = signaling;
    const peerManager = new PeerConnectionManager(myId, signaling);
    peerManagerRef.current = peerManager;

    peerManager.onRemoteStream = (peerId, stream) => {
      console.log("nicknameMapRef 상태:", [
        ...nicknameMapRef.current.entries(),
      ]);
      console.log("peerId:", peerId);

      const nickname =
        nicknameMapRef.current.get(peerId) ?? `참여자-${peerId.slice(0, 4)}`;

      setParticipants((prev) => [
        ...prev.filter((p) => p.id !== peerId),
        { id: peerId, name: nickname, stream },
      ]);
    };

    // peerManager.onRemoteStream = (peerId, stream) => {
    //   setParticipants((prev) => [
    //     ...prev.filter((p) => p.id !== peerId),
    //     { id: peerId, name: `참여자-${nickname}`, stream },
    //   ]);
    // };

    (async () => {
      const local = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(local);
      // TODO : 사용자 정보에 맞게 변경해주세염ㅎ
      setParticipants((prev) => [
        ...prev.filter((p) => p.id !== myId),
        { id: myId, name: "나", stream: local, isLocal: true },
      ]);
      peerManager.setLocalStream(local);
      signaling.send({ type: "join", senderId: myId, nickname });
    })();
  }, [nickname]);
  // ************
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
              <VideoTile stream={p.stream} name={p.name} isLocal={p.isLocal} />
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

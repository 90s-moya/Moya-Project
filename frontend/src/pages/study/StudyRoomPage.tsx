import CameraControlPanel from "@/components/study/CameraControlPanel";
import MicControlPanel from "@/components/study/MicControlPanel";
import VideoTile from "@/components/study/VideoTile";
import Carousel from "@/components/ui/Carousel";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { SignalingClient } from "@/lib/webrtc/SignallingClient";
import { PeerConnectionManager } from "@/lib/webrtc/PeerConnectionManager";
import { getDocsInRoom } from "@/api/studyApi";

type Participant = {
  id: string;
  stream: MediaStream | null;
  isLocal?: boolean;
};

type ParticipantsDocs = {
  docsId: string; // docs_id → docsId로 변경
  userId: string; // user_id → userId로 변경
  fileUrl: string; // file_url → fileUrl로 변경
  docsStatus: string;
};

export default function StudyRoomPage() {
  const navigate = useNavigate();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const myIdRef = useRef<string>("");
  const peerManagerRef = useRef<PeerConnectionManager | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);

  const { room_id } = useParams();

  const [allDocs, setAllDocs] = useState<ParticipantsDocs[]>([]);

  // 포커스된 비디오 타일 상태 관리
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const [showCarousel, setShowCarousel] = useState(false);

  // 마운트 시 스터디 방 참여자들의 서류 조회
  useEffect(() => {
    const requestDocs = async () => {
      try {
        const data = await getDocsInRoom(room_id!);
        console.log("방 참여자들의 서류 조회 성공", data);
        setAllDocs(data);
      } catch (error) {
        console.error("방 참여자들의 서류 조회 실패", error);
      }
    };

    requestDocs();
  }, []);

  // 참가자별 서류 매핑 함수
  const getParticipantDocs = (participantId: string) => {
    console.log("getParticipantDocs 호출됨 - participantId:", participantId);
    console.log("allDocs:", allDocs);

    // user_id → userId로 변경
    const filteredDocs = allDocs.filter((doc) => doc.userId === participantId);
    console.log("필터링된 서류:", filteredDocs);

    return filteredDocs;
  };

  // 서류 클릭 핸들러
  const handleDocsClick = (userId: string) => {
    console.log("서류 클릭됨:", userId);
    setFocusedUserId(userId);
    setShowCarousel(true);
  };

  // 캐러셀 닫기 핸들러
  const handleCloseCarousel = () => {
    setShowCarousel(false);
    setFocusedUserId(null);
  };

  // 포커스된 참가자의 서류를 캐러셀용 데이터로 변환
  const getCarouselItems = () => {
    if (!focusedUserId) return [];

    const userDocs = getParticipantDocs(focusedUserId);
    return userDocs.map((doc) => ({
      id: doc.docsId, // docs_id → docsId로 변경
      title: getDocTypeTitle(doc.docsStatus),
      fileUrl: doc.fileUrl, // file_url → fileUrl로 변경
      type: doc.docsStatus as "RESUME" | "COVERLETTER" | "PORTFOLIO",
    }));
  };

  // 서류 타입별 제목 반환
  const getDocTypeTitle = (docsStatus: string) => {
    switch (docsStatus) {
      case "RESUME":
        return "이력서";
      case "COVERLETTER":
        return "자기소개서";
      case "PORTFOLIO":
        return "포트폴리오";
      default:
        return "서류";
    }
  };

  // VideoTile 렌더링 함수
  const renderVideoTile = (participant: Participant) => {
    const userDocs = getParticipantDocs(participant.id);
    const isFocused = focusedUserId === participant.id;

    return (
      <div
        key={participant.id}
        className={`w-full aspect-video transition-all duration-300 ${
          isFocused ? "col-span-2 row-span-2" : ""
        }`}
      >
        <VideoTile
          stream={participant.stream}
          isLocal={participant.isLocal}
          userId={participant.id}
          roomId={room_id!}
          userDocs={userDocs}
          onDocsClick={handleDocsClick}
        />
      </div>
    );
  };

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
        const peerManager = peerManagerRef.current;
        if (!peerManager) return;

        console.log("받은 메세지", data);

        // 새 참여자 입장 시 스트림 연결
        if (data.type === "join") {
          await peerManager.createConnectionWith(data.senderId);

          // 내 스트림이 있다면 새로운 참여자에게도 전송
          if (localStream) {
            peerManagerRef.current?.setLocalStream(localStream);
          }

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

    // 원격 스트림 처리
    peerManager.onRemoteStream = (peerId, stream) => {
      setParticipants((prev) => [
        ...prev.filter((p) => p.id !== peerId),
        { id: peerId, stream },
      ]);
    };

    (async () => {
      const local = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(local);
      setParticipants((prev) => [
        ...prev.filter((p) => p.id !== myId),
        { id: myId, stream: local, isLocal: true },
      ]);
      peerManager.setLocalStream(local);
      signaling.send({ type: "join", senderId: myId });
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

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 pt-[100px] pb-24 w-full px-4">
        {/* 포커스 모드일 때: 왼쪽 비디오, 오른쪽 캐러셀 */}
        {focusedUserId ? (
          <div className="flex gap-4 h-full">
            {/* 왼쪽: 포커스된 비디오 (화면의 절반) */}
            <div className="w-1/2">
              {participants
                .filter((p) => p.id === focusedUserId)
                .map((participant) => (
                  <div key={participant.id} className="w-full aspect-video">
                    <VideoTile
                      stream={participant.stream}
                      isLocal={participant.isLocal}
                      userId={participant.id}
                      roomId={room_id!}
                      userDocs={getParticipantDocs(participant.id)}
                      onDocsClick={handleDocsClick}
                    />
                  </div>
                ))}
            </div>

            {/* 오른쪽: 서류 캐러셀 (화면의 절반) */}
            <div className="w-1/2 bg-gray-50 rounded-lg p-4">
              <Carousel
                items={getCarouselItems()}
                onClose={handleCloseCarousel}
              />
            </div>
          </div>
        ) : (
          /* 일반 모드: 그리드 레이아웃 */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map(renderVideoTile)}
          </div>
        )}
      </div>

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

import CameraControlPanel from "@/components/study/CameraControlPanel";
import MicControlPanel from "@/components/study/MicControlPanel";
import VideoTile from "@/components/study/VideoTile";
import Carousel from "@/components/study/FileCarousel";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { SignalingClient } from "@/lib/webrtc/SignallingClient";
import { PeerConnectionManager } from "@/lib/webrtc/PeerConnectionManager";
import { getDocsInRoom } from "@/api/studyApi";
import { uploadVideo } from "@/api/studyApi";
import { PhoneOff } from "lucide-react";

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

type DocItem = {
  id: string;
  title: string;
  fileUrl: string;
  type: "RESUME" | "COVERLETTER" | "PORTFOLIO";
};

export default function StudyRoomPage() {
  const navigate = useNavigate();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const myIdRef = useRef<string>("");
  const peerManagerRef = useRef<PeerConnectionManager | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const { roomId } = useParams();

  // 녹화 관련 ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [allDocs, setAllDocs] = useState<ParticipantsDocs[]>([]);

  // 포커스된 비디오 타일 상태 관리
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const [showCarousel, setShowCarousel] = useState(false);

  // 마운트 시 스터디 방 참여자들의 서류 조회
  useEffect(() => {
    const requestDocs = async () => {
      try {
        console.log("roomId", roomId);
        const data = await getDocsInRoom(roomId!);
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
    // 같은 유저를 다시 클릭하면 토글로 닫기
    if (focusedUserId === userId && showCarousel) {
      setShowCarousel(false);
      setFocusedUserId(null);
      return;
    }
    setFocusedUserId(userId);
    setShowCarousel(true);
  };

  // 캐러셀 닫기 핸들러
  const handleCloseCarousel = () => {
    setShowCarousel(false);
    setFocusedUserId(null);
  };

  // 포커스된 참가자의 서류를 캐러셀용 데이터로 변환
  const getCarouselItems = (): DocItem[] => {
    if (!focusedUserId) return [];

    const userDocs = getParticipantDocs(focusedUserId);
    return userDocs.map((doc) => ({
      id: doc.docsId,
      title: getDocTypeTitle(doc.docsStatus),
      fileUrl: doc.fileUrl,
      type: doc.docsStatus as "RESUME" | "COVERLETTER" | "PORTFOLIO",
    }));
  };

  // 참가자 수에 따라 동적으로 그리드 열 개수 결정 (최대 6명)
  const getGridColumns = (count: number) => {
    if (count <= 2) return 2; // 1~2명: 2열
    if (count === 3) return 3; // 3명: 3열
    if (count === 4) return 2; // 4명: 2열(2x2)
    if (count === 5) return 3; // 5명: 3열(2행)
    return 3; // 6명: 3열(2행)
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
          roomId={roomId!}
          userDocs={userDocs}
          onDocsClick={handleDocsClick}
        />
      </div>
    );
  };
  const startRecording = (stream: MediaStream) => {
    try {
      // 비트레이트 제한 (용량 줄이기)
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp9",
          videoBitsPerSecond: 3_000_000, // 약 3Mbps
        });
      } catch {
        recorder = new MediaRecorder(stream, {
          videoBitsPerSecond: 3_000_000,
        });
      }

      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.start();
      console.log("녹화 시작");
    } catch (error) {
      console.error("녹화 시작 실패:", error);
    }
  };

  // 업로드가 끝날 때까지 기다렸다가 resolve
  const stopRecordingAndUpload = async () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") return;

    await new Promise<void>((resolve) => {
      rec.onstop = async () => {
        try {
          if (recordedChunksRef.current.length) {
            // 토큰(테스트용: 없으면 빈 문자열)
            const authStorage = localStorage.getItem("auth-storage") || "{}";
            const parsed = JSON.parse(authStorage);
            const token: string = parsed?.state?.token || "";

            const blob = new Blob(recordedChunksRef.current, {
              type: "video/webm",
            });
            const file = new File([blob], `recorded_${Date.now()}.webm`, {
              type: "video/webm",
            });
            const formData = new FormData();
            formData.append("file", file);
            if (!roomId) return;
            formData.append("roomId", roomId);

            await uploadVideo(formData);

            // await axios.post(
            //   `http://${import.meta.env.VITE_RTC_API_URL_TMP}/v1/room-member/upload-video`,
            //   formData,
            //   {
            //     headers: {
            //       Authorization: `Bearer ${token}`,
            //     },
            //   }
            // );
          }
        } catch (err) {
          console.error("영상 업로드 실패:", err);
        } finally {
          resolve();
        }
      };

      // stop 호출 → onstop에서 업로드 진행
      rec.stop();
    });
  };

  const cleanUpMediaAndConnections = () => {
    // peer 제거
    peerManagerRef.current?.removeLocalTracks();

    // stream 중지
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // 모든 video의 srcObject 해제
    document.querySelectorAll("video").forEach((video) => {
      (video as HTMLVideoElement).srcObject = null;
    });

    setLocalStream(null);
    setParticipants((prev) => prev.filter((p) => p.id !== myIdRef.current));

    // webrtc 연결 종료
    peerManagerRef.current?.closeAllConnections?.();

    // websocket leave & 종료
    signalingRef.current?.send({ type: "leave", senderId: myIdRef.current });
    signalingRef.current?.close();
  };

  useEffect(() => {
    if (signalingRef.current) return;
    const userInfo = localStorage.getItem("auth-storage");
    const parsed = JSON.parse(userInfo!);
    const myId = parsed.state.UUID;
    myIdRef.current = myId;
  });

  const handleLeaveRoom = async () => {
    console.log("disconnection video", localStream);

    // 1) 녹화 중이면 정지 & 업로드 완료까지 대기
    await stopRecordingAndUpload();

    // 2) 미디어/연결 정리
    cleanUpMediaAndConnections();

    // 3) 페이지 이동
    navigate("/study");
  };

  useEffect(() => {
    if (signalingRef.current) return;

    const userInfo = localStorage.getItem("auth-storage") || "{}";
    const parsed = JSON.parse(userInfo);
    const myId = parsed?.state?.UUID || crypto.randomUUID();
    myIdRef.current = myId;

    const signaling = new SignalingClient(
      `wss://${import.meta.env.VITE_RTC_API_URL}/ws`,
      myId,
      async (data) => {
        // 테스트 용
        //const signaling = new SignalingClient(`ws://${import.meta.env.VITE_RTC_API_URL_TMP}/ws`, myId, async (data) => {
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

    peerManager.onRemoteStream = (peerId, stream) => {
      setParticipants((prev) => [
        ...prev.filter((p) => p.id !== peerId),
        { id: peerId, stream },
      ]);
    };

    (async () => {
      // QHD 타겟 제약(웹캠이 지원하는 범위 내에서 적용됨)
      const local = await navigator.mediaDevices.getUserMedia({
        video: {
          width:  { ideal: 960, max: 960 },
          height: { ideal: 540, max: 540 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: true,
      });

      setLocalStream(local);

      // 🎥 방 입장 시 녹화 시작
      startRecording(local);

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
      {/* 메인 콘텐츠 영역 - 푸터와 완전히 분리 */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full pt-[60px] px-4">
          {/* 포커스 모드일 때만 상단 썸네일 스트립 표시 */}
          {focusedUserId && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mt-13 mb-4">
              {participants
                .filter((p) => p.id !== focusedUserId)
                .slice(0, 5)
                .map((p) => (
                  <button
                    key={`thumb-${p.id}`}
                    onClick={() => setFocusedUserId(p.id)}
                    className="shrink-0 w-45 h-30 rounded-md overflow-hidden border border-gray-300 hover:border-gray-400 transition-all duration-200"
                    title={p.isLocal ? "나" : p.id}
                  >
                    <div className="w-full h-full bg-black/20 relative">
                      <VideoTile
                        stream={p.stream}
                        isLocal={p.isLocal}
                        userId={p.id}
                        roomId={roomId!}
                        userDocs={getParticipantDocs(p.id)}
                        onDocsClick={handleDocsClick}
                        hideOverlay
                      />
                    </div>
                  </button>
                ))}
              {/* 5명 초과 시 더보기 표시 (포커스된 유저 제외한 수 기준) */}
              {participants.filter((p) => p.id !== focusedUserId).length >
                5 && (
                <div className="shrink-0 w-45 h-30 rounded-md border border-gray-300 bg-gray-100 flex items-center justify-center text-sm text-gray-600">
                  +
                  {participants.filter((p) => p.id !== focusedUserId).length -
                    5}
                </div>
              )}
            </div>
          )}

          {/* 포커스 모드일 때: 왼쪽 포커스된 비디오 + 오른쪽 서류 */}
          {focusedUserId ? (
            <div className="flex gap-4 h-full">
              {/* 왼쪽: 포커스된 비디오 (화면의 절반) */}
              <div className="w-1/2 h-[68vh]">
                {participants
                  .filter((p) => p.id === focusedUserId)
                  .map((participant) => (
                    <div key={participant.id} className="w-full h-full">
                      <VideoTile
                        stream={participant.stream}
                        isLocal={participant.isLocal}
                        userId={participant.id}
                        roomId={roomId!}
                        userDocs={getParticipantDocs(participant.id)}
                        onDocsClick={handleDocsClick}
                      />
                    </div>
                  ))}
              </div>

              {/* 오른쪽: 서류 캐러셀 (화면의 절반) */}
              <div className="w-1/2 h-[68vh] bg-gray-50 rounded-lg overflow-hidden">
                <Carousel
                  items={getCarouselItems()}
                  onClose={handleCloseCarousel}
                />
              </div>
            </div>
          ) : (
            /* 일반 모드: 그리드 레이아웃 (참가자 수 기반 반응형) */
            <div
              className={`grid gap-4 h-full transition-[grid-template-columns] duration-300`}
              style={{
                gridTemplateColumns: `repeat(${getGridColumns(
                  participants.length
                )}, minmax(0, 1fr))`,
              }}
            >
              {participants.map(renderVideoTile)}
            </div>
          )}
        </div>
      </main>

      {/* 푸터 영역 - 메인 콘텐츠와 완전히 분리 */}
      <footer className="relative bg-white border-gray-200">
        {/* 컨트롤 패널 */}
        <div className="bg-blue-500/95 backdrop-blur-sm border-blue-600 py-3 shadow-lg">
          <div className="flex justify-center items-center gap-3">
            {/* 컨트롤 버튼들 */}
            <div className="rounded-full px-4 py-2 border bg-white/20 backdrop-blur-sm">
              <MicControlPanel stream={localStream} />
            </div>
            <div className="rounded-full px-4 py-2 border bg-white/20 backdrop-blur-sm">
              <CameraControlPanel stream={localStream} />
            </div>
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-2 shadow-md"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

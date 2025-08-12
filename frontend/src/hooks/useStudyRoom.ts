import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SignalingClient } from "@/lib/webrtc/SignallingClient";
import { PeerConnectionManager } from "@/lib/webrtc/PeerConnectionManager";
import { getDocsInRoom, uploadVideo } from "@/api/studyApi";

type Participant = {
  id: string;
  stream: MediaStream | null;
  isLocal?: boolean;
};

type ParticipantsDocs = {
  docsId: string;
  userId: string;
  fileUrl: string;
  docsStatus: string;
};

type DocItem = {
  id: string;
  title: string;
  fileUrl: string;
  type: "RESUME" | "COVERLETTER" | "PORTFOLIO";
};

export function useStudyRoom() {
  const navigate = useNavigate();
  const { roomId } = useParams();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [allDocs, setAllDocs] = useState<ParticipantsDocs[]>([]);
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const [showCarousel, setShowCarousel] = useState(false);

  const myIdRef = useRef<string>("");
  const peerManagerRef = useRef<PeerConnectionManager | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // 참가자별 서류 매핑 함수
  const getParticipantDocs = (participantId: string) => {
    console.log("getParticipantDocs 호출됨 - participantId:", participantId);
    console.log("allDocs:", allDocs);

    const filteredDocs = allDocs.filter((doc) => doc.userId === participantId);
    console.log("필터링된 서류:", filteredDocs);

    return filteredDocs;
  };

  // 서류 클릭 핸들러
  const handleDocsClick = (userId: string) => {
    console.log("서류 클릭됨:", userId);
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

  // 참가자 수에 따라 동적으로 그리드 열 개수 결정
  const getGridColumns = (count: number) => {
    if (count <= 2) return 2;
    if (count === 3) return 3;
    if (count === 4) return 2;
    if (count === 5) return 3;
    return 3;
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

  // 녹화 시작
  const startRecording = (stream: MediaStream) => {
    try {
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp9",
          videoBitsPerSecond: 3_000_000,
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

  // 녹화 정지 및 업로드
  const stopRecordingAndUpload = async () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") return;

    await new Promise<void>((resolve) => {
      rec.onstop = async () => {
        try {
          if (recordedChunksRef.current.length) {
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
          }
        } catch (err) {
          console.error("영상 업로드 실패:", err);
        } finally {
          resolve();
        }
      };

      rec.stop();
    });
  };

  // 미디어 및 연결 정리
  const cleanUpMediaAndConnections = () => {
    peerManagerRef.current?.removeLocalTracks();

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    document.querySelectorAll("video").forEach((video) => {
      (video as HTMLVideoElement).srcObject = null;
    });

    setLocalStream(null);
    setParticipants((prev) => prev.filter((p) => p.id !== myIdRef.current));

    peerManagerRef.current?.closeAllConnections?.();

    signalingRef.current?.send({ type: "leave", senderId: myIdRef.current });
    signalingRef.current?.close();
  };

  // 방 나가기
  const handleLeaveRoom = async () => {
    console.log("disconnection video", localStream);

    await stopRecordingAndUpload();
    cleanUpMediaAndConnections();
    navigate("/study");
  };

  // 스터디 방 참여자들의 서류 조회
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

  // WebRTC 연결 설정
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
        const peerManager = peerManagerRef.current;
        if (!peerManager) return;

        console.log("받은 메세지", data);

        if (data.type === "join") {
          await peerManager.createConnectionWith(data.senderId);

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
      const local = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 960, max: 960 },
          height: { ideal: 540, max: 540 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: true,
      });

      setLocalStream(local);
      startRecording(local);

      setParticipants((prev) => [
        ...prev.filter((p) => p.id !== myId),
        { id: myId, stream: local, isLocal: true },
      ]);
      peerManager.setLocalStream(local);
      signaling.send({ type: "join", senderId: myId });
    })();
  }, []);

  return {
    participants,
    localStream,
    focusedUserId,
    showCarousel,
    roomId,
    getParticipantDocs,
    handleDocsClick,
    handleCloseCarousel,
    getCarouselItems,
    getGridColumns,
    handleLeaveRoom,
    setFocusedUserId,
    setShowCarousel,
  };
}

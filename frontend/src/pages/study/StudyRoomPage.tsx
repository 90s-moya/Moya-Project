import CameraControlPanel from "@/components/study/CameraControlPanel";
import MicControlPanel from "@/components/study/MicControlPanel";
import VideoTile from "@/components/study/VideoTile";
import { useNavigate, useParams  } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { SignalingClient } from "@/lib/webrtc/SignallingClient";
import { PeerConnectionManager } from "@/lib/webrtc/PeerConnectionManager";
import axios from "axios";
import { uploadVideo } from "@/api/studyApi"; 

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
  const { roomId } = useParams();

  // 🎥 녹화 관련 ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

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

            const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
            const file = new File([blob], `recorded_${Date.now()}.webm`, { type: "video/webm" });
            const formData = new FormData();
            formData.append("file", file);
            if(!roomId) return; 
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
        const peerManager = peerManagerRef.current;
        if (!peerManager) return;

        console.log("받은 메세지", data);

        if (data.type === "join") {
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
      setParticipants((prev) => [
        ...prev.filter((p) => p.id !== peerId),
        { id: peerId, name: `참여자-${peerId.slice(0, 4)}`, stream },
      ]);
    };

    (async () => {
      // QHD 타겟 제약(웹캠이 지원하는 범위 내에서 적용됨)
      const local = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 2560, max: 2560 },
          height: { ideal: 1440, max: 1440 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: true,
      });

      setLocalStream(local);

      // 🎥 방 입장 시 녹화 시작
      startRecording(local);

      setParticipants((prev) => [
        ...prev.filter((p) => p.id !== myId),
        { id: myId, name: "나", stream: local, isLocal: true },
      ]);
      peerManager.setLocalStream(local);
      signaling.send({ type: "join", senderId: myId });
    })();
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#1b1c1f] flex flex-col">
      {/* 상단 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white border-b border-[#dedee4] h-[72px] flex items-center justify-center px-6 shadow-sm">
        <h1 className="text-xl font-semibold text-[#2b7fff]">모의 면접 스터디</h1>
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

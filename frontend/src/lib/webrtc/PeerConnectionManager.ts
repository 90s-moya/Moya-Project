import type { SignalMessage } from "../webrtc/SignallingClient";
import { SignalingClient } from "../webrtc/SignallingClient";

export class PeerConnectionManager {
  private localStream: MediaStream | null = null;
  private connections = new Map<string, RTCPeerConnection>();
  private remoteStreams = new Map<string, MediaStream>();

  constructor(
    private myId: string,
    private signaling: SignalingClient,
    public onRemoteStream: (
      peerId: string,
      stream: MediaStream
    ) => void = () => {}
  ) {}

  /**
   * 로컬 스트림을 설정하고 이후 피어 연결 시 트랙으로 사용됨
   */
  setLocalStream(stream: MediaStream) {
    this.localStream = stream;
  }

  /**
   * 외부에서 수신한 signaling 메시지를 처리
   */
  async handleSignal(msg: SignalMessage) {
    const { senderId, type, offer, answer, candidate } = msg;

    if (type === "join") {
      // 새 참가자가 입장 → 내가 initiator가 되어 연결 시작
      await this.createConnection(senderId, true);
    }

    if (type === "offer" && offer) {
      await this.createConnection(senderId, false); // 새 연결 수립 (내가 responder)
      const pc = this.connections.get(senderId);
      await pc?.setRemoteDescription(new RTCSessionDescription(offer));
      const answerDesc = await pc?.createAnswer();
      await pc?.setLocalDescription(answerDesc!);

      this.signaling.send({
        type: "answer",
        senderId: this.myId,
        targetId: senderId,
        answer: answerDesc!,
      });
    }

    if (type === "answer" && answer) {
      const pc = this.connections.get(senderId);
      await pc?.setRemoteDescription(new RTCSessionDescription(answer));
    }

    if (type === "ice" && candidate) {
      const pc = this.connections.get(senderId);
      await pc?.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  /**
   * 외부에서 직접 연결 시작을 요청하는 메서드 (initiator)
   */
  public async createConnectionWith(peerId: string) {
    await this.createConnection(peerId, true);
  }

  /**
   * 전체 연결 해제
   */
  public closeAllConnections() {
    for (const pc of this.connections.values()) {
      pc.close();
    }
    this.connections.clear();
  }

  removeConnection(peerId: string) {
    const pc = this.connections.get(peerId);
    if (pc) {
      pc.close();
      this.connections.delete(peerId);
      this.remoteStreams.delete(peerId);
    }
  }

  /**
   * 카메라 제거
   */
  public removeLocalTracks() {
    for (const pc of this.connections.values()) {
      pc.getSenders().forEach((sender) => {
        try {
          pc.removeTrack(sender); // 연결에서도 제거
          sender.track?.stop(); // 트랙 강제 중지
          console.log("트랙 제거 성공!!");
        } catch (e) {
          console.warn("트랙 제거 실패", e);
        }
      });
    }
  }

  /**
   * RTCPeerConnection 생성 및 트랙/이벤트 바인딩
   */
  private async createConnection(peerId: string, initiator: boolean) {
    if (this.connections.has(peerId)) return;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
      ],
      iceCandidatePoolSize: 10,
    });

    this.connections.set(peerId, pc);

    const remoteStream = new MediaStream();
    this.remoteStreams.set(peerId, remoteStream);

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      this.onRemoteStream(peerId, remoteStream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send({
          type: "ice",
          senderId: this.myId,
          targetId: peerId,
          candidate: event.candidate,
        });
      }
    };

    // 로컬 미디어 트랙 전송
    this.localStream?.getTracks().forEach((track) => {
      pc.addTrack(track, this.localStream!);
    });

    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.signaling.send({
        type: "offer",
        senderId: this.myId,
        targetId: peerId,
        offer,
      });
    }
  }
}

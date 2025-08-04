export interface SignalMessage {
  type: "offer" | "answer" | "ice" | "join";
  senderId: string;
  targetId?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export class SignalingClient {
  private ws: WebSocket;

  constructor(
    url: string,
    private myId: string,
    private onMessage: (data: SignalMessage) => void
  ) {
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
        console.log("🧠 WS 수신:", msg);
      if (msg.senderId !== this.myId) {
        this.onMessage(msg);
      }
    };
  }

  send(msg: SignalMessage) {
    this.ws.send(JSON.stringify(msg));
  }
}

export interface SignalMessage {
  type: "offer" | "answer" | "ice" | "join" | "leave";
  senderId: string;
  targetId?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export class SignalingClient {
  private ws: WebSocket;
  private isOpen = false;
  private queue: SignalMessage[] = [];

  constructor(
    url: string,
    private myId: string,
    private onMessage: (data: SignalMessage) => void
  ) {
    this.ws = new WebSocket(url);
    console.log("===========url확인====",url);
    
    this.ws.onopen = () => {
      this.isOpen = true;
      this.queue.forEach((msg) => this.send(msg));
      this.queue = [];
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
        console.log("WS 수신:", msg);
      if (msg.senderId !== this.myId) {
        this.onMessage(msg);
      }
    };
  }
  close(){
    this.ws?.close();
  }
  send(msg: SignalMessage) {
    if (this.isOpen && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      console.log("보냄", msg);
    } else {
      this.queue.push(msg);
      console.log("큐에 넣어버림", msg);
    }
  }
}

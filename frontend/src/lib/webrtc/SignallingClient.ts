export interface SignalMessage {
  type: "offer" | "answer" | "ice" | "join" | "leave";
  senderId: string;
  targetId?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  nickname?: string;
}

export class SignalingClient {
  private ws: WebSocket | null = null;
  private isOpen = false;
  private queue: SignalMessage[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1초

  constructor(
    private url: string,
    private myId: string,
    private onMessage: (data: SignalMessage) => void
  ) {
    this.connect();
  }

  private connect() {
    try {
      console.log("WebSocket 연결 시도...");
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("WebSocket 연결 성공");
        this.isOpen = true;
        this.reconnectAttempts = 0;

        // 대기 중인 메시지들 전송
        const queuedMessages = [...this.queue];
        this.queue = [];
        queuedMessages.forEach((msg) => this.send(msg));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log("WS 수신:", msg);
          if (msg.senderId !== this.myId) {
            this.onMessage(msg);
          }
        } catch (error) {
          console.error("메시지 파싱 오류:", error);
        }
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket 연결 종료:", event.code, event.reason);
        this.isOpen = false;

        // 정상적인 종료가 아닌 경우 재연결 시도
        if (
          event.code !== 1000 &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket 오류:", error);
        this.isOpen = false;
      };
    } catch (error) {
      console.error("WebSocket 생성 실패:", error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("최대 재연결 시도 횟수 초과");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 지수 백오프

    console.log(
      `${delay}ms 후 재연결 시도 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  close() {
    if (this.ws) {
      this.ws.close(1000); // 정상 종료 코드
      this.ws = null;
    }
    this.isOpen = false;
  }

  send(msg: SignalMessage) {
    if (this.isOpen && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
        console.log("보냄", msg);
      } catch (error) {
        console.error("메시지 전송 실패:", error);
        this.queue.push(msg);
      }
    } else {
      this.queue.push(msg);
      console.log("큐에 넣어버림", msg);

      // 연결이 끊어진 경우 재연결 시도
      if (!this.isOpen && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    }
  }
}

const serverUrl = "";

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.roomId = null;
    this.listeners = new Map();
  }

  // Socket 연결
  connect(serverUrl) {
    if (this.socket?.connected) {
      console.log("Socket already connected");
      return this.socket;
    }

    this.socket = io(serverUrl, {
      // transports: ['websocket', 'polling']: WebSocket과 HTTP 폴링 두 가지 전송 방식을 모두 사용하여 연결을 시도한다.
      // websocket: 양방향 통신을 지원하는 웹소켓 프로토콜을 사용하여 연결을 시도한다. (HTTP 폴링 방식보다 성능이 우수하다.)
      //  * 단일 영구 연결 (Persistent Connection): 초기 핸드셰이크(Handshake)를 통해 한 번 TCP 연결이 수립되면, 서버와의 통신이 끝날 때까지 이 연결을 지속적으로 유지한다.
      //  * 성능 우위: 매번 데이터를 보낼 때마다 연결을 새로 수립할 필요가 없으므로, 연결 수립 및 해제에 필요한 **시간 지연(Latency)**과 **자원 소모(CPU, 메모리)**가 거의 발생하지 않는다.
      // polling: WebSocket을 사용할 수 없을 때 Socket.IO가 대체(Fallback)로 사용하는 기술이며,
      // 실시간 통신을 흉내 내기 위해 HTTP 요청을 반복하는 방식이다.
      transports: ["websocket", "polling"],
      // reconnection: true: 연결이 끊어지면 자동으로 재연결을 시도한다.
      reconnection: true,
      // reconnectionDelay: 1000: 연결이 끊어지면 1초 후에 재연결을 시도한다.
      reconnectionDelay: 1000,
      // reconnectionAttempts: 5: 최대 5번의 재연결을 시도한다.
      reconnectionAttempts: 5,
    });

    this.setupDefaultListeners();
    return this.socket;
  }

  // 기본 이벤트 리스너 설정
  setupDefaultListeners() {
    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket.id);
      this.connected = true;
      this.emit("socket-connected", { socketId: this.socket.id });
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
      this.connected = false;
      this.emit("socket-disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.emit("socket-error", error);
    });
  }

  // 사용자 식별
  identify(userId) {
    if (this.socket) {
      this.socket.emit("identify", userId);
    }
  }

  // 룸 참가
  joinRoom(roomId, userId, username) {
    if (!this.socket) {
      console.error("Socket not connected");
      return;
    }

    this.roomId = roomId;
    this.socket.emit("join-room", { roomId, userId, username });
  }

  // 룸 나가기
  leaveRoom() {
    if (this.socket && this.roomId) {
      this.socket.emit("leave-room");
      this.roomId = null;
    }
  }

  IsInRoom() {
    // 소켓이 연결되어 있지 않거나 룸에 참가하지 않은 경우
    if (!this.socket || !this.roomId) {
      console.error("Not connected to a room");
      return false;
    }
    return true;
  }

  // 채팅 메시지 전송
  sendMessage(message, userId, username) {
    if (!this.IsInRoom()) return;

    this.socket.emit("chat-message", {
      roomId: this.roomId,
      message,
      userId,
      username,
    });
  }

  // 메모 생성
  createMemo(memo) {
    if (!this.IsInRoom()) return;

    this.socket.emit("memo-create", {
      roomId: this.roomId,
      memo,
    });
  }

  // 메모 수정
  updateMemo(memoId, updates) {
    if (!this.IsInRoom()) return;

    this.socket.emit("memo-update", {
      roomId: this.roomId,
      memoId,
      updates,
    });
  }

  // 메모 삭제
  deleteMemo(memoId) {
    if (!this.IsInRoom()) return;

    this.socket.emit("memo-delete", {
      roomId: this.roomId,
      memoId,
    });
  }

  // 타이핑 인디케이터: 현재 사용자가 타이핑 중인지 여부를 알리는 인디케이터
  startTyping(username) {
    if (this.socket && this.roomId) {
      this.socket.emit("typing-start", {
        roomId: this.roomId,
        username,
      });
    }
  }

  stopTyping(username) {
    if (this.socket && this.roomId) {
      this.socket.emit("typing-stop", {
        roomId: this.roomId,
        username,
      });
    }
  }

  // webRTC 시그널링
  sendOffer(to, offer) {
    if (this.socket) {
      this.socket.emit("webrtc-offer", { to, offer });
    }
  }

  sendAnswer(to, answer) {
    if (this.socket) {
      this.socket.emit("webrtc-answer", { to, answer });
    }
  }

  sendIceCandidate(to, candidate) {
    if (this.socket) {
      this.socket.emit("webrtc-ice-candidate", { to, candidate });
    }
  }

  /*
    socketService                    socket (Socket.IO)
    ┌─────────────────┐             ┌─────────────────┐
    │ on()            │             │ on()            │
    │ off()           │             │ off()           │
    │ disconnect()    │             │ disconnect()    │
    │                 │             │ emit()          │
    │ socket ────────────────────► │ (라이브러리)    │
    └─────────────────┘             └─────────────────┘
    우리가 만든 클래스              Socket.IO 라이브러리
    */

  // 이벤트 리스너 관리
  /*
        listeners는 Map 객체
        this.listeners = Map {
        'chat-message' => [callback1, callback2, callback3],  // 이벤트별 배열
        'user-joined'  => [callback4, callback5],             // 이벤트별 배열
        'memo-created' => [callback6]                         // 이벤트별 배열
        }

        - listeners = Map
        - key = 이벤트 이름 (문자열)
        - value = 해당 이벤트의 콜백 함수들 배열
    */

  // on(event, callback): 이벤트 리스너 등록
  // 리스너 추적을 용이하게 하기 위해 wrapper 함수를 사용한다.
  // SocketService의 on() 메서드
  on(event, callback) {
    if (!this.socket) {
      console.error("Socket not initialized");
      return;
    }

    // 이벤트 리스너 추적을 위해 맵에 이벤트 키를 추가한다.
    // 이벤트 키가 존재하지 않으면 빈 배열을 초기화한다.
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    /*
            socketService.on('chat-message', callback2);

            // 내부 동작
            'chat-message'는 이미 있으니 생성 안 함
            this.listeners.get('chat-message').push(callback2);
                        ↑↑↑↑↑↑↑↑↑↑↑↑↑       ↑↑↑↑↑↑↑↑↑↑
                        [callback1] 반환      callback2 추가

            // 결과
            this.listeners = Map {
            'chat-message' => [callback1, callback2]
            }
        */
    this.listeners.get(event).push(callback);

    // Socket.IO 객체의 on() 메서드 (다른 객체)
    this.socket.on(event, callback);
  }

  // off(event, callback): 이벤트 리스너 제거
  off(event, callback) {
    if (!this.socket) return;

    this.socket.off(event, callback);

    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        // splice(index, 1): index부터 1개의 요소를 제거한다.
        // 즉, index 위치의 요소를 제거한다.
        callbacks.splice(index, 1);
      }
    }
  }

  // 내부 이벤트 발생
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    // callbacks: [callback1, callback2, callback3]
    // forEach(callback): 배열의 각 요소에 대해 callback 함수를 실행한다.
    // callback: (callback1, callback2, callback3)
    // => callback1(data), callback2(data), callback3(data)
    // callback(data): callback 함수를 실행한다.
    // data: 이벤트에 전달할 데이터
    callbacks.forEach((callback) => callback(data));
  }

  // 연결 해제
  disconnect() {
    if (this.socket) {
      this.leaveRoom();

      /*
                // 1️⃣ 우리가 만든 추적용 (listeners)
                this.listeners = Map {
                    'chat-message' => [cb1, cb2, cb3]
                }

                // 2️⃣ Socket.IO 내부 (socket)
                this.socket = {
                    _callbacks: {  // Socket.IO 내부 구조
                        'chat-message': [cb1, cb2, cb3]
                    }
                }
            */

      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((callback) => {
          this.socket.off(event, callback); // Socket.IO 인스턴스의 리스너 제거
        });
      });
      // clear(): 맵의 모든 요소를 제거한다.
      this.listeners.clear(); // 리스너 맵 초기화

      this.socket.disconnect(); // Socket.IO 인스턴스 연결 해제
      this.socket = null;
      this.connected = false;
    }
  }

  // 연결 상태 확인
  isConnected() {
    // this.connected: SocketService 인스턴스의 connected 상태
    // this.socket?.connected: Socket.IO 인스턴스의 connected 상태
    // &&: 두 조건이 모두 참일 때만 참을 반환한다.
    return this.connected && this.socket?.connected;
  }

  // Socket ID 가져오기
  getSocketId() {
    return this.socket?.id;
  }
}

// Singleton 인스턴스 export
const socketService = new SocketService();
export default socketService;

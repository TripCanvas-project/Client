import socketService from '../services/socket.js';

const SERVER_URL = 'http://localhost:8080';

class Collaboration {
    constructor(options = {}) {
        this.options = options;
        this.roomId = null;
        this.userId = null; 
        this.username = null; // name
        this.isConnected = false;

        // 콜백 함수들
        this.onMemoReceived = options.onMemoReceived || (() => {});
        this.onMemoDeleted = options.onMemoDeleted || (() => {});
        this.onChatMessage = options.onChatMessage || (() => {});

        // UI 요소들
        this.chatContainer = document.querySelector(options.chatContainer || '#chat-messages');
        this.chatInput = document.querySelector(options.chatInput || '#chat-input')
        this.chatSendBtn = document.querySelector('#chat-send-btn');

        this.init();
    }

    init() {
        // 소켓 연결
        socketService.connect(SERVER_URL);

        // 이벤트 리스너 설정
        this.setupSocketListeners();
        this.setupUIListeners();
    }

    setupSocketListeners() {
        // 연결 성공
        socketService.on('socket-connected', ({ socketId }) => {
            console.log('Socket connected:', socketId);
            this.isConnected = true;
        });

        // 채팅 메시지 수신
        socketService.on('chat-message', (data) => {
            this.handleChatMessage(data);
        });

        // 메모
        socketService.on('memo-created', (memo) => {
            console.log('memo created:', memo);
            this.onMemoReceived(memo);
        });

        socketService.on('memo-updated', ({ memoId, memo }) => {
            console.log('memo updated:', memoId, memo);
            this.onMemoReceived(memo);
        })

        socketService.on('memo-deleted', ({ memoId }) => {
            console.log('memo deleted:', memoId);
            this.onMemoDeleted(memoId);
        });

        // 사용자 입장/퇴장
        socketService.on('user-joined', ({ socketId, username }) => {
            console.log(`${username} joined the room`);
            this.showSystemMessage(`${username}님이 참가했습니다.`);
        });

        socketService.on('user-left', ({ socketId, username }) => {
            console.log(`${username} left the room`);
            this.showSystemMessage(`${username}님이 퇴장했습니다.`);
        });

        // 타이핑 인디게이터
        socketService.on('user-typing', ({ username }) => {
            console.log(`${username} is typing...`);
        });
    }

    setupUIListeners() {
        // 채팅 전송 버튼
        if (this.chatSendBtn) {
            this.chatSendBtn.addEventListener('click', () => {
                this.sendChatMessage();
            });
        }

        // 엔터키로 전송
        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            })
        }
    }

    // 룸 참가
    joinRoom(roomId, userId, username) {
        this.roomId = roomId;
        this.userId = userId;
        this.username = username;

        if (socketService.isConnected()) {
            socketService.joinRoom(roomId, userId, username);
            console.log(`Joined room: ${roomId}`);

            // 채팅 기록 불러오기
            this.loadChatHistory(roomId);
        } else {
            // 연결될 때까지 대기
            setTimeout(() => this.joinRoom(roomId, userId, username), 500);
        }
    }

    // 채팅 기록 불러오기
    async loadChatHistory(tripId) {
        try {
            const response = await fetch(`${SERVER_URL}/chat/${tripId}`);
            if (!response.ok) {
                throw new Error(`Failed to load chat history: ${response.status}`)
            }

            const messages = await response.json();

            // 기존 메시지 표시
            messages.forEach(msg => {
                this.displayChatMessage(msg.username, msg.message, msg.timestamp);
            });

            console.log(`Loaded ${messages.length} chat messages from server`);
        } catch (error) {
            console.error('Failed to load chat history', error);
        }
    }

    // 채팅 메시지 전송
    async sendChatMessage() {
        const message = this.chatInput?.value.trim();
        if (!message) return;

        // 즉시 화면에 표시
        this.displayChatMessage(this.username, message, Date.now());

        // 서버에 저장
        try {
            await fetch(`${SERVER_URL}/chat`, {
                method: 'Post',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tripId: this.roomId,
                    username: this.username,
                    message: message,
                    timestamp
                })
            });

            console.log('Chat message saved to server');
        } catch (error) {
            console.error('Failed to save chat message', error);
        }

        // Socket으로 전송
        socketService.sendMessage(message, this.userId, this.username);
        this.chatInput.value = '';
    }

    // 채팅 메시지 처리
    handleChatMessage(data) {
        const { username, message, timestamp } = data;
        this.displayChatMessage(username, message, timestamp);
        this.onChatMessage(data);
    }

    // 채팅 메시지 표시
    displayChatMessage(username, message, timestamp) {
        if (!this.chatContainer) return;

        const messageId = `${username}-${message}-${timestamp}`;
        if (this.chatContainer.querySelector(`[data-message-id="${messageId}"]`)) {
            console.log('⚠️ 중복 메시지 무시:', messageId);
            return;
        }

        // Placeholder 제거
        const placeholder = this.chatContainer.querySelector('.chat-placeholder');
        if (placeholder) {
          placeholder.remove();
        }

        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        messageEl.setAttribute('data-message-id', messageId); 

        const isMe = username === this.username;
        const displayName = isMe ? '나' : username;

        const timeStr = new Date(timestamp).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
        })

        messageEl.innerHTML = `
        <div class='message-author'>${displayName}</div>
        <div class='message-text'>${this.escapeHtml(message)}</div>
        <div class='message-time'>${timeStr}</div>
        `;

        this.chatContainer.appendChild(messageEl);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    // 시스템 메시지 표시
    showSystemMessage(message) {
        if (!this.chatContainer) return;

        const messageEl = document.createElement('div');
        messageEl.className = 'message system-message';
        messageEl.style.background = '#f3f4f6';
        messageEl.style.textAlign = 'center';
        messageEl.style.fontSize = '13px';
        messageEl.style.color = '#6b7280';
        messageEl.innerHTML = `<div>${this.escapeHtml(message)}</div>`;

        this.chatContainer.appendChild(messageEl);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }   

    // 메모 전송
    sendMemo(memo) {
        socketService.createMemo(memo);
    }

    // 메모 삭제 전송
    deleteMemo(memoId) {
        socketService.deleteMemo(memoId);
    }

    // HTML 이스케이프
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 연결 해제
    disconnect() {
        socketService.leaveRoom();
        socketService.disconnect();
        this.isConnected = false;
    }
}

export default Collaboration;
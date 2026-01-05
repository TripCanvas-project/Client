import socketService from "./socket.js";

/*
    // RTCPeerConnection 내부 구조
    RTCPeerConnection {
        localDescription: RTCSessionDescription,   // 내 연결 정보
        remoteDescription: RTCSessionDescription,  // 상대방 연결 정보
        connectionState: 'new',                    // 연결 상태
        iceConnectionState: 'new',                 // ICE 상태
        signalingState: 'stable',                  // 시그널링 상태
    
        // 메서드
        addTrack: ƒ,           // 비디오/오디오 추가
        createOffer: ƒ,        // Offer 생성
        createAnswer: ƒ,       // Answer 생성
        setLocalDescription: ƒ,
        setRemoteDescription: ƒ,
        addIceCandidate: ƒ,
        close: ƒ,
    
        // 이벤트 핸들러
        ontrack: null,
        onicecandidate: null,
        onconnectionstatechange: null,
        ...
    }

    // 실제 사용 예시
    // P2P 통신 시, A와 B가 화상 통화하려면

        // A: Peer Connection 생성
        const pcA = new RTCPeerConnection(config);

        // B: Peer Connection 생성  
        const pcB = new RTCPeerConnection(config);

        // A: 카메라 추가
        pcA.addTrack(videoTrack, streamA);

        // B: 카메라 추가
        pcB.addTrack(videoTrack, streamB);

        // A: Offer 생성 → 서버 → B
        const offer = await pcA.createOffer();
        await pcA.setLocalDescription(offer);
        socket.emit('offer', offer);  // 서버로

        // B: Offer 받고 Answer 생성 → 서버 → A
        await pcB.setRemoteDescription(offer);
        const answer = await pcB.createAnswer();
        await pcB.setLocalDescription(answer);
        socket.emit('answer', answer);  // 서버로

        // A: Answer 받기
        await pcA.setRemoteDescription(answer);

        // 연결 완료, P2P 직접 통신 시작
        // pcA ←----------→ pcB

    // 여러명과 통화 (N:N 통신)
        // 나 (Me)
        const peerConnections = new Map();

        // A와 연결
        const pcA = new RTCPeerConnection(config);
        peerConnections.set('socketId_A', pcA);

        // B와 연결
        const pcB = new RTCPeerConnection(config);
        peerConnections.set('socketId_B', pcB);

        // C와 연결
        const pcC = new RTCPeerConnection(config);
        peerConnections.set('socketId_C', pcC);

        // 각각 독립적인 P2P 연결!
        Me ←→ A
        Me ←→ B  
        Me ←→ C
*/

class WebRTCService {
    constructor() {
        this.peerConnections = new Map(); // 여러명과 통화 (N:N 통신), 각자 독립적인 P2P 연결, Key-Value로 빠른 검색
        this.localStream = null; // 내 카메라/마이크 스트림
        this.remoteStreams = new Map(); // 각 참가자의 카메라/마이크 스트림
        // 고속 채팅/화면 공유 중 텍스트 전송/대용량 파일/실시간 격투 게임: WebRTC Data Channel이 압도적으로 유리
        this.dataChannels = new Map(); // 데이터 채널, 파일 전송, 메시지 전송 등, WebRTC로 직접 텍스트 전송 가능(선택사항), Socket.IO보다 빠른 P2P 메시지
        this.eventCallbacks = new Map(); // 이벤트 핸들러 (Socket 서비스처럼 이벤트 리스너 추적), cleanup 용이

        // STUN/TURN 서버 설정
        this.configuration = {
            iceServers: [
                // Google STUN 서버 (Google이 공개적으로 제공, Google 인프라로 안정적, 여러 서버 시도 가능)
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                // TURN 서버 필요시
                // {
                //     urls: 'turn:your-turn-server.com:3478',
                //     username: 'username', // TURN 서버 계정
                //     credential: 'password', // TURN 서버 비밀번호
                // }
            ]
        }
    }

    // WebRTC 초기화
    async initalize() {
        this.setupSignalingListeners();
    }

    // 시그널링 리스너 설정
    setupSignalingListeners() {
        // from: 소켓 ID, fromUsername: 사용자 이름, offer: Offer 정보
        socketService.on('webrtc-offer', async ({ from, fromUsername, offer }) => {
            console.log('Received offer from', from);
            await this.handleOffer(from, fromUsername, offer);
        })

        // Answer 수신
        socketService.on('webrtc-answer', async ({ from, answer }) => {
            console.log('Received answer from:', from);
            await this.handleAnswer(from, answer);
        })

        // ICE Candidate 수신
        socketService.on('webrtc-ice-candidate', async ({ from, candidate }) => {
            console.log('Received ICE candidate from:', from);
            await this.handleIceCandidate(from, candidate);
        })

        // 사용자 참가 - P2P 연결 시작
        socketService.on('user-joined', async ({ socketId, username }) => {
            console.log('User joined, initiating peer connection:', username);
            await this.createPeerConnection(socketId, username, true);
        })

        // 사용자 퇴장 - 연결 종료
        socketService.on('user-left', async ({ socketId }) => {
            console.log('User left, closing connection:', socketId);
            this.closePeerConnection(socketId);
        });
    }

    // 카메라/마이크 접근
    async getUserMedia(constraints = { video: true, audio: true}) {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Got local stream:', this.localStream);
            this.emit('local-stream', this.localStream);
            return this.localStream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            throw error;
        }
    }

    // 미디어 스트림 중지
    stopUserMedia() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
            this.emit('local-stream-stopped');
        }
    }

    // 비디오 on/off
    toggleVideo(enabled) {
         // getVideoTracks()
            // [MediaStreamTrack]  ← 배열, 길이 1
            // [
            //   {
            //     kind: 'video',
            //     label: 'FaceTime HD Camera',
            //     enabled: true,
            //     muted: false,
            //     readyState: 'live'
            //   }
            // ]
        // 보통 카메라 한대만 사용하기에 get.videoTracks()[0] 사용
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = enabled;
                return videoTrack.enabled;
            }
        }
        return false;
    }

    // 오디오 on/off
    toggleAudio(enabled) {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = enabled;
                return audioTrack.enabled;
            }
        }
        return false;
    }

    // Peer 연결 생성
    // peerId: 소켓 ID, username: 사용자 이름, initiator: 초기 연결 여부
    async createPeerConnection(peerId, username, initiator = false) {
        if (this.peerConnections.has(peerId)) {
            console.log('Peer connection already exists:', peerId);
            return this.peerConnections.get(peerId);
        }

        // RTCPeerConnection(): 새로운 Peer Connection 생성
        // this.configuration: STUN/TURN 서버 설정
        const peerConnection = new RTCPeerConnection(this.configuration)
        this.peerConnections.set(peerId, peerConnection);

        // 로컬 스트림 추가
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            })
        }

        // Data Channel 생성 (텍스트 메시징용, 선택사항)
        if (initiator) {
            const dataChannel = peerConnection.createDataChannel('chat');
            this.setupDataChannel(peerId, dataChannel);
        };

        // ICE Candidate 수집
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate to:', peerId);
                socketService.sendIceCandidate(peerId, event.candidate);
            }
        };

        // 원격 스트림 수신
        peerConnection.ontrack = (event) => {
            console.log('Received remote stream from:', peerId);
            const [remoteStream] = event.streams;
            this.remoteStreams.set(peerId, remoteStream);
            this.emit('remote-stream', { peerId, username, stream: remoteStream })
        };

        // Data Channel 수신
        peerConnection.ondatachannel = (event) => {
            this.setupDataChannel(peerId, event.channel)
        }

        // 연결 상태 변경
        // new: 연결 시작 전, connecting: 연결 시도 중, connected: 연결 성공, failed: 연결 실패, disconnected: 연결 끊김, closed: 연결 종료
        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', peerConnection.connectionState);
            this.emit('connection-state-change', {
                peerId, 
                state: peerConnection.connectionState
            });

            if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
                this.closePeerConnection(peerId);
            }
        }

        // Initiator가 Offer 생성
        if (initiator) {
            try {
                const offer = await peerConnection.createOffer();
                // setLocalDescription(offer): createOffer()로 생성한 Offer를 로컬에 설정, 이후 상대방에게 전송
                await peerConnection.setLocalDescription(offer);
                socketService.sendOffer(peerId, offer);
                console.log('Sent offer to:', peerId);;
            } catch (error) {
                console.error('Error creating offer:', error);
            }
        }
        
        return peerConnection;
    }

    // Offer 처리
    async handleOffer(peerId, username, offer) {
        const peerConnection = await this.createPeerConnection(peerId, username, false);

        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socketService.sendAnswer(peerId, answer);
            console.log('Sent answer to:', peerId);            
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }

    // Answer 처리
    async handleAnswer(peerId, answer) {
        const peerConnection = this.peerConnections.get(peerId);
        if (!peerConnection) {
            console.error('No peer connection found for:', peerId);
            return;
        }

        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('Set remote description for:', peerId);
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    // ICE Candidate 처리
    async handleIceCandidate(peerId, candidate) {
        const peerConnection = this.peerConnections.get(peerId);
        if (!peerConnection) {
            console.error('No peer connection found for:', peerId);
            return;
        }

        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('Added ICE candidate to:', peerId);
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    // DataChannel 설정
    setupDataChannel(peerId, channel) {
        this.dataChannels.set(peerId, channel);

        channel.onopen = () => {
            console.log('Data channel opened with:', peerId);
            this.emit('data-channel-open', { peerId });
        };

        channel.onclose = () => {
            console.log('Data channel closed with:', peerId);
            this.dataChannels.delete(peerId);
        }

        channel.onmessage = (event) => {
            console.log('Data channel message from:', peerId, event.data);
            this.emit('data-channel-message', { peerId, data: event.data })
        };
    }

    // DataChannel 메시지 전송
    sendDataChannelMessage(peerId, message) {
        const channel = this.dataChannels.get(peerId);
        if (channel && channel.readyState === 'open') {
            channel.send(message);
            return true;
        }
        return false;
    }

    // Peer 연결 종료
    closePeerConnection(peerId) {
        const peerConnection = this.peerConnections.get(peerId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(peerId);
        }

        const dataChannel = this.dataChannels.get(peerId);
        if (dataChannel) {
            dataChannel.close();
            this.dataChannels.delete(peerId);
        }

        const remoteStream = this.remoteStreams.get(peerId);
        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop());
            this.remoteStreams.delete(peerId);
        }

        this.emit('peer-disconnected', { peerId });
    }

    // 모든 연결 종료
    closeAllConnections() {
        // 모든 P2P 연결 종료
        // this.peerConnections = Map {
        // 'user1' => RTCPeerConnection { ... },
        // 'user2' => RTCPeerConnection { ... },
        // 'user3' => RTCPeerConnection { ... }
        // }
        this.peerConnections.forEach((_, peerId) => {
            this.closePeerConnection(peerId);
        })
        // 미디어 스트림 중지
        this.stopUserMedia();
    }

    // 이벤트 리스너 관리
    on(event, callback) {
        if (!this.eventCallbacks.has(event)) {
            this.eventCallbacks.set(event, []);
        }
        this.eventCallbacks.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventCallbacks.has(event)) {
            const callbacks = this.eventCallbacks.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        const callbacks = this.eventCallbacks.get(event) || [];
        callbacks.forEach(callback => callback(data));
    }
    
    // 원격 스트림 가져오기
    getRemoteStream(peerId) {
        return this.remoteStreams.get(peerId);
    }

    getAllRemoteStreams() {
        return Array.from(this.remoteStreams.entries()).map(([peerId, stream]) => ({
            peerId,
            stream
        }))
    }
}

const webrtcService = new WebRTCService();
export default webrtcService;
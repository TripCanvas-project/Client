import webrtcService from "../../src/services/webrtc";
import socketService from "../../src/services/socket";

class VideoChat {
    constructor(options = {}) {
        this.options = options;
        this.container = document.querySelector(options.container || '.video-grid');
        this.controls = document.querySelector(options.controls || '.video-controls');

        this.isVideoEnabled = false;
        this.isAudioEnabled = false;
        this.isInCall = false;

        this.init();
    }

    init() {
        // WebRTC 초기화
        webrtcService.initalize();

        // 이벤트 리스너 설정
        this.setupWebRTCListeners();
        this.setupControlListeners();
    }

    setupWebRTCListeners() {
        // 로컬 스트림 획득
        webrtcService.on('local-stream', (stream) => {
            console.log('Got local stream');
            this.displayLocalStream(stream);
        })

        // 원격 스트림 수신
        webrtcService.on('remote-stream', ({ peerId, username, stream }) => {
            console.log('Got remote stream from:', username);
            this.displayRemoteStream(peerId, username, stream);  
        })

        // Peer 연결 해제
        webrtcService.on('peer-disconnected', ({ peerId }) => {
            console.log('Peer disconnected:', peerId);
            this.removeVideoTile(peerId);
        })
    }

    setupControlListeners() {
        if (!this.controls) return;

        const buttons = this.controls.querySelectorAll('.video-control-btn');
        buttons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                switch(index) {
                    case 0: // 마이크
                        this.toggleAudio();
                        break;
                    case 1: // 카메라
                        this.toggleVideo();
                        break;
                    case 2: // 화면 공유
                        this.toggleScreenShare();
                        break;
                    case 3: // 통화 종료
                        this.endCall();
                        break;
                }
            })
        })
    }

    // 통화 시작
    async startCall() {
        if (this.isInCall) return;

        try {
            // 카메라/마이크 권한 요청
            await webrtcService.getUserMedia({ video: true, audio: true});

            this.isVideoEnabled = true;
            this.isAudioEnabled = true;
            this.isInCall = true;

            console.log('Call started');
        } catch (error) {
            console.error('Failed to start call:', error);
            alert('카메라/마이크 권한을 허용해주세요.');
        }
    }

    // 로컬 스트림 표시(자신)
    displayLocalStream(stream) {
        if (!this.container) return;

        // 기존 로컬 비디오 제거
        const existingLocal = this.container.querySelector('[data-peer-id="local"]');
        if (existingLocal) {
            existingLocal.remove();
        }

        const videoTile = document.createElement('div');
        videoTile.className = 'video-tile';
        videoTile.setAttribute('data-peer-id', 'local');

        const video = document.createElement('video');
        video.autoplay = true; // 영상 즉시 재생
        video.playsInline = true; // 브라우저 내에서 재생
        video.muted = true; // 로컬은 음소거(자신의 목소리로 오디오 하울링 발생하기 때문)
        video.srcObject = stream; // MediaStream 객체를 비디오 소스로 직접 연결
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';

        const nameTag = document.createElement('div');
        nameTag.className = 'video-name';
        nameTag.textContent = '나';

        videoTile.appendChild(video);
        videoTile.appendChild(nameTag);
        this.container.appendChild(videoTile);
    }

    // 원격 스트림 표시(상대방)
    displayRemoteStream(peerId, username, stream) {
        if (!this.container) return;

        // 기존 비디오 타일 제거
        this.removeVideoTile(peerId);

        const videoTile = document.createElement('div');
        videoTile.className = 'video-name';
        videoTile.setAttribute('data-peer-id', peerId);

        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = stream;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover;'

        const nameTag = document.createElement('div');
        nameTag.className = 'video-name';
        nameTag.textContent = username;

        videoTile.appendChild(video);
        videoTile.appendChild(nameTag);
        this.container.appendChild(videoTile);
    }

    // 비디오 타일 제거
    removeVideoTile(peerId) {
        const 
    }
}
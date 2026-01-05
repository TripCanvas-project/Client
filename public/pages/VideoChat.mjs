import webrtcService from '../services/webrtc.js';
import socketService from '../services/socket.js';

class VideoChat {
    constructor(options = {}) {
        this.options = options;
        this.container = document.querySelector(options.container || '.video-grid');
        this.controls = document.querySelector(options.controls || '.video-controls');

        this.isVideoEnabled = false;
        this.isAudioEnabled = false;
        this.isInCall = false;

        this.screenStream = null; // 화면 공유 스트림 추가
        this.isScreenSharing = false; // 화면 공유 상태 추가

        this.init();
        window.videoChat = this; // [중요] Service에서 상태를 확인할 수 있도록 전역 할당
    }

    init() {
        console.log('VideoChat init:', {
            container: this.container,
            controls: this.controls
        });
        
        if (!this.controls) {
            console.error('❌ .video-controls를 찾을 수 없습니다!');
            return;
        }

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

        // Placeholder 제거
        const placeholder = this.container.querySelector('.video-placeholder');
        if (placeholder) {
          placeholder.remove();
        }

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
        videoTile.className = 'video-tile';
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
        const tile = this.container?.querySelector(`[data-peer-id="${peerId}"]`);
        if (tile) {
            tile.remove();
        }
    }

    // 비디오 on/off
    toggleVideo() {
        if (!this.isInCall) {
            this.startCall();
            return;
        }

        this.isVideoEnabled = !this.isVideoEnabled;
        webrtcService.toggleVideo(this.isVideoEnabled);

        const buttons = this.controls?.querySelectorAll('.video-control-btn');
        const btn = buttons ? buttons[1] : null;

        if (btn) {
            btn.style.background = this.isVideoEnabled ? '#475569' : '#ef4444'
        }

        console.log('Video:', this.isVideoEnabled ? 'ON' : 'OFF');
    }

    // 오디오 on/off
    toggleAudio() {
        if (!this.isInCall) {
            this.startCall();
            return;
        }

        this.isAudioEnabled = !this.isAudioEnabled;
        webrtcService.toggleAudio(this.isAudioEnabled);

        const btn = this.controls?.querySelector('.video-control-btn')[0];
        if (btn) {
            btn.style.background = this.isAudioEnabled ? '#475569' : '#ef4444';
        }

        console.log('Audio:', this.isAudioEnabled ? 'ON' : 'OFF');
    }

    // 화면 공유 토글
    async toggleScreenShare() {
        if (!this.isInCall) {
            alert('먼저 통화를 시작해주세요.')
            return;
        }

        if (this.isScreenSharing) {
            // 화면 공유 중지
            this.stopScreenShare();
        } else {
            // 화면 공유 시작
            await this.startScreenShare();
        }
    }

    // 화면 공유 시작
    async startScreenShare() {
        try {
            // 화면 캡처 요청
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always', // 마우스 커서 표시
                    displaySurface: 'monitor' // 전체 화면, 창, 탭 선택 가능 
                },
                audio: false // 시스템 오디오는 선택사항
            });

            console.log('Screen share started');
            this.isScreenSharing = true;

            // 화면 공유 스트림 표시
            this.displayScreenStream(this.screenStream);

            // 화면 공유 스트림을 모든 Peer에게 전송
            this.replaceVideoTrack(this.screenStream);

            // 화면 공유 종료 감지 (사용자가 '공유 중지' 버튼 클릭)
            this.screenStream.getVideoTracks()[0].onended = () => {
                console.log('Screen sharing');
                this.stopScreenShare();
            }

            // 버튼 스타일 변경
            const btn = this.controls?.querySelectorAll('.video-control-btn')[2];
            if (btn) {
                btn.style.background = '#10b981' // 초록색
                btn.textContent = '🖥️'
            }
        } catch (error) {
            console.error('Failed to start screen share:', error);

            if (error.name === 'NotAllowedError') {
                alert('화면 공유 권한이 거부되었습니다.')
            } else if (error.name === 'NotFoundError') {
                alert('공유할 화면을 찾을 수 없습니다.')
            } else {
                alert('화면 공유를 시작할 수 없습니다: ' + error.message);
            }
        }
    }

    // 화면 공유 중지
    stopScreenShare() {
        if (this.screenStream) {
            // 화면 공유 스트림 중지
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }

        this.isScreenSharing = false;

        // 원래 카메라로 복귀
        if (webrtcService.localStream) {
            this.replaceVideoTrack(webrtcService.localStream);
            this.displayLocalStream(webrtcService.localStream);
        }

        // 버튼 스타일 복원
        const btn = this.controls?.querySelectorAll('.video-control-btn')[2];
        if (btn) {
            btn.style.background = '#475569'
            btn.textContent = '🖥️';
        }
        console.log('Screen sharing stopped');
    }

    // 화면 공유 스트림 표시
    displayScreenStream(stream) {
        if (!this.container) return;

        // 로컬 비디오 타일 찾기
        const localTile = this.container.querySelector('[data-peer-id="local"]');
        if (!localTile) return;

        const video = localTile.querySelector('video');
        // srcObject
        if (video) {
            video.srcObject = stream;
        }

        // 이름 태그 업데이트
        const nameTag = localTile.querySelector('.video-name');
        if (nameTag) {
            nameTag.textContent = '나 (화면 공유 중)';
        }
    }

    // 비디오 트랙 교체 (모든 Peer에게)
    replaceVideoTrack(stream) {
        const videoTrack = stream.getVideoTracks()[0];

        // 모든 Peer Connection의 비디오 트랙 교체
        // pc: PeerConnection 객체, peerId: 피어 ID
        webrtcService.peerConnections.forEach((pc, peerId) => {
            const sender = pc.getSenders().find(sender => sender.track?.kind === 'video');
            if (sender) {
                sender.replaceTrack(videoTrack)
                    .then(() => {
                        console.log(`Video track replaced for peer ${peerId}`);                        
                    })
                    .catch(error => {
                        console.error(`Failed to replace video track for peer ${peerId}: ${error.message}`);
                    })
            }
        })
    }

    // 통화 종료
    endCall() {
        if (!this.isInCall) return;

        if (confirm('통화를 종료하시겠습니까?')) {
            // 화면 공유 중이면 중지
            if (this.isScreenSharing) {
                this.stopScreenShare();
            }

            webrtcService.closeAllConnections();

            // 모든 비디오 타일 제거
            if (this.container) {
                this.container.innerHTML = '';

                // Placeholder 다시 추가
                const placeholder = document.createElement('div');
                placeholder.className = 'video-placeholder';
                placeholder.style.cssText = `
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 60px 20px;
                    color: white;
                    background: #334155;
                    border-radius: 8px;
                    margin: 8px;
                `;
                placeholder.innerHTML = `
                    <div style="font-size: 48px; margin-bottom: 16px">📹</div>
                    <div style="font-size: 16px; margin-bottom: 8px">
                        화상 채팅이 시작되지 않았습니다
                    </div>
                    <div style="font-size: 13px; opacity: 0.7">
                        카메라 버튼(📹)을 눌러 통화를 시작하세요
                    </div>
                `;
                this.container.appendChild(placeholder);
            }

            this.isVideoEnabled = false;
            this.isAudioEnabled = false;
            this.isInCall = false;

            console.log('Call ended');
        }
    }
}

export default VideoChat;
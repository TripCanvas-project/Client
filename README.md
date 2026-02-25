## TripCanvas Client

AI 기반 여행 플래너 **TripCanvas**의 프론트엔드입니다.  
카카오맵 위에서 AI가 생성한 여행 경로를 확인하고, 여행 멤버들과 함께 메모·채팅·화상 통화로 협업할 수 있습니다.

![](./upload/Screenshot%202026-02-25%20at%209.48.39 AM.png)

### 주요 기능

- **AI 여행 경로 시각화**
  - 출발지·도착지·여행 기간을 입력하면 서버의 AI가 생성한 경로를 카카오맵 위에 표시
  - 경로/일정 탭에서 일자별 방문 순서, 장소 정보 확인

- **메모 & 하이라이트**
  - 지도 위에 자유롭게 그릴 수 있는 **펜/하이라이터 메모**
  - 클릭 한 번으로 생성되는 **포스트잇 스타일 텍스트 메모** (드래그 이동, 내용 수정, 삭제)
  - 메모는 특정 여행(`tripId`)에 연결되며, 서버 DB에 저장되어 새로고침 후에도 유지

- **실시간 협업 (채팅·화상)**
  - 여행 방(Trip 단위)별 텍스트 채팅
  - WebRTC 기반 화상 채팅 (Socket.IO를 통한 시그널링)
  - 동일한 여행 방에 접속한 사용자끼리 메모와 채팅이 실시간 동기화

- **여행 관리 & 대시보드**
  - 내 여행 목록, 진행 상태(준비 중 / 진행 중 / 완료 등) 및 통계 표시
  - “새 여행 생성” 버튼으로 새로운 계획을 시작하고 메인 화면으로 이동

- **버킷리스트 & 프로필**
  - 가고 싶은 여행지/활동을 버킷리스트로 관리
  - 로그인/회원가입, 프로필 정보 및 프로필 이미지 관리

### 기술 스택

- **언어/런타임**
  - HTML5 / CSS3
  - JavaScript (ES Modules)

- **주요 라이브러리 & API**
  - [카카오맵 JavaScript API](https://apis.map.kakao.com/) – 지도, 마커, 좌표 변환
  - [Socket.IO Client](https://socket.io/docs/v4/client-api/) – 실시간 채팅, 메모, 화상 시그널링
  - WebRTC – 화상 채팅 미디어 스트림
  - Fetch API – 로그인·여행·경로·메모·채팅 등 REST API 호출

- **특징**
  - 번들러 없이 **정적 파일 + ESM** 구조
  - 정식 환경에서는 Server(Express)가 `Client/public`을 정적 파일로 서빙

### 폴더 구조

```text
Client/
├── README.md
└── public/
    ├── index.html              # 랜딩/인트로 진입
    ├── intro.html              # 마케팅/소개 페이지
    ├── login.html              # 로그인
    ├── signup.html             # 회원가입
    ├── dashboard.html          # 대시보드 (내 여행 목록/통계)
    ├── main.html               # 메인 (지도 · 경로 · 메모 · 채팅 · 화상)
    ├── bucketlist.html         # 버킷리스트
    ├── profile.html            # 프로필
    ├── template.html           # 템플릿 기반 화면
    ├── detail.html             # 상세 화면
    ├── invite-bridge.html      # 초대 링크 브리지
    ├── navbar.html             # 상단 공통 네비게이션
    │
    ├── pages/                  # 페이지별 JS 모듈
    │   ├── Main.mjs            # 메인 지도/캔버스/경로/메모/협업 로직
    │   ├── Dashboard.mjs       # 대시보드
    │   ├── Login.mjs           # 로그인
    │   ├── Signup.mjs          # 회원가입
    │   ├── Bucketlist.mjs      # 버킷리스트
    │   ├── Profile.mjs         # 프로필
    │   ├── Landing.mjs         # 랜딩 페이지용 스크립트
    │   ├── Intro.mjs           # intro.html 전용 스크립트
    │   ├── Collaboration.mjs   # 채팅/메모 실시간 협업
    │   ├── VideoChat.mjs       # 화상 채팅 화면 제어
    │   ├── Template.mjs        # 템플릿 화면
    │   ├── Createtamplete.mjs  # 사용자 템플릿 생성
    │   └── NavbarUserInfo.js   # 네비게이션 사용자 정보 표시
    │
    ├── services/
    │   ├── socket.js           # Socket.IO 클라이언트 래퍼
    │   └── webrtc.js           # WebRTC 시그널링/미디어 제어
    │
    ├── utils/
    │   └── navbar.js           # 공통 네비게이션 로딩
    │
    └── styles/                 # 스타일 시트
        ├── main.css            # 메인(지도·사이드바·메모·화상 등)
        ├── dashboard.css
        ├── login.css
        ├── signup.css
        ├── bucketlist.css
        ├── profile.css
        ├── intro.css
        ├── detail.css
        └── template.css
```

### 서버 연동 개요

- 프론트엔드는 기본적으로 서버의 REST API 및 Socket.IO 서버와 통신합니다.
- 주요 연동 포인트:
  - **인증**: 로그인/회원가입 시 JWT 발급 → `localStorage` 등에 저장 후 `Authorization: Bearer <token>` 헤더로 사용
  - **AI 경로 생성**: `main.html`에서 출발지·도착지·기간 등을 입력 후 `/plan/generate` 호출
  - **여행/경로/메모/채팅**: `tripId`를 기준으로 `/trip`, `/route`, `/memo`, `/chat` 등의 엔드포인트와 통신
  - **실시간 협업**: Socket.IO를 통해 `join-room`, `chat-message`, `memo-create` 등 이벤트 송수신

### 실행 방법

#### 1) 서버와 함께 실행 (권장)

1. 루트에서 Server 의존성을 설치하고 서버를 실행합니다.

   ```bash
   cd Server
   npm install
   npm run dev      # 또는 npm start
   ```

2. Server가 자동으로 `Client/public`을 정적 파일로 서빙합니다.  
   브라우저에서 서버 주소(예: `http://localhost:8080/`)에 접속하면 `login.html` → `main.html` 등으로 진입할 수 있습니다.


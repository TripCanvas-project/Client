const API_BASE = "";

// 공통 fetch
async function fetchWithAuth(url, method = "GET", options = {}) {
    const token = localStorage.getItem("token");

    const res = await fetch(url, {
        method,
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });

    if (!res.ok) {
        if (res.status === 401) {
            localStorage.removeItem("token");
            alert("로그인이 필요합니다");
            console.log(res.json().message);
            location.href = "/login.html";
        }
        throw new Error("API 요청 실패");
    }

    return res.json();
}

// 유저 정보 + 통계
async function loadMyTrips() {
    const { user } = await fetchWithAuth(`${API_BASE}/user/me`, "POST");

    document.querySelector(
        ".welcome-title"
    ).innerText = `안녕하세요, ${user.nickname}님! 👋`;

    document.querySelector(".allTrips").innerText = user.stats.totalTrips;
    document.querySelector(".planningTrips").innerText =
        user.stats.planningTrips;
    document.querySelector(".completedTrips").innerText =
        user.stats.completedTrips;
    document.querySelector(".achivedBucket").innerText =
        user.stats.completedBucketlists;
}

function renderTrips(trips, tripStyles = {}) {
    const container = document.getElementById("activeTrips");
    container.innerHTML = "";

    if (trips.length === 0) {
        container.innerHTML = "<p style='opacity:0.6'>데이터가 없습니다.</p>";
        return;
    }

    trips.forEach((trip) => {
        const card = document.createElement("div");
        card.className = "trip-card";

        card.innerHTML = `
            <div class="trip-thumbnail">
                ✨
                <span class="trip-status ${trip.status}">
                    ● ${getStatusLabel(trip.status)}
                </span>
            </div>

            <div class="trip-content">
                <h3 class="trip-title">${trip.title}</h3>

                <div class="trip-actions">
                    <button class="trip-action-btn edit-btn">✏️ 편집</button>
                    <button class="trip-action-btn delete-btn">❌ 삭제</button>
                </div>

                <div class="trip-palette hidden">
                    <div class="palette-section">
                        <p>배경 색상</p>
                        <div class="color-options">
                            <span class="color" data-color="#60A5FA"></span>
                            <span class="color" data-color="#34D399"></span>
                            <span class="color" data-color="#FBBF24"></span>
                            <span class="color" data-color="#F87171"></span>
                            <span class="color" data-color="#A78BFA"></span>
                        </div>
                    </div>

                    <div class="palette-section">
                        <p>이모지</p>
                        <input
                            type="text"
                            class="emoji-input"
                            placeholder="✈️"
                            maxlength="2"
                        />
                    </div>

                    <div class="palette-section">
                        <p>여행 제목 변경</p>
                        <input
                            type="text"
                            class="title-input"
                            placeholder="여행 제목"
                            value="${trip.title}"
                        />
                    </div>
                </div>
            </div>
        `;

        card.addEventListener("click", () => {
            window.location.href = `/main.html?tripId=${trip._id}`;
        });

        // 저장된 스타일 복원
        applyTripStyle(card, tripStyles[trip._id], trip.title);

        const editBtn = card.querySelector(".edit-btn");
        const deleteBtn = card.querySelector(".delete-btn");
        const palette = card.querySelector(".trip-palette");
        const thumbnail = card.querySelector(".trip-thumbnail");
        const emojiInput = card.querySelector(".emoji-input");

        const titleInput = card.querySelector(".title-input");
        const titleElement = card.querySelector(".trip-title");

        // 📝 여행 제목 변경 → 카드 + 서버 저장
        titleInput.addEventListener("change", async (e) => {
            const value = titleInput.value.trim();
            e.stopPropagation(); // 카드 클릭 방지

            if (!value) {
                titleInput.value = trip.title; // 빈 값 방지
                return;
            }

            // 화면 즉시 반영
            titleElement.textContent = value;

            await saveTripStyle(trip._id, { title: value });
        });

        // 삭제버튼
        deleteBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await deleteTrip(trip._id);
        })

        // ✏️ 편집 버튼 → 팔레트 토글
        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            palette.classList.toggle("hidden");
        });

        palette.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        // 🎨 색상 선택 → 썸네일 + 서버 저장
        palette.querySelectorAll(".color").forEach((c) => {
            c.addEventListener("click", async () => {
                const color = c.dataset.color;

                thumbnail.style.backgroundColor = color;

                await saveTripStyle(trip._id, { color });
            });
        });

        // 😀 이모지 입력 → 썸네일 + 서버 저장
        emojiInput.addEventListener("input", async () => {
            const value = emojiInput.value.trim();

            const isEmoji = /\p{Extended_Pictographic}/u.test(value);
            if (!isEmoji) {
                emojiInput.value = "";
                return;
            }

            thumbnail.firstChild.textContent = value;

            await saveTripStyle(trip._id, { emoji: value });
        });
        container.appendChild(card);
    });
}

async function saveTripStyle(tripId, payload) {
    try {
        return await fetchWithAuth(
            `${API_BASE}/user/${tripId}/customize`,
            "PATCH",
            {
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            }
        );
    } catch (err) {
        console.error("saveTripStyle failed:", err);
        return null;
    }
}

async function fetchMyTripStyles() {
    try {
        const res = await fetchWithAuth(`${API_BASE}/user/trip_styles`);
        return res?.styles ?? {};
    } catch (e) {
        console.warn("trip styles fetch failed, fallback to empty");
        return {};
    }
}

function applyTripStyle(card, style, title) {
    if (!style) return;

    const thumbnail = card.querySelector(".trip-thumbnail");

    if (style.color) {
        thumbnail.style.backgroundColor = style.color;
    }

    if (style.emoji) {
        thumbnail.firstChild.textContent = style.emoji;
    }

    if (title) {
        const titleElement = card.querySelector(".trip-title");
        titleElement.textContent = title;
    }
}

document.addEventListener("click", () => {
    document
        .querySelectorAll(".trip-palette")
        .forEach((p) => p.classList.add("hidden"));
});

// 상태별 여행 로드
async function loadTripsByStatus(status) {
    const trips = await fetchWithAuth(`${API_BASE}/trip?status=${status}`);
    const tripStyles = await fetchMyTripStyles();

    renderTrips(trips, tripStyles);
    updateTabCount(status, trips.length);
}

// 탭 이벤트
function initTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", async function () {
            document
                .querySelectorAll(".tab-btn")
                .forEach((b) => b.classList.remove("active"));

            this.classList.add("active");

            await loadTripsByStatus(this.dataset.tab);
        });
    });
}

// 여행 상태 별 카운트 표시
function updateTabCount(status, count) {
    const tab = document.querySelector(`.tab-btn[data-tab="${status}"] .count`);
    if (!tab) return;

    tab.textContent = count;
}

// 초기 실행
async function initDashboard() {
    try {
        await loadMyTrips();
        await loadMyChallenges();

        // 기본 탭
        const activeTrips = await fetchWithAuth(
            `${API_BASE}/trip?status=active`
        );
        updateTabCount("active", activeTrips.length);

        // planning 카운트
        const planningTrips = await fetchWithAuth(
            `${API_BASE}/trip?status=planning`
        );
        updateTabCount("planning", planningTrips.length);

        // completed 카운트
        const completedTrips = await fetchWithAuth(
            `${API_BASE}/trip?status=completed`
        );
        updateTabCount("completed", completedTrips.length);

        initTabs();

        const tripStyles = await fetchMyTripStyles();
        renderTrips(activeTrips, tripStyles);
    } catch (err) {
        console.error(err);
    }
}

initDashboard();

// 유틸
function formatDate(date) {
    return new Date(date).toLocaleDateString("ko-KR");
}

function getStatusLabel(status) {
    return {
        planning: "계획 중",
        active: "진행 중",
        completed: "완료",
        cancelled: "취소",
    }[status];
}

async function loadMyChallenges() {
    try {
        const challenges = await fetchWithAuth(`${API_BASE}/bucket/`);
        console.log("챌린지 데이터:", challenges);
        renderChallenges(challenges);
    } catch (err) {
        console.error("챌린지 조회 실패:", err);
    }
}

function renderChallenges(challenges) {
    const grid = document.getElementById("challengesGrid");
    grid.innerHTML = "";

    if (!challenges || challenges.length === 0) {
        grid.innerHTML = `<p class="empty-text">아직 챌린지가 없어요 😢</p>`;
        return;
    }

    challenges.forEach((challenge) => {
        const progressPercent = Math.min(
            Math.round((challenge.current / challenge.target) * 100),
            100
        );

        const card = document.createElement("div");
        card.className = "challenge-card";

        card.innerHTML = `
            <div class="challenge-icon">${challenge.icon || "🎯"}</div>
            <div class="challenge-name">${challenge.name}</div>
            <div class="challenge-progress">
                ${challenge.current} / ${challenge.target}
            </div>
            <div class="challenge-target">
                ${challenge.target}개 목표
            </div>
            <div class="challenge-bar">
                <div
                    class="challenge-bar-fill"
                    style="width: ${progressPercent}%"
                ></div>
            </div>
        `;

        grid.appendChild(card);
    });
}

document.getElementById('create-new-trip-btn')?.addEventListener('click', async () => {
    try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        const username = localStorage.getItem('username');
        
        if (!token) {
            alert('로그인이 필요합니다.');
            location.href = '/login.html';
            return;
        }
        
        // 새 여행 생성
        const response = await fetch('http://localhost:8080/trip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: `${username}의 여행 - ${new Date().toLocaleDateString()}`,
                destination: {
                    name: '미정',
                    district: '미정',
                    city: '미정'
                },
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'planning'
            })
        });
        
        if (response.ok) {
            const trip = await response.json();
            const tripId = trip._id || trip.id;
            
            // localStorage에 저장
            localStorage.setItem('currentTripId', tripId);
            localStorage.setItem('lastTripId', tripId);
            
            // main.html로 이동
            location.href = `main.html?tripId=${tripId}`;
        } else {
            const error = await response.json();
            alert('여행 생성 실패: ' + error.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('여행 생성 중 오류가 발생했습니다.');
    }
});

async function deleteTrip(tripId) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`http://localhost:8080/trip/${tripId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            alert('여행이 삭제되었습니다.');
            location.reload();
        } else {
            const error = await response.json();
            alert('여행 삭제 실패: ' + error.message);
        }
    } catch (err) {
        console.error("deleteTrip failed:", err);
        return null;
    }
}
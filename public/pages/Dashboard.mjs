const API_BASE = "http://localhost:8080";

// 공통 fetch
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem("token");

    const res = await fetch(url, {
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
            location.href = "/login.html";
        }
        throw new Error("API 요청 실패");
    }

    return res.json();
}

// 유저 정보 + 통계
async function loadMyTrips() {
    const { user } = await fetchWithAuth(`${API_BASE}/user/me`, {
        method: "POST",
    });

    document.querySelector(
        ".welcome-title"
    ).innerText = `안녕하세요, ${user.nickname}님! 👋`;

    document.querySelector(".allTrips").innerText = user.stats.totalTrips;

    document.querySelector(".completedTrips").innerText =
        user.stats.completedTrips;

    document.querySelector(".achivedBucket").innerText =
        user.stats.completedBucketlists;

    document.querySelector(".visitedPlaces").innerText = user.stats.totalPlaces;
}

// 여행 리스트 렌더링
function renderTrips(trips) {
    const container = document.getElementById("activeTrips");
    container.innerHTML = "";

    if (trips.length === 0) {
        container.innerHTML = "<p style='opacity:0.6'>여행이 없습니다.</p>";
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
                <p class="trip-dates">
                    ${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}
                </p>

                <div class="trip-meta">
                    <span>
                        💰 ₩${trip.constraints?.budget?.spent || 0}
                        / ₩${trip.constraints?.budget?.total || 0}
                    </span>
                    <span>📍 ${trip.routes?.length || 0}개 장소</span>
                </div>

                <div class="trip-progress">
                    <div class="trip-progress-label">
                        <span>진행도</span>
                        <span>${trip.progress || 0}%</span>
                    </div>
                    <div class="trip-progress-bar">
                        <div class="trip-progress-fill"
                             style="width:${trip.progress || 0}%"></div>
                    </div>
                </div>

                <div class="trip-actions">
                    <button class="trip-action-btn">✏️ 편집</button>
                    <button class="trip-action-btn">👥 공유</button>
                </div>
            </div>
        `;

        // card.onclick = () => {
        //     location.href = `/trip.html?id=${trip._id}`;
        // };

        container.appendChild(card);
    });
}

// 상태별 여행 로드
async function loadTripsByStatus(status) {
    const trips = await fetchWithAuth(`${API_BASE}/trips?status=${status}`);
    renderTrips(trips);
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

// 초기 실행
async function initDashboard() {
    try {
        await loadMyTrips(); // 유저 + 통계
        await loadTripsByStatus("active"); // 기본 탭
        initTabs();
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

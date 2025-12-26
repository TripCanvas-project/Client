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
    card.dataset.tripId = trip._id;

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
                </div>
            </div>
        `;

    // 저장된 스타일 복원
    applyTripStyle(card, tripStyles[trip._id]);

    const editBtn = card.querySelector(".edit-btn");
    const palette = card.querySelector(".trip-palette");
    const thumbnail = card.querySelector(".trip-thumbnail");
    const emojiInput = card.querySelector(".emoji-input");

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

async function saveTripStyle(tripId, style) {
  try {
    return await fetchWithAuth(`${API_BASE}/user/${tripId}/customize`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(style),
    });
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

function applyTripStyle(card, style) {
  if (!style) return;

  const thumbnail = card.querySelector(".trip-thumbnail");

  if (style.color) {
    thumbnail.style.backgroundColor = style.color;
  }

  if (style.emoji) {
    thumbnail.firstChild.textContent = style.emoji;
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

    // 기본 탭
    const activeTrips = await fetchWithAuth(`${API_BASE}/trip?status=active`);

    updateTabCount("active", activeTrips.length);

    // 버킷리스트 로드
    // await loadMyBucketlists();

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

// 버킷리스트 로드
// async function loadMyBucketlists() {
//     const data = await fetchWithAuth(`${API_BASE}/trips/bucketlists`);

//     renderBucketlists(data.bucketlists);
// }

// 버킷리스트 렌더링
// function renderBucketlists(bucketlists) {
//     const grid = document.getElementById("bucketlistGrid");
//     if (!grid) return;

//     grid.innerHTML = "";

//     if (!bucketlists || bucketlists.length === 0) {
//         grid.innerHTML = `<p style="opacity:0.6">버킷리스트가 없습니다.</p>`;
//         return;
//     }

//     bucketlists.forEach((item) => {
//         const card = document.createElement("div");
//         card.className = "bucketlist-card";

//         card.innerHTML = `
//             <div class="bucketlist-title">${item.title}</div>
//             <div class="bucketlist-desc">
//                 ${item.description || ""}
//             </div>
//             <div class="bucketlist-status">
//                 ${item.isCompleted ? "✅ 완료" : "⏳ 진행중"}
//             </div>
//         `;

//         grid.appendChild(card);
//     });
// }

// 새 여행 만들기 버튼
const createNewTripBtn = document.querySelector(".createNewTripBtn");
createNewTripBtn.addEventListener("click", async () => {
  try {
    const newTrip = await fetchWithAuth(`${API_BASE}/trip/create`);

    if (!newTrip.ok) throw new Error("새 여행 생성 실패");

    const data = await newTrip.json(); // { tripId: "..." }
    console.log("New trip created:", data);
    const tripId = data.tripId;

    // tripId에 해당하는 main.html로 이동
    window.location.href = `/main.html?tripId=${tripId}`;
  } catch (err) {
    console.error(err);
    alert("새 여행 생성 중 오류가 발생했습니다.");
  }
});

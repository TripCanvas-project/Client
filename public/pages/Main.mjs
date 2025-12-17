// client/public/pages/Main.mjs
const API_BASE_URL = "http://localhost:8080";

// ✅ 토큰 가져오기 (통일: token)
const token = localStorage.getItem("token");

// ✅ 로그인 안 했으면 튕기기
if (!token) {
  alert("로그인이 필요합니다.");
  window.location.href = "login.html";
}

// ✅ HTML Escape (XSS 방지)
function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ✅ 서버에 로그인 유지 확인 (/user/me)
async function checkMe() {
  try {
    const res = await fetch(`${API_BASE_URL}/user/me`, {
      method: "POST", // 서버가 GET이면 GET으로 바꾸세요
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      alert(
        data.message || "인증 정보가 만료되었습니다. 다시 로그인해 주세요."
      );
      window.location.href = "login.html";
      return;
    }

    console.log("✅ me:", data.user);
  } catch (e) {
    console.error("me error:", e);
    alert("서버 통신 중 오류가 발생했습니다.");
  }
}
checkMe();

// -------------------- 지역(도착지) 옵션 데이터 --------------------
const subOptionsData = {
  서울특별시: [
    "강남구",
    "강동구",
    "강북구",
    "강서구",
    "관악구",
    "광진구",
    "구로구",
    "금천구",
    "노원구",
    "도봉구",
    "동대문구",
    "동작구",
    "마포구",
    "서대문구",
    "서초구",
    "성동구",
    "성북구",
    "송파구",
    "양천구",
    "영등포구",
    "용산구",
    "은평구",
    "종로구",
    "중구",
    "중랑구",
  ],
  인천광역시: [
    "강화군",
    "계양구",
    "남동구",
    "동구",
    "미추홀구",
    "부평구",
    "서구",
    "연수구",
    "옹진군",
    "중구",
  ],
  대전광역시: ["대덕구", "동구", "서구", "유성구", "중구"],
  대구광역시: [
    "군위군",
    "남구",
    "달서구",
    "달성군",
    "동구",
    "북구",
    "서구",
    "수성구",
    "중구",
    "청도군",
  ],
  광주광역시: ["광산구", "남구", "동구", "북구", "서구", "화순군"],
  부산광역시: [
    "강서구",
    "금정구",
    "기장군",
    "남구",
    "동구",
    "동래구",
    "부산진구",
    "북구",
    "사상구",
    "사하구",
    "서구",
    "수영구",
    "연제구",
    "영도구",
    "중구",
    "해운대구",
  ],
  울산광역시: ["남구", "동구", "북구", "울주군", "중구"],
  세종특별자치시: ["세종특별자치시"],
  경기도: [
    "가평군",
    "고양시",
    "과천시",
    "광명시",
    "광주시",
    "구리시",
    "군포시",
    "김포시",
    "남양주시",
    "동두천시",
    "부천시",
    "성남시",
    "수원시",
    "시흥시",
    "안산시",
    "안성시",
    "안양시",
    "양주시",
    "양평군",
    "여주시",
    "연천군",
    "오산시",
    "용인시",
    "의왕시",
    "의정부시",
    "이천시",
    "파주시",
    "평택시",
    "포천시",
    "하남시",
    "화성시",
  ],
  강원특별자치도: [
    "강릉시",
    "고성군",
    "동해시",
    "삼척시",
    "속초시",
    "양구군",
    "양양군",
    "영월군",
    "원주시",
    "인제군",
    "정선군",
    "철원군",
    "춘천시",
    "태백시",
    "평창군",
    "홍천군",
    "화천군",
    "횡성군",
  ],
  충청북도: [
    "괴산군",
    "단양군",
    "보은군",
    "영동군",
    "옥천군",
    "음성군",
    "제천시",
    "증평군",
    "진천군",
    "청주시",
    "충주시",
  ],
  충청남도: [
    "계룡시",
    "공주시",
    "금산군",
    "논산시",
    "당진시",
    "보령시",
    "부여군",
    "서산시",
    "서천군",
    "아산시",
    "예산군",
    "천안시",
    "청양군",
    "태안군",
    "홍성군",
  ],
  경상북도: [
    "경산시",
    "경주시",
    "고령군",
    "구미시",
    "김천시",
    "문경시",
    "봉화군",
    "상주시",
    "성주군",
    "안동시",
    "영덕군",
    "영양군",
    "영주시",
    "영천시",
    "예천군",
    "울릉군",
    "울진군",
    "의성군",
    "청도군",
    "청송군",
    "칠곡군",
    "포항시",
  ],
  경상남도: [
    "거제시",
    "거창군",
    "고성군",
    "김해시",
    "남해군",
    "밀양시",
    "사천시",
    "산청군",
    "양산시",
    "의령군",
    "진주시",
    "창녕군",
    "창원시",
    "통영시",
    "하동군",
    "함안군",
    "함양군",
    "합천군",
  ],
  전북특별자치도: [
    "고창군",
    "군산시",
    "김제시",
    "남원시",
    "무주군",
    "부안군",
    "순창군",
    "완주군",
    "익산시",
    "임실군",
    "장수군",
    "전주시",
    "정읍시",
    "진안군",
  ],
  전라남도: [
    "강진군",
    "고흥군",
    "곡성군",
    "광양시",
    "구례군",
    "나주시",
    "담양군",
    "목포시",
    "무안군",
    "보성군",
    "순천시",
    "신안군",
    "여수시",
    "영광군",
    "영암군",
    "완도군",
    "장성군",
    "장흥군",
    "진도군",
    "함평군",
    "해남군",
    "홍성군",
    "화순군",
  ],
  제주특별자치도: ["서귀포시", "제주시"],
};

// -------------------- 로딩 오버레이 --------------------
const loadingOverlay = document.getElementById("loading-overlay");
function showLoading() {
  if (loadingOverlay) loadingOverlay.classList.remove("hidden");
}
function hideLoading() {
  if (loadingOverlay) loadingOverlay.classList.add("hidden");
}

// -------------------- 총 예산 표시 --------------------
function calculateTotalBudget() {
  const personalBudget =
    parseFloat(document.getElementById("personal-budget")?.value) || 0;
  const peopleCount =
    parseInt(document.getElementById("people-count")?.value, 10) || 0;

  const totalBudget = personalBudget * peopleCount;
  const el = document.getElementById("total-budget");
  if (el) el.textContent = totalBudget.toLocaleString("ko-KR") + "원";
}

// -------------------- 추천 장소/탭 렌더링 --------------------
async function loadLatestRouteAndRenderTabs() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const res = await fetch(`${API_BASE_URL}/route/latest`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return;

  const data = await res.json();
  renderDayTabs(data.route);
}

function renderPlacesList(dayPlan) {
  const listEl = document.getElementById("ai-day-places");
  if (!listEl) return;

  listEl.innerHTML = "";

  const places = dayPlan?.places || [];
  if (places.length === 0) {
    listEl.innerHTML = `<div class="place-description">장소가 없습니다.</div>`;
    return;
  }

  places.forEach((p, idx) => {
    // ✅ category는 서버에서 붙여준 p.category 우선, 없으면 populate 형태도 대응
    const category = p.category ?? p.placeId?.category ?? null;

    const card = document.createElement("div");
    card.className = "place-item";
    card.innerHTML = `
      <div class="place-name">
        <span class="place-number">${idx + 1}</span>
        ${escapeHtml(p.placeName || p.name || "(이름 없음)")}
      </div>

      <div class="place-description">${escapeHtml(p.description || "")}</div>

      <div class="place-tags">
        ${
          category
            ? `<span class="tag">#${escapeHtml(String(category))}</span>`
            : `<span class="tag">#카테고리없음</span>`
        }
      </div>
    `;
    listEl.appendChild(card);
  });
}

function renderDayTabs(route) {
  const tabsEl = document.getElementById("ai-day-tabs");
  if (!tabsEl) return;

  tabsEl.innerHTML = "";

  const plans = (route.dailyPlans || []).slice().sort((a, b) => a.day - b.day);
  if (plans.length === 0) return;

  let activeDay = plans.find((p) => p.day === 1)?.day ?? plans[0].day;

  const setActive = (day) => {
    activeDay = day;

    tabsEl.querySelectorAll(".day-tab").forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.day) === day);
    });

    const dp = plans.find((p) => p.day === day);

    // 1) 오른쪽 추천 장소 리스트 갱신
    renderPlacesList(dp);

    // 2) ✅ 지도 마커도 해당 Day로 갱신
    renderMarkersForDay(dp, day);
  };

  plans.forEach((dp) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-tab";
    btn.dataset.day = dp.day;
    btn.textContent = `Day ${dp.day}`;
    btn.addEventListener("click", () => setActive(dp.day));
    tabsEl.appendChild(btn);
  });

  setActive(activeDay);
}

// -------------------- 카카오 지도 초기화 --------------------
let currentMap = null;
let currentMarkers = [];
let isMapReady = false;

// 지도 준비되기 전에 Day 선택이 먼저 일어날 수 있어서 "대기"용
let pendingDayToRender = null;

// 마커 지우기
function clearMarkers() {
  currentMarkers.forEach((m) => m.setMap(null));
  currentMarkers = [];
}

// Day의 장소들을 지도에 "커스텀 오버레이 마커"로 표시
function extractLatLng(p) {
  // 1) 객체 형태 (너가 쓰던 구조)
  const lat1 = p.coordinates?.lat ?? p.lat ?? p.y ?? p.latitude;
  const lng1 = p.coordinates?.lng ?? p.lng ?? p.x ?? p.longitude;

  if (lat1 != null && lng1 != null) {
    const lat = Number(lat1);
    const lng = Number(lng1);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  // 2) 문자열 형태: "37.56, 126.97" 같은 경우
  const s = p.coords ?? p.coord;
  if (typeof s === "string") {
    const parts = s.split(",").map((v) => v.trim());
    if (parts.length >= 2) {
      const a = Number(parts[0]);
      const b = Number(parts[1]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        // 휴리스틱: -90~90이면 위도 가능성
        if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lng: b };
        if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return { lat: b, lng: a };
      }
    }
  }

  return null;
}

function renderMarkersForDay(dayPlan, day) {
  if (!dayPlan) return;

  if (!isMapReady || !currentMap) {
    pendingDayToRender = { dayPlan, day };
    return;
  }

  clearMarkers();

  const places = dayPlan.places || [];
  if (places.length === 0) return;

  const bounds = new kakao.maps.LatLngBounds();
  let count = 0;

  places.forEach((p, idx) => {
    const ll = extractLatLng(p);
    if (!ll) return; // 좌표 없으면 스킵

    const pos = new kakao.maps.LatLng(ll.lat, ll.lng);
    bounds.extend(pos);
    count++;

    const title = escapeHtml(p.placeName || p.name || "장소");

    // ✅ CSS 없어도 보이게 인라인 스타일로 표시
    const bg = day === 1 ? "#ff5a5f" : day === 2 ? "#1e90ff" : "#22c55e";
    const content = `
      <div 
        title="${title}"
        style="
          width:28px;height:28px;border-radius:999px;
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;color:#fff;
          background:${bg};
          border:2px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,0.25);
          user-select:none;
        "
      >${idx + 1}</div>
    `;

    const overlay = new kakao.maps.CustomOverlay({
      position: pos,
      content,
      yAnchor: 1,
      xAnchor: 0.5,
      zIndex: 10, // ✅ 위로
      clickable: true, // ✅ 클릭 가능
    });

    overlay.setMap(currentMap);
    currentMarkers.push(overlay);
  });

  console.log(
    `✅ Day${day} 마커 생성 개수:`,
    count,
    " / places:",
    places.length
  );

  if (count === 0) {
    console.warn(
      "⚠️ 좌표가 있는 place가 하나도 없어서 마커를 못 찍었어요. place 데이터 확인 필요!"
    );
    return;
  }

  // 1개면 setCenter가 보기 편함, 여러개면 bounds
  if (count === 1) {
    currentMap.setCenter(bounds.getSouthWest()); // bounds에 1개면 SW=NE=그 점
    currentMap.setLevel(5);
  } else {
    currentMap.setBounds(bounds);
  }
}

function initKakaoMap() {
  const mapContainer = document.getElementById("kakao-map");

  if (!mapContainer) {
    console.error("카카오 지도를 표시할 요소를 찾을 수 없습니다: #kakao-map");
    return;
  }

  const mapOption = {
    center: new kakao.maps.LatLng(37.566826, 126.9786567),
    level: 3,
  };

  // ✅ 1) 먼저 map 생성
  const map = new kakao.maps.Map(mapContainer, mapOption);

  // ✅ 2) 생성된 map을 전역에 저장
  currentMap = map;
  isMapReady = true;

  // ✅ 3) 지도 준비 전 요청된 Day 마커 렌더가 있으면 처리
  if (pendingDayToRender) {
    renderMarkersForDay(pendingDayToRender.dayPlan, pendingDayToRender.day);
    pendingDayToRender = null;
  }

  const mapPlaceholder = document.querySelector(".map-placeholder");
  if (mapPlaceholder) mapPlaceholder.style.display = "none";

  console.log("✅ 카카오 지도가 성공적으로 초기화되었습니다.");
}

// -------------------- DOMContentLoaded (✅ 딱 1번만) --------------------
document.addEventListener("DOMContentLoaded", () => {
  // ✅ 도착지 선택(세부사항)
  const mainSelection = document.getElementById("destination");
  const subSelection = document.getElementById("sub-destination");

  if (mainSelection && subSelection) {
    mainSelection.addEventListener("change", function () {
      const selectedCategory = this.value;

      subSelection.innerHTML =
        '<option value="">세부 항목을 선택하세요</option>';

      const options = subOptionsData[selectedCategory];

      if (options && options.length > 0) {
        options.forEach((item) => {
          const newOption = document.createElement("option");
          newOption.value = item;
          newOption.textContent = item;
          subSelection.appendChild(newOption);
        });
      } else {
        subSelection.innerHTML =
          '<option value="">선택 가능한 항목이 없습니다</option>';
      }
    });
  }

  // ✅ 여행 스타일 칩 선택
  const chipsContainer = document.getElementById("travel-style-chips");
  const hiddenInput = document.getElementById("selected-styles");

  function updateSelectedStyles() {
    if (!chipsContainer) return;

    const selectedChips = chipsContainer.querySelectorAll(".chip.selected");
    const selectedValues = [];

    selectedChips.forEach((chip) => {
      const value = chip.getAttribute("data-value") || chip.textContent.trim();
      selectedValues.push(value);
    });

    const resultString = selectedValues.join(", ");
    if (hiddenInput) hiddenInput.value = resultString;
    console.log("현재 선택된 여행 스타일:", resultString);
  }

  if (chipsContainer) {
    chipsContainer.addEventListener("click", (e) => {
      const clickedChip = e.target.closest(".chip");
      if (!clickedChip) return;
      clickedChip.classList.toggle("selected");
      updateSelectedStyles();
    });
    updateSelectedStyles();
  }

  // ✅ 총 예산 이벤트 + 초기 계산
  document
    .getElementById("personal-budget")
    ?.addEventListener("input", calculateTotalBudget);
  document
    .getElementById("people-count")
    ?.addEventListener("input", calculateTotalBudget);
  calculateTotalBudget();

  // ✅ 여행 계획 생성 버튼
  const generatePlanButton = document.getElementById("btn-generate");
  if (generatePlanButton) {
    generatePlanButton.addEventListener("click", async () => {
      showLoading();

      const departure = document.getElementById("departure")?.value.trim();
      const destination = document.getElementById("destination")?.value.trim();
      const startDate = document.getElementById("start-date")?.value;
      const endDate = document.getElementById("end-date")?.value;

      if (!departure || !destination || !startDate || !endDate) {
        hideLoading();
        alert("출발지, 도착지, 여행 날짜를 모두 입력해주세요!");
        return;
      }

      const token = localStorage.getItem("token");

      const tripData = {
        start_loc: departure,
        end_area: destination,
        detail_addr: document.getElementById("sub-destination")?.value || "",
        start_date: startDate,
        end_date: endDate,
        budget_per_person: parseInt(
          document.getElementById("personal-budget")?.value || "0",
          10
        ),
        total_people: parseInt(
          document.getElementById("people-count")?.value || "0",
          10
        ),
        place_themes: document.getElementById("selected-styles")?.value || "",
        accommodation_theme: "숙소",
      };

      try {
        const response = await fetch(`${API_BASE_URL}/plan/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(tripData),
        });

        const data = await response.json();

        if (response.ok) {
          console.log("여행 계획 생성 성공:", data);
          await loadLatestRouteAndRenderTabs();
        } else {
          alert(`계획 생성 실패: ${data.message || "오류"}`);
        }
      } catch (error) {
        console.error("통신 오류:", error);
        alert("서버 통신 중 오류가 발생했습니다.");
      } finally {
        hideLoading();
      }
    });
  }

  // ✅ 사이드바 탭 전환
  document.querySelectorAll(".sidebar-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab;

      document
        .querySelectorAll(".sidebar-tabs .tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((content) => content.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(`${tabName}-content`)?.classList.add("active");
    });
  });

  // ✅ 패널 탭 전환
  document.querySelectorAll(".panel-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const panelName = tab.dataset.panel;

      document
        .querySelectorAll(".panel-tabs .tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".panel-tab-content")
        .forEach((content) => content.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(`${panelName}-content`)?.classList.add("active");

      const chatInput = document.querySelector(".chat-input");
      if (chatInput)
        chatInput.style.display = panelName === "chat" ? "flex" : "none";
    });
  });

  // ✅ 일정 추가/취소/저장
  document.getElementById("add-schedule-btn")?.addEventListener("click", () => {
    document.getElementById("schedule-form").style.display = "block";
    document.getElementById("add-schedule-btn").style.display = "none";
  });

  document
    .getElementById("cancel-schedule-btn")
    ?.addEventListener("click", () => {
      document.getElementById("schedule-form").style.display = "none";
      document.getElementById("add-schedule-btn").style.display = "block";

      document.getElementById("schedule-time").value = "";
      document.getElementById("schedule-title").value = "";
      document.getElementById("schedule-location").value = "";
    });

  document
    .getElementById("save-schedule-btn")
    ?.addEventListener("click", () => {
      const time = document.getElementById("schedule-time").value;
      const title = document.getElementById("schedule-title").value;
      const location = document.getElementById("schedule-location").value;

      if (!time || !title || !location) {
        alert("모든 필드를 입력해주세요!");
        return;
      }

      const scheduleList = document.getElementById("schedule-list");
      const newSchedule = document.createElement("div");
      newSchedule.className = "schedule-item";
      newSchedule.innerHTML = `
      <div class="schedule-info">
        <div class="schedule-time">⏰ ${escapeHtml(time)}</div>
        <div class="schedule-title">${escapeHtml(title)}</div>
        <div class="schedule-location">📍 ${escapeHtml(location)}</div>
      </div>
      <div class="schedule-actions">
        <button class="btn-icon" title="수정" onclick="alert('수정 기능')">✏️</button>
        <button class="btn-icon" title="삭제" onclick="this.closest('.schedule-item').remove()">🗑️</button>
      </div>
    `;
      scheduleList.appendChild(newSchedule);

      document.getElementById("schedule-form").style.display = "none";
      document.getElementById("add-schedule-btn").style.display = "block";
      document.getElementById("schedule-time").value = "";
      document.getElementById("schedule-title").value = "";
      document.getElementById("schedule-location").value = "";

      alert("일정이 추가되었습니다! ✅");
    });

  // ✅ 채팅 전송
  document.getElementById("chat-send-btn")?.addEventListener("click", () => {
    const input = document.getElementById("chat-input");
    const message = input.value.trim();

    if (message) {
      const chatMessages = document.getElementById("chat-messages");
      const newMessage = document.createElement("div");
      newMessage.className = "message";
      newMessage.innerHTML = `
        <div class="message-author">나</div>
        <div class="message-text">${escapeHtml(message)}</div>
        <div class="message-time">방금</div>
      `;
      chatMessages.appendChild(newMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      input.value = "";
    }
  });

  document.getElementById("chat-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") document.getElementById("chat-send-btn")?.click();
  });

  // ✅ 초기 루트 로드
  loadLatestRouteAndRenderTabs();

  // ✅ 카카오 지도 로드/초기화
  if (window.kakao && window.kakao.maps) {
    if (typeof kakao.maps.load === "function") {
      kakao.maps.load(() => initKakaoMap());
    } else {
      initKakaoMap();
    }
  } else {
    console.error("Kakao 지도 스크립트가 로드되지 않았습니다.");
  }

  // ✅ 로그아웃
  document.getElementById("logout-button")?.addEventListener("click", () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      alert("로그아웃 되었습니다!");
      window.location.href = "login.html";
    }
  });
});

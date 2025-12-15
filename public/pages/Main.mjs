// client/public/pages/Main.mjs

const API_BASE_URL = "http://localhost:8080";

// ✅ 0) 토큰 가져오기 (통일: token)
const token = localStorage.getItem("token");

// ✅ 1) 로그인 안 했으면 튕기기
if (!token) {
  alert("로그인이 필요합니다.");
  window.location.href = "login.html";
}

// ✅ 2) 서버에 로그인 유지 확인 (/user/me)
async function checkMe() {
  try {
    const res = await fetch(`${API_BASE_URL}/user/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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

// 특별시 및 광역시 (일반적으로 1차 행정구역)
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
    "태백시",
  ],
  대전광역시: ["대덕구", "동구", "서구", "속초시", "유성구", "중구"],
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
    "해운대구광역시",
  ],
  울산광역시: ["남구", "동구", "북구", "울주군", "중구"],
  세종특별자치시: ["세종특별자치시"],

  // 도 및 특별자치도 (일반적으로 1차 행정구역)
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
    "종로구",
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
    "제천시봉양읍",
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
    "천안",
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
    "울주군",
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
    "진도군",
    "진주시",
    "창녕군",
    "창원시",
    "통영시",
    "하동군",
    "함안군",
    "함양군",
    "합천군",
    "홍천군",
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

// 도착지 선택(세부사항)
const mainSelection = document.getElementById("destination");
const subSelection = document.getElementById("sub-destination");

// 메인 선택이 변경되었을 때 실행될 서브 선택지
if (mainSelection && subSelection) {
  mainSelection.addEventListener("change", function () {
    const selectedCategory = this.value;

    subSelection.innerHTML = '<option value="">세부 항목을 선택하세요</option>';

    const options = subOptionsData[selectedCategory];

    if (options && options.length > 0) {
      options.forEach(function (item) {
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

// -------------------- 여행 스타일 칩 선택 --------------------
document.addEventListener("DOMContentLoaded", () => {
  const chipsContainer = document.getElementById("travel-style-chips");
  const hiddenInput = document.getElementById("selected-styles");

  if (!chipsContainer) return;

  chipsContainer.addEventListener("click", (e) => {
    const clickedChip = e.target.closest(".chip");
    if (clickedChip) {
      clickedChip.classList.toggle("selected");
      updateSelectedStyles();
    }
  });

  updateSelectedStyles();

  function updateSelectedStyles() {
    const selectedChips = chipsContainer.querySelectorAll(".chip.selected");
    const selectedValues = [];

    selectedChips.forEach((chip) => {
      const value = chip.getAttribute("data-value") || chip.textContent.trim();
      selectedValues.push(value);
    });

    const resultString = selectedValues.join(", ");

    if (hiddenInput) {
      hiddenInput.value = resultString;
    }
    console.log("현재 선택된 여행 스타일:", resultString);
  }
});

// -------------------- 로딩 오버레이 --------------------
const loadingOverlay = document.getElementById("loading-overlay");

function showLoading() {
  if (loadingOverlay) loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
  if (loadingOverlay) loadingOverlay.classList.add("hidden");
}

// -------------------- 여행 계획 생성 --------------------
const generatePlanButton = document.getElementById("btn-generate");

if (generatePlanButton) {
  generatePlanButton.addEventListener("click", async () => {
    showLoading();

    // ✅ 입력값 검증
    const departure = document.getElementById("departure")?.value.trim();
    const destination = document.getElementById("destination")?.value.trim();
    const startDate = document.getElementById("start-date")?.value;
    const endDate = document.getElementById("end-date")?.value;

    if (!departure || !destination || !startDate || !endDate) {
      hideLoading();
      alert("출발지, 도착지, 여행 날짜를 모두 입력해주세요!");
      return;
    }

    // ✅ 토큰 키 통일
    const token = localStorage.getItem("token");

    const tripData = {
      start_loc: departure,
      end_area: destination,
      detail_addr: document.getElementById("sub-destination")?.value,
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

// -------------------- 사이드바 탭 전환 --------------------
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
    document.getElementById(tabName + "-content")?.classList.add("active");
  });
});

// -------------------- 패널 탭 전환 --------------------
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
    document.getElementById(panelName + "-content")?.classList.add("active");

    const chatInput = document.querySelector(".chat-input");
    if (chatInput)
      chatInput.style.display = panelName === "chat" ? "flex" : "none";
  });
});

// -------------------- 일정 추가/취소/저장 --------------------
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

document.getElementById("save-schedule-btn")?.addEventListener("click", () => {
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
      <div class="schedule-time">⏰ ${time}</div>
      <div class="schedule-title">${title}</div>
      <div class="schedule-location">📍 ${location}</div>
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

// -------------------- 채팅 전송 --------------------
document.getElementById("chat-send-btn")?.addEventListener("click", () => {
  const input = document.getElementById("chat-input");
  const message = input.value.trim();

  if (message) {
    const chatMessages = document.getElementById("chat-messages");
    const newMessage = document.createElement("div");
    newMessage.className = "message";
    newMessage.innerHTML = `
      <div class="message-author">나</div>
      <div class="message-text">${message}</div>
      <div class="message-time">방금</div>
    `;
    chatMessages.appendChild(newMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    input.value = "";
  }
});

document.getElementById("chat-input")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("chat-send-btn").click();
  }
});

// 총 예산 계산해서 id="total-budget"에 보여주기
function calculateTotalBudget() {
  const personalBudget =
    parseFloat(document.getElementById("personal-budget")?.value) || 0;
  const peopleCount =
    parseInt(document.getElementById("people-count")?.value, 10) || 0;

  const totalBudget = personalBudget * peopleCount;
  document.getElementById("total-budget").textContent =
    totalBudget.toLocaleString("ko-KR") + "원";
}

// ✅ DOM 로드 후 이벤트 연결 + 초기 계산
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("personal-budget")
    .addEventListener("input", calculateTotalBudget);

  document
    .getElementById("people-count")
    .addEventListener("input", calculateTotalBudget);

  calculateTotalBudget(); // 초기 표시
});

// -------------------- 최신 루트 하나 가져와서 추천 장소 표시 ---------------------
function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
    const x = p.coordinates?.lng ?? "-"; // x = lng
    const y = p.coordinates?.lat ?? "-"; // y = lat

    const card = document.createElement("div");
    card.className = "place-item";
    card.innerHTML = `
      <div class="place-name">
        <span class="place-number">${idx + 1}</span>
        ${escapeHtml(p.placeName || p.name || "(이름 없음)")}
      </div>
      <div class="place-description">${escapeHtml(p.description || "")}</div>
      <div class="place-tags">
        <span class="tag">x(lng): ${x}</span>
        <span class="tag">y(lat): ${y}</span>
      </div>
    `;
    listEl.appendChild(card);
  });
}

function renderDayTabs(route) {
  const tabsEl = document.getElementById("ai-day-tabs");
  if (!tabsEl) return;

  tabsEl.innerHTML = "";

  // ✅ dailyPlans 기준으로 day 정렬
  const plans = (route.dailyPlans || []).slice().sort((a, b) => a.day - b.day);
  if (plans.length === 0) return;

  // 기본 선택 day = 1 있으면 1, 없으면 첫 번째
  let activeDay = plans.find((p) => p.day === 1)?.day ?? plans[0].day;

  const setActive = (day) => {
    activeDay = day;
    tabsEl.querySelectorAll(".day-tab").forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.day) === day);
    });
    const dp = plans.find((p) => p.day === day);
    renderPlacesList(dp);
  };

  // 탭 생성
  plans.forEach((dp) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-tab";
    btn.dataset.day = dp.day;
    btn.textContent = `Day ${dp.day}`;
    btn.addEventListener("click", () => setActive(dp.day));
    tabsEl.appendChild(btn);
  });

  // 최초 렌더
  setActive(activeDay);
}

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

document.addEventListener("DOMContentLoaded", () => {
  loadLatestRouteAndRenderTabs();
});

// -------------------- 로그아웃 --------------------
document.getElementById("logout-button")?.addEventListener("click", () => {
  if (confirm("로그아웃 하시겠습니까?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    alert("로그아웃 되었습니다!");
    window.location.href = "login.html";
  }
});

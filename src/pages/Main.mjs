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

// 여행 스타일 칩 선택 및 선택된 스타일 저장
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
    let selectedValues = [];

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

// 여행 계획 생성 버튼 클릭 이벤트
const generatePlanButton = document.getElementById("btn-generate");
generatePlanButton.addEventListener("click", async () => {
  showLoading();
  // 1. 사용자가 입력한 모든 여행 정보를 객체로 수집
  const token = localStorage.getItem("Token");
  const tripData = {
    start_loc: document.getElementById("departure").value,
    end_area: document.getElementById("destination").value,
    detail_addr: document.getElementById("sub-destination").value,
    start_date: document.getElementById("start-date").value,
    end_date: document.getElementById("end-date").value,
    budget_per_person: parseInt(
      document.getElementById("personal-budget").value
    ),
    total_people: parseInt(document.getElementById("people-count").value),
    place_themes: document.getElementById("selected-styles").value,
    accommodation_theme: "숙소",
  };

  try {
    const response = await fetch("http://localhost:8080/api/plan/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(tripData),
    });

    if (response.ok) {
      const planResult = await response.json();
      console.log("여행 계획 생성 성공:", planResult);
      // 사용자 화면에 계획을 표시하는 로직 추가
    } else {
      const errorData = await response.json();
      alert(`계획 생성 실패: ${errorData.message}`);
    }
  } catch (error) {
    console.error("통신 오류:", error);
    alert("서버 통신 중 오류가 발생했습니다.");
  } finally {
    hideLoading();
  }
});

// 여행경로 생성 시 로딩 창 띄우기
const loadingOverlay = document.getElementById("loading-overlay");

function showLoading() {
  loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
  loadingOverlay.classList.add("hidden");
}

//-----------------------------------------------------------------

// 총예산 계산
document
  .getElementById("personal-budget")
  .addEventListener("input", calculateTotalBudget);
document
  .getElementById("people-count")
  .addEventListener("input", calculateTotalBudget);
calculateTotalBudget();

// 사이드바 탭 전환
document.querySelectorAll(".sidebar-tabs .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const tabName = tab.dataset.tab;

    // 모든 탭 비활성화
    document
      .querySelectorAll(".sidebar-tabs .tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((content) => content.classList.remove("active"));

    // 선택한 탭 활성화
    tab.classList.add("active");
    document.getElementById(tabName + "-content").classList.add("active");
  });
});

// 패널 탭 전환
document.querySelectorAll(".panel-tabs .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const panelName = tab.dataset.panel;

    // 모든 패널 탭 비활성화
    document
      .querySelectorAll(".panel-tabs .tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".panel-tab-content")
      .forEach((content) => content.classList.remove("active"));

    // 선택한 패널 탭 활성화
    tab.classList.add("active");
    document.getElementById(panelName + "-content").classList.add("active");

    // 채팅 입력창 표시 제어
    const chatInput = document.querySelector(".chat-input");
    chatInput.style.display = panelName === "chat" ? "flex" : "none";
  });
});

// 여행 스타일 칩 선택
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    chip.classList.toggle("selected");
  });
});

// 일정 추가 버튼
document.getElementById("add-schedule-btn").addEventListener("click", () => {
  document.getElementById("schedule-form").style.display = "block";
  document.getElementById("add-schedule-btn").style.display = "none";
});

// 일정 취소 버튼
document.getElementById("cancel-schedule-btn").addEventListener("click", () => {
  document.getElementById("schedule-form").style.display = "none";
  document.getElementById("add-schedule-btn").style.display = "block";
  // 입력 필드 초기화
  document.getElementById("schedule-time").value = "";
  document.getElementById("schedule-title").value = "";
  document.getElementById("schedule-location").value = "";
});

// 일정 저장 버튼
document.getElementById("save-schedule-btn").addEventListener("click", () => {
  const time = document.getElementById("schedule-time").value;
  const title = document.getElementById("schedule-title").value;
  const location = document.getElementById("schedule-location").value;

  if (!time || !title || !location) {
    alert("모든 필드를 입력해주세요!");
    return;
  }

  // 새 일정 아이템 생성
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

  // 폼 숨기고 초기화
  document.getElementById("schedule-form").style.display = "none";
  document.getElementById("add-schedule-btn").style.display = "block";
  document.getElementById("schedule-time").value = "";
  document.getElementById("schedule-title").value = "";
  document.getElementById("schedule-location").value = "";

  alert("일정이 추가되었습니다! ✅");
});

// 채팅 전송
document.getElementById("chat-send-btn").addEventListener("click", () => {
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

// Enter 키로 채팅 전송
document.getElementById("chat-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("chat-send-btn").click();
  }
});

// AI 경로 생성
document.querySelector(".btn-generate").addEventListener("click", () => {
  const departure = document.getElementById("departure").value;
  const destination = document.getElementById("destination").value;
  const startDate = document.getElementById("start-date").value;
  const endDate = document.getElementById("end-date").value;

  if (!departure || !destination || !startDate || !endDate) {
    alert("출발지, 도착지, 여행 날짜를 모두 입력해주세요!");
    return;
  }

  alert("AI가 여행 경로를 생성하고 있습니다... 🤖✨");
});

// 로그아웃
document.getElementById("logout-button").addEventListener("click", () => {
  if (confirm("로그아웃 하시겠습니까?")) {
    alert("로그아웃 되었습니다!");
  }
});

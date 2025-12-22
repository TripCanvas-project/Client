// =====================================================
// 예산 & 일정 관리 기능 (Main.mjs에 추가할 코드)
// =====================================================

// 이 파일의 내용을 Main.mjs 파일 끝에 복사해서 붙여넣으세요.

// =====================================================
// ✅ 예산 관리 (Budget)
// =====================================================

// 예산 추가
async function addExpense() {
  const token = getToken();
  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }

  const name = document.getElementById("expense-name")?.value.trim();
  const category = document.getElementById("expense-category")?.value;
  const amount = document.getElementById("expense-amount")?.value;

  if (!name || !category || !amount) {
    alert("모든 항목을 입력해주세요.");
    return;
  }

  if (Number(amount) <= 0) {
    alert("금액은 0보다 커야 합니다.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/budget`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        tripId: currentTripId,
        name,
        category,
        amount: Number(amount),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "지출 추가에 실패했습니다.");
      return;
    }

    alert("지출이 추가되었습니다!");

    // 입력 필드 초기화
    document.getElementById("expense-name").value = "";
    document.getElementById("expense-category").value = "";
    document.getElementById("expense-amount").value = "";

    // 지출 목록 다시 불러오기
    await loadMyExpenses();
  } catch (error) {
    console.error("지출 추가 오류:", error);
    alert("지출 추가 중 오류가 발생했습니다.");
  }
}

// 내 지출 불러오기
async function loadMyExpenses() {
  const token = getToken();
  if (!token || !currentTripId) {
    console.log("여행 ID가 없거나 로그인이 필요합니다.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/budget/my/${currentTripId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error("지출 조회 실패");
      return;
    }

    const data = await response.json();
    const expenses = data.expenses || [];

    // 기존 동적으로 추가된 지출 항목 제거 (기본 예시 항목은 유지)
    const budgetContent = document.getElementById("budget-content");
    const existingExpenses = budgetContent?.querySelectorAll(".expense-item.dynamic");
    existingExpenses?.forEach((item) => item.remove());

    // 불러온 지출 내역 표시
    const expenseForm = budgetContent?.querySelector("div[style*='margin-top: 20px']");

    expenses.forEach((expense) => {
      const expenseItem = document.createElement("div");
      expenseItem.className = "expense-item dynamic"; // 동적 아이템 표시
      expenseItem.innerHTML = `
        <div class="expense-info">
          <div class="expense-name">${escapeHtml(expense.name)}</div>
          <div class="expense-category">#${escapeHtml(expense.category)}</div>
        </div>
        <div class="expense-amount">₩${expense.amount.toLocaleString("ko-KR")}</div>
      `;

      if (expenseForm) {
        expenseForm.parentNode.insertBefore(expenseItem, expenseForm);
      }
    });

    updateBudgetSummary();
    console.log(`✅ ${expenses.length}개의 지출 내역을 불러왔습니다.`);
  } catch (error) {
    console.error("지출 불러오기 오류:", error);
  }
}

// 예산 요약 업데이트 (총 사용 금액)
function updateBudgetSummary() {
  const expenseItems = document.querySelectorAll(".expense-item");
  let total = 0;

  expenseItems.forEach((item) => {
    const amountText = item.querySelector(".expense-amount")?.textContent || "₩0";
    const amount = Number(amountText.replace(/[₩,]/g, ""));
    if (!isNaN(amount)) {
      total += amount;
    }
  });

  const remainingBudgetEl = document.getElementById("remaining-budget");
  if (remainingBudgetEl) {
    remainingBudgetEl.textContent = `₩${total.toLocaleString("ko-KR")}`;
  }
}

// =====================================================
// ✅ 일정 관리 (Schedule)
// =====================================================

// 일정 추가 폼 열기/닫기
function openScheduleForm() {
  const form = document.getElementById("schedule-form");
  if (form) {
    form.style.display = "block";
  }
}

function closeScheduleForm() {
  const form = document.getElementById("schedule-form");
  if (form) {
    form.style.display = "none";
  }

  // 입력 필드 초기화
  document.getElementById("schedule-time").value = "";
  document.getElementById("schedule-title").value = "";
  document.getElementById("schedule-location").value = "";
}

// 일정 추가
async function saveSchedule() {
  const token = getToken();
  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }

  const time = document.getElementById("schedule-time")?.value;
  const title = document.getElementById("schedule-title")?.value.trim();
  const location = document.getElementById("schedule-location")?.value.trim();

  if (!time || !title || !location) {
    alert("모든 항목을 입력해주세요.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        tripId: currentTripId,
        time,
        title,
        location,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "일정 추가에 실패했습니다.");
      return;
    }

    alert("일정이 추가되었습니다!");
    closeScheduleForm();

    // 일정 목록 다시 불러오기
    await loadMySchedules();
  } catch (error) {
    console.error("일정 추가 오류:", error);
    alert("일정 추가 중 오류가 발생했습니다.");
  }
}

// 내 일정 불러오기
async function loadMySchedules() {
  const token = getToken();
  if (!token || !currentTripId) {
    console.log("여행 ID가 없거나 로그인이 필요합니다.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/schedule/my/${currentTripId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error("일정 조회 실패");
      return;
    }

    const data = await response.json();
    const schedules = data.schedules || [];

    // 기존 일정 목록 제거 (동적으로 추가된 것만)
    const scheduleList = document.getElementById("schedule-list");
    if (!scheduleList) return;

    // 모든 기존 일정 제거
    scheduleList.innerHTML = "";

    // 불러온 일정 표시
    schedules.forEach((schedule) => {
      const scheduleItem = document.createElement("div");
      scheduleItem.className = "schedule-item";
      scheduleItem.dataset.scheduleId = schedule._id;
      scheduleItem.innerHTML = `
        <div class="schedule-info">
          <div class="schedule-time">⏰ ${escapeHtml(schedule.time)}</div>
          <div class="schedule-title">${escapeHtml(schedule.title)}</div>
          <div class="schedule-location">📍 ${escapeHtml(schedule.location)}</div>
        </div>
        <div class="schedule-actions">
          <button class="btn-icon btn-edit-schedule" title="수정" data-id="${schedule._id}">✏️</button>
          <button class="btn-icon btn-delete-schedule" title="삭제" data-id="${schedule._id}">🗑️</button>
        </div>
      `;

      scheduleList.appendChild(scheduleItem);
    });

    // 수정/삭제 버튼 이벤트 등록
    attachScheduleActions();

    console.log(`✅ ${schedules.length}개의 일정을 불러왔습니다.`);
  } catch (error) {
    console.error("일정 불러오기 오류:", error);
  }
}

// 일정 수정/삭제 버튼 이벤트 연결
function attachScheduleActions() {
  // 수정 버튼
  document.querySelectorAll(".btn-edit-schedule").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const scheduleId = e.target.dataset.id;
      openEditScheduleForm(scheduleId);
    });
  });

  // 삭제 버튼
  document.querySelectorAll(".btn-delete-schedule").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const scheduleId = e.target.dataset.id;
      if (confirm("이 일정을 삭제하시겠습니까?")) {
        await deleteSchedule(scheduleId);
      }
    });
  });
}

// 일정 수정 폼 열기
function openEditScheduleForm(scheduleId) {
  const scheduleItem = document.querySelector(`[data-schedule-id="${scheduleId}"]`);
  if (!scheduleItem) return;

  const time = scheduleItem.querySelector(".schedule-time")?.textContent.replace("⏰ ", "");
  const title = scheduleItem.querySelector(".schedule-title")?.textContent;
  const location = scheduleItem.querySelector(".schedule-location")?.textContent.replace("📍 ", "");

  const editForm = document.getElementById("schedule-edit-form");
  if (editForm) {
    editForm.style.display = "block";
    editForm.dataset.scheduleId = scheduleId;

    document.getElementById("schedule-edit-time").value = time;
    document.getElementById("schedule-edit-title").value = title;
    document.getElementById("schedule-edit-location").value = location;
  }
}

// 일정 수정 폼 닫기
function closeEditScheduleForm() {
  const editForm = document.getElementById("schedule-edit-form");
  if (editForm) {
    editForm.style.display = "none";
    delete editForm.dataset.scheduleId;
  }
}

// 일정 수정
async function updateSchedule() {
  const token = getToken();
  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }

  const editForm = document.getElementById("schedule-edit-form");
  const scheduleId = editForm?.dataset.scheduleId;

  if (!scheduleId) {
    alert("일정 ID를 찾을 수 없습니다.");
    return;
  }

  const time = document.getElementById("schedule-edit-time")?.value;
  const title = document.getElementById("schedule-edit-title")?.value.trim();
  const location = document.getElementById("schedule-edit-location")?.value.trim();

  if (!time || !title || !location) {
    alert("모든 항목을 입력해주세요.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/schedule/${scheduleId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ time, title, location }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "일정 수정에 실패했습니다.");
      return;
    }

    alert("일정이 수정되었습니다!");
    closeEditScheduleForm();
    await loadMySchedules();
  } catch (error) {
    console.error("일정 수정 오류:", error);
    alert("일정 수정 중 오류가 발생했습니다.");
  }
}

// 일정 삭제
async function deleteSchedule(scheduleId) {
  const token = getToken();
  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/schedule/${scheduleId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "일정 삭제에 실패했습니다.");
      return;
    }

    alert("일정이 삭제되었습니다!");
    await loadMySchedules();
  } catch (error) {
    console.error("일정 삭제 오류:", error);
    alert("일정 삭제 중 오류가 발생했습니다.");
  }
}

// =====================================================
// ✅ 이벤트 리스너 등록
// =====================================================

// 예산 추가 버튼
document.getElementById("add-expense-btn")?.addEventListener("click", addExpense);

// 일정 추가 버튼 (폼 열기)
document.getElementById("add-schedule-btn")?.addEventListener("click", openScheduleForm);

// 일정 저장 버튼
document.getElementById("save-schedule-btn")?.addEventListener("click", saveSchedule);

// 일정 추가 취소 버튼
document.getElementById("cancel-schedule-btn")?.addEventListener("click", closeScheduleForm);

// 일정 수정 저장 버튼
document.getElementById("update-schedule-btn")?.addEventListener("click", updateSchedule);

// 일정 수정 취소 버튼
document.getElementById("cancel-edit-schedule-btn")?.addEventListener("click", closeEditScheduleForm);

// =====================================================
// ✅ 초기 로드
// =====================================================

// 페이지 로드 시 예산과 일정 불러오기
// (Main.mjs의 기존 초기화 함수에서 호출하거나, 여기서 직접 호출)
async function initBudgetAndSchedule() {
  // currentTripId가 설정될 때까지 대기
  let attempts = 0;
  while (!currentTripId && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }

  if (currentTripId) {
    await loadMyExpenses();
    await loadMySchedules();
  }
}

// DOM이 준비되면 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBudgetAndSchedule);
} else {
  initBudgetAndSchedule();
}

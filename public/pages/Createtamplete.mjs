let currentStep = 1;
const totalSteps = 4;
const selectedCategories = new Set();

// 카테고리 선택
document.querySelectorAll(".category-option").forEach((option) => {
  option.addEventListener("click", () => {
    const category = option.dataset.category;
    if (selectedCategories.has(category)) {
      selectedCategories.delete(category);
      option.classList.remove("selected");
    } else {
      selectedCategories.add(category);
      option.classList.add("selected");
    }
  });
});

// 다음 버튼
document.getElementById("nextBtn").addEventListener("click", () => {
  if (validateStep(currentStep)) {
    if (currentStep < totalSteps) {
      currentStep++;
      updateStep();
    }
  }
});

// 이전 버튼
document.getElementById("prevBtn").addEventListener("click", () => {
  if (currentStep > 1) {
    currentStep--;
    updateStep();
  }
});

// 단계 업데이트
function updateStep() {
  // 섹션 표시/숨김
  document.querySelectorAll(".form-section").forEach((section, index) => {
    section.classList.remove("active");
    if (index + 1 === currentStep) {
      section.classList.add("active");
    }
  });

  // 단계 표시 업데이트
  document.querySelectorAll(".step").forEach((step, index) => {
    step.classList.remove("active", "completed");
    if (index + 1 === currentStep) {
      step.classList.add("active");
    } else if (index + 1 < currentStep) {
      step.classList.add("completed");
    }
  });

  // 버튼 표시
  document.getElementById("prevBtn").style.display =
    currentStep === 1 ? "none" : "block";
  document.getElementById("nextBtn").style.display =
    currentStep === totalSteps ? "none" : "block";
  document.getElementById("submitBtn").style.display =
    currentStep === totalSteps ? "block" : "none";

  // 마지막 단계면 리뷰 업데이트
  if (currentStep === totalSteps) {
    updateReview();
  }
}

// 입력 검증
function validateStep(step) {
  if (step === 1) {
    const title = document.getElementById("title").value;
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    if (!title || !startDate || !endDate) {
      alert("모든 필수 항목을 입력해주세요!");
      return false;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      alert("종료 날짜는 시작 날짜 이후여야 합니다!");
      return false;
    }
  }

  if (step === 2) {
    const origin = document.getElementById("origin").value;
    const city = document.getElementById("destinationCity").value;
    const district = document.getElementById("destinationDistrict").value;

    if (!origin || !city || !district) {
      alert("출발지와 도착지를 모두 입력해주세요!");
      return false;
    }
  }

  if (step === 3) {
    if (selectedCategories.size === 0) {
      alert("최소 하나의 여행 스타일을 선택해주세요!");
      return false;
    }
  }

  return true;
}

// 리뷰 업데이트
function updateReview() {
  document.getElementById("review-title").textContent =
    document.getElementById("title").value;

  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const days =
    Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
  document.getElementById(
    "review-dates"
  ).textContent = `${start} ~ ${end} (${days}일)`;

  const people = document.getElementById("peopleCount").value;
  document.getElementById("review-people").textContent = `${people}명`;

  const perPerson = parseInt(document.getElementById("budget").value || 0);
  const total = perPerson * parseInt(people);
  document.getElementById(
    "review-budget"
  ).textContent = `1인당 ₩${perPerson.toLocaleString()} (총 ₩${total.toLocaleString()})`;

  const origin = document.getElementById("origin").value;
  const city = document.getElementById("destinationCity").value;
  const district = document.getElementById("destinationDistrict").value;
  document.getElementById(
    "review-route"
  ).textContent = `${origin} → ${city} ${district}`;

  const categoryNames = {
    cafe: "☕ 카페",
    food: "🍜 맛집",
    nature: "🌲 자연",
    culture: "🏛️ 문화",
    camping: "🏕️ 캠핑",
    photo: "📸 사진",
  };
  const categories = Array.from(selectedCategories)
    .map((c) => categoryNames[c])
    .join(", ");
  document.getElementById("review-categories").textContent = categories;
}

// 폼 제출
document.getElementById("createTripForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const tripData = {
    title: document.getElementById("title").value,
    startDate: document.getElementById("startDate").value,
    endDate: document.getElementById("endDate").value,
    peopleCount: document.getElementById("peopleCount").value,
    budget: document.getElementById("budget").value,
    description: document.getElementById("description").value,
    origin: document.getElementById("origin").value,
    destination: {
      city: document.getElementById("destinationCity").value,
      district: document.getElementById("destinationDistrict").value,
    },
    categories: Array.from(selectedCategories),
    preferences: document.getElementById("preferences").value,
  };

  console.log("Creating trip:", tripData);
  alert("여행이 생성되었습니다! AI가 경로를 생성하고 있습니다... 🤖✨");

  // 실제로는 API 호출 후 여행 편집기로 이동
  // window.location.href = '/trip/edit/' + tripId;
});

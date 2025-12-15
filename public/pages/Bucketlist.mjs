// 카테고리 선택
document.querySelectorAll(".category-option").forEach((option) => {
  option.addEventListener("click", () => {
    document.querySelectorAll(".category-option").forEach((opt) => {
      opt.classList.remove("selected");
    });
    option.classList.add("selected");
  });
});

// 필터 버튼
document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => {
      b.classList.remove("active");
    });
    btn.classList.add("active");
  });
});

// 모달 외부 클릭 시 닫기
document.getElementById("newChallengeModal").addEventListener("click", (e) => {
  if (e.target.id === "newChallengeModal") {
    closeModal();
  }
});

// 폼 제출
document.getElementById("challengeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  alert("새 챌린지가 생성되었습니다! 🎉");
  closeModal();
});

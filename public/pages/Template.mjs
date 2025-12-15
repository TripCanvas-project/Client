// 카테고리 필터
document.querySelectorAll(".category-filter").forEach((filter) => {
  filter.addEventListener("click", function () {
    document
      .querySelectorAll(".category-filter")
      .forEach((f) => f.classList.remove("active"));
    this.classList.add("active");
  });
});

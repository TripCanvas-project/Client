// 탭 전환
document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const tabName = btn.dataset.tab;

        document.querySelectorAll(".tab-btn").forEach((b) => {
            b.classList.remove("active");
        });
        btn.classList.add("active");

        document.querySelectorAll(".tab-content").forEach((content) => {
            content.style.display = "none";
        });

        document.getElementById(tabName + "Tab").style.display = "block";
    });
});

// 프로필 이미지 업로드
document
    .getElementById("avatarUpload")
    .addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                document.querySelector(".profile-avatar-large").innerHTML = `
                        <img src="${e.target.result}" alt="Profile">
                        <label class="avatar-upload" for="avatarUpload">✓</label>
                    `;
            };
            reader.readAsDataURL(file);
        }
    });

// 폼 제출 (회원 정보 수정)
document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        // alert("저장되었습니다! ✅");
    });
});

// ================= 내 프로필 불러오기 =================
async function loadMyProfile() {
    const token = localStorage.getItem("token");
    if (!token) {
        // token 없으면 로그인 페이지로 이동시킴
        location.href = "/login.html";
        return;
    }

    const res = await fetch("http://localhost:8080/user/me", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        localStorage.removeItem("token");
        alert("로그인이 필요합니다");
        location.href = "/login.html";
        return;
    }

    const { user } = await res.json();

    document.querySelector(".profile-name").innerText = user.nickname;
    document.querySelector(".profile-email").innerText = user.email;

    document.getElementById("nickname").value = user.nickname;
    document.getElementById("email").value = user.email;
    document.getElementById("bio").value = user.bio ?? "";

    if (user.profileImg) {
        document.querySelector(".profile-avatar-large").innerHTML = `
            <img src="http://localhost:8080${user.profileImg}" />
            <label class="avatar-upload" for="avatarUpload">📷</label>
        `;
    }
}

loadMyProfile();

/* ================= 탭 전환 ================= */
document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const tabName = btn.dataset.tab;

        document
            .querySelectorAll(".tab-btn")
            .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        document
            .querySelectorAll(".tab-content")
            .forEach((content) => (content.style.display = "none"));

        document.getElementById(`${tabName}Tab`).style.display = "block";
    });
});

/* ================= 이미지 미리보기 ================= */
const avatarInput = document.getElementById("avatarUpload");
const avatarContainer = document.querySelector(".profile-avatar-large");

avatarInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        avatarContainer.innerHTML = `
            <img src="${reader.result}" alt="Profile">
            <label class="avatar-upload" for="avatarUpload">📷</label>
        `;
    };
    reader.readAsDataURL(file);
});

/* ================= 프로필 저장 ================= */
const profileForm = document.getElementById("profileForm");

profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nickname = document.getElementById("nickname").value;
    const email = document.getElementById("email").value;
    const bio = document.getElementById("bio").value;
    const profileImg = avatarInput.files[0];

    const formData = new FormData();
    formData.append("nickname", nickname);
    formData.append("email", email);
    formData.append("bio", bio);
    if (profileImg) {
        formData.append("profileImg", profileImg);
    }

    try {
        const res = await fetch("http://localhost:8080/user/profile", {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "프로필 수정 실패");
            return;
        }

        alert("프로필이 성공적으로 수정되었습니다");
    } catch (err) {
        console.error(err);
        alert("서버 오류");
    }
});

const passwordForm = document.getElementById("passwordForm");

passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const newPasswordConfirm =
        document.getElementById("newPasswordConfirm").value;

    if (newPassword !== newPasswordConfirm) {
        alert("새 비밀번호가 일치하지 않습니다");
        return;
    }

    try {
        const res = await fetch("http://localhost:8080/user/password", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
                currentPassword,
                newPassword,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message);
            return;
        }

        alert("비밀번호가 변경되었습니다");
        passwordForm.reset();
    } catch (err) {
        console.error(err);
        alert("서버 오류");
    }
});

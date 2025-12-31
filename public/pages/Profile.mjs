const API_BASE_URL = "";

// ================= 내 프로필 불러오기 =================
async function loadMyProfile() {
  const token = localStorage.getItem("token");
  if (!token) {
    // token 없으면 로그인 페이지로 이동시킴
    location.href = "/login.html";
    return;
  }

  const res = await fetch(`${API_BASE_URL}/user/me`, {
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
            <img src="${API_BASE_URL}${user.profileImg}" />
            <label class="avatar-upload" for="avatarUpload">📷</label>
        `;
  }

  const statElements = document.querySelectorAll(".profile-stat-value");
  statElements[0].innerText = user.stats.totalTrips;
  statElements[1].innerText = user.stats.completedTrips;
  statElements[2].innerText = user.stats.totalBucketlists;

  loadTripHistory();
}

loadMyProfile();

// async function loadTripHistory() {
//     try {
//         const token = localStorage.getItem("token");
//         const response = await fetch(
//             "http://localhost:8080/trip/tripId",
//             {
//                 method: "GET",
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                 },
//             }
//         );

//         if (!response.ok) {
//             console.error("여행 히스토리 로드 실패");
//             return;
//         }

//         const histories = await response.json();

//         const container = document.getElementById("tripHistoryContainer");

//         if (!histories || histories.length === 0) {
//             container.innerHTML =
//                 '<p style="text-align: center; color: #999; padding: 30px;">여행 히스토리가 없습니다.</p>';
//             return;
//         }

//         // 최대 3개만 표시
//         const displayData = histories.slice(0, 3);

//         const html = displayData
//             .map(
//                 (trip) => `
//             <div class="trip-history-item">
//                 <div class="trip-history-icon">${getCategoryIcon(
//                     trip.category
//                 )}</div>
//                 <div class="trip-history-info">
//                     <div class="trip-history-title">${escapeHtml(
//                         trip.title
//                     )}</div>
//                     <div class="trip-history-date">${trip.dateRange}</div>
//                 </div>
//                 <div class="trip-history-stats">
//                     <span>💰 ${trip.budgetDisplay}</span>
//                     <span>📍 ${trip.placesDisplay}</span>
//                 </div>
//             </div>
//         `
//             )
//             .join("");

//         container.innerHTML = html;
//     } catch (err) {
//         console.error("여행 히스토리 로드 중 오류:", err);
//         document.getElementById("tripHistoryContainer").innerHTML =
//             '<p style="text-align: center; color: #999; padding: 30px;">여행 히스토리를 불러올 수 없습니다.</p>';
//     }
// }

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// 카테고리별 아이콘 매핑
function getCategoryIcon(category) {
  const iconMap = {
    카페: "☕",
    맛집: "🍽️",
    "역사/문화": "🏛️",
    자연: "🌲",
    쇼핑: "🛍️",
    캠핑: "⛺",
    food: "🍽️",
    transport: "🚗",
    accommodation: "🏨",
    activity: "🎭",
    shopping: "🛍️",
    ticket: "🎫",
    etc: "🏖️",
  };
  return iconMap[category] || "🏖️";
}

// 탭 전환
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

// 이미지 미리보기
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

// 프로필 저장
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
    const res = await fetch(`${API_BASE_URL}/user/profile`, {
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
    const res = await fetch(`${API_BASE_URL}/user/password`, {
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

document.querySelector(".delBtn").addEventListener("click", async () => {
  if (!confirm("정말로 회원탈퇴를 진행하시겠습니까?")) return;

  try {
    const user = JSON.parse(localStorage.getItem("user"));

    const res = await fetch(`${API_BASE_URL}/user/${user.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message);
      return;
    }

    alert("계정이 삭제되었습니다");
    localStorage.removeItem("token");
    location.href = "/login.html";
  } catch (err) {
    console.error(err);
    alert("서버 오류");
  }
});

const API_BASE_URL = "";

const token = localStorage.getItem("token");

const checkAuthAndLoad = async () => {
  if (!token) {
    alert("로그인이 필요합니다.");
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/user/me`, {
      method: "POST", // 서버가 POST /user/me 로 만들어져 있음
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      localStorage.removeItem("token");
      alert(
        data.message || "인증 정보가 만료되었습니다. 다시 로그인해 주세요."
      );
      window.location.href = "login.html";
      return;
    }

    console.log("✅ me:", data.user);
    // 여기서 화면에 유저 정보 렌더링하면 됨
  } catch (err) {
    console.error(err);
    alert("사용자 정보 로드 중 오류가 발생했습니다.");
  }
};

checkAuthAndLoad();

// 로그아웃 버튼 (있다면)
const logoutButton = document.getElementById("logout-button");
if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token");
    alert("로그아웃되었습니다.");
    window.location.href = "login.html";
  });
}

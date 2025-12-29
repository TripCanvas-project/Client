const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");

const params = new URLSearchParams(location.search);
const inviteToken = params.get("invite"); // 초대 토큰

const API_BASE_URL =
  location.hostname === "localhost"
    ? "http://localhost:8080"
    : "https://sunlike-diametrically-marta.ngrok-free.dev";

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMessage.style.display = "none";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    errorMessage.textContent = "아이디 또는 비밀번호를 입력해주세요.";
    errorMessage.style.display = "block";
    return;
  }

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

  const payload = {
    ...(isEmail ? { email: username } : { userid: username }),
    password,
  };

  try {
    const res = await fetch(`${API_BASE_URL}/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      errorMessage.textContent =
        data.message || "아이디 또는 비밀번호가 올바르지 않습니다.";
      errorMessage.style.display = "block";
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    // 초대 링크 타고 들어왔는지에 대한 여부에 따라 분기
    if (inviteToken) {
      location.href = `${API_BASE_URL}/trip/join/${inviteToken}`;
    } else {
      location.href = "./dashboard.html";
    }
  } catch (err) {
    console.error("login error:", err);
    errorMessage.textContent = "서버와 통신 중 오류가 발생했습니다.";
    errorMessage.style.display = "block";
  }
});

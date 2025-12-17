const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMessage.style.display = "none";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    // const rememberMe = document.getElementById("rememberMe").checked;

    if (!username || !password) {
        errorMessage.textContent = "아이디 또는 비밀번호를 입력해주세요.";
        errorMessage.style.display = "block";
        return;
    }

    // 이메일인지 아이디인지 판별
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

    const payload = {
        password,
        ...(isEmail ? { email: username } : { userid: username }),
    };

    try {
        const API_BASE_URL = "http://localhost:8080";
        const res = await fetch(`${API_BASE_URL}/user/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
            errorMessage.textContent =
                data.message || "아이디 또는 비밀번호가 올바르지 않습니다.";
            errorMessage.style.display = "block";
            return;
        }

        // const storage = rememberMe ? localStorage : sessionStorage;
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // 이동
        window.location.href = "./main.html";
    } catch (err) {
        console.error("login error:", err);
        errorMessage.textContent = "서버와 통신 중 오류가 발생했습니다.";
        errorMessage.style.display = "block";
    }
});

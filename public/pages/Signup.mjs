const signupForm = document.getElementById("signupForm");

// 에러 메시지 요소들
const usernameError = document.getElementById("usernameError");
const emailError = document.getElementById("emailError");
const nicknameError = document.getElementById("nicknameError");
const passwordConfirmError = document.getElementById("passwordConfirmError");

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // 에러 초기화
  clearErrors();

  const userid = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const nickname = document.getElementById("nickname").value.trim();
  const password = document.getElementById("password").value;
  const passwordConfirm = document.getElementById("passwordConfirm").value;
  const agreeTerms = document.getElementById("agreeTerms").checked;

  // 프론트 1차 검증
  if (!agreeTerms) {
    alert("이용약관에 동의해주세요.");
    return;
  }

  if (password !== passwordConfirm) {
    passwordConfirmError.textContent = "비밀번호가 일치하지 않습니다.";
    return;
  }

  try {
    const API_BASE_URL = "";

    const res = await fetch(`${API_BASE_URL}/user/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userid,
        email,
        nickname,
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      handleServerError(data);
      return;
    }

    alert("회원가입이 완료되었습니다! 로그인해주세요.");
    window.location.href = "./login.html";
  } catch (error) {
    console.error("signup error:", error);
    alert("서버와 통신 중 오류가 발생했습니다.");
  }
});

/* ---------------- helpers ---------------- */

function clearErrors() {
  usernameError.textContent = "";
  emailError.textContent = "";
  nicknameError.textContent = "";
  passwordConfirmError.textContent = "";
}

function handleServerError(data) {
  // express-validator 에러 대응
  if (Array.isArray(data.errors)) {
    data.errors.forEach((err) => {
      switch (err.param) {
        case "userid":
          usernameError.textContent = err.msg;
          break;
        case "email":
          emailError.textContent = err.msg;
          break;
        case "nickname":
          nicknameError.textContent = err.msg;
          break;
        case "password":
          passwordConfirmError.textContent = err.msg;
          break;
      }
    });
    return;
  }

  // 중복 아이디 / 이메일
  if (data.message) {
    if (data.message.includes("아이디")) {
      usernameError.textContent = data.message;
    } else if (data.message.includes("이메일")) {
      emailError.textContent = data.message;
    } else {
      alert(data.message);
    }
  }
}

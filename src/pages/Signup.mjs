// 프로필 이미지 미리보기
document
  .getElementById("profileImage")
  .addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const preview = document.getElementById("profilePreview");
        preview.innerHTML = `
                        <img src="${e.target.result}" alt="Profile">
                        <div class="upload-icon">✓</div>
                    `;
      };
      reader.readAsDataURL(file);
    }
  });

// 아이디 유효성 검사
document.getElementById("username").addEventListener("input", function (e) {
  const value = e.target.value;
  const check = document.getElementById("usernameCheck");
  const regex = /^[a-zA-Z0-9]{4,20}$/;

  if (regex.test(value)) {
    check.classList.add("valid");
    check.classList.remove("invalid");
    e.target.classList.remove("error");
  } else {
    check.classList.add("invalid");
    check.classList.remove("valid");
    if (value.length > 0) {
      e.target.classList.add("error");
    }
  }
});

// 이메일 유효성 검사
document.getElementById("email").addEventListener("input", function (e) {
  const value = e.target.value;
  const check = document.getElementById("emailCheck");
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (regex.test(value)) {
    check.classList.add("valid");
    check.classList.remove("invalid");
    e.target.classList.remove("error");
  } else {
    check.classList.add("invalid");
    check.classList.remove("valid");
    if (value.length > 0) {
      e.target.classList.add("error");
    }
  }
});

// 닉네임 유효성 검사
document.getElementById("nickname").addEventListener("input", function (e) {
  const value = e.target.value;
  const check = document.getElementById("nicknameCheck");

  if (value.length >= 2 && value.length <= 10) {
    check.classList.add("valid");
    check.classList.remove("invalid");
    e.target.classList.remove("error");
  } else {
    check.classList.add("invalid");
    check.classList.remove("valid");
    if (value.length > 0) {
      e.target.classList.add("error");
    }
  }
});

// 비밀번호 강도 체크
document.getElementById("password").addEventListener("input", function (e) {
  const value = e.target.value;
  const bar = document.getElementById("passwordStrengthBar");
  const hint = document.getElementById("passwordHint");

  let strength = 0;
  if (value.length >= 8) strength++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) strength++;
  if (/\d/.test(value)) strength++;
  if (/[^a-zA-Z0-9]/.test(value)) strength++;

  bar.className = "password-strength-bar";
  if (strength === 0) {
    hint.textContent = "비밀번호 강도: 없음";
  } else if (strength <= 2) {
    bar.classList.add("weak");
    hint.textContent = "비밀번호 강도: 약함";
    hint.style.color = "#ef4444";
  } else if (strength === 3) {
    bar.classList.add("medium");
    hint.textContent = "비밀번호 강도: 보통";
    hint.style.color = "#f59e0b";
  } else {
    bar.classList.add("strong");
    hint.textContent = "비밀번호 강도: 강함";
    hint.style.color = "#10b981";
  }
});

// 비밀번호 확인
document
  .getElementById("passwordConfirm")
  .addEventListener("input", function (e) {
    const password = document.getElementById("password").value;
    const confirm = e.target.value;
    const check = document.getElementById("passwordMatchCheck");

    if (confirm.length === 0) {
      check.classList.remove("valid", "invalid");
      return;
    }

    if (password === confirm) {
      check.classList.add("valid");
      check.classList.remove("invalid");
      e.target.classList.remove("error");
    } else {
      check.classList.add("invalid");
      check.classList.remove("valid");
      e.target.classList.add("error");
    }
  });

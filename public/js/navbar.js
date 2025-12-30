import { loadNavbarUser } from "../pages/NavbarUserInfo.js";

export function loadNavbar() {
  fetch("./navbar.html")
    .then((res) => res.text())
    .then((html) => {
      const container = document.getElementById("navbar");
      if (!container) return;

      container.innerHTML = html;
      setActiveNav();
      loadNavbarUser();
      // 네비바가 DOM에 삽입되었음을 다른 스크립트에 알려줍니다
      // (예: Main.mjs가 초대 버튼을 찾고 이벤트를 바인딩할 수 있도록)
      console.debug("[navbar] dispatching navbar:loaded and setting flag");
      // 레이스 조건을 피하기 위해 전역 플래그도 설정
      window.__navbarLoaded = true;
      document.dispatchEvent(new Event("navbar:loaded"));
    });
}

function setActiveNav() {
  const current =
    location.pathname.split("/").pop().replace(".html", "") || "dashboard";

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
  });

  const map = {
    dashboard: "nav-dashboard",
    main: "nav-main",
    bucketlist: "nav-bucketlist",
  };

  document.getElementById(map[current])?.classList.add("active");
}

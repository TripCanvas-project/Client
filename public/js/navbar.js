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

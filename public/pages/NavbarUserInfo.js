// pages/NavbarUserInfo.js
export async function loadNavbarUser() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch("http://localhost:8080/user/me", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        localStorage.removeItem("token");
        location.href = "/login.html";
        return;
    }

    const { user } = await res.json();

    document.querySelector(".user-name").innerText = user.nickname;
    document.querySelector(".user-email").innerText = user.email;

    if (user.profileImg) {
        document.getElementById("navAvatar").innerHTML = `
            <img src="http://localhost:8080${user.profileImg}"
                 style="width:100%;height:100%;border-radius:50%" />
        `;
    }

    const profile = document.getElementById("userProfile");
    const dropdown = document.getElementById("userDropdown");

    profile.onclick = () => {
        dropdown.style.display =
            dropdown.style.display === "flex" ? "none" : "flex";
    };

    document.getElementById("profileBtn").onclick = () => {
        location.href = "/profile.html";
    };

    document.getElementById("logoutBtn").onclick = () => {
        localStorage.removeItem("token");
        location.href = "/login.html";
    };

    document.addEventListener("click", (e) => {
        if (!profile.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });

    profile.style.display = "flex";
}

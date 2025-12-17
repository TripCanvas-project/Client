// ================= 내 여행 데이터 렌더링 =================
async function loadMyTrips() {
    const token = localStorage.getItem("token");

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

    document.querySelector(
        ".welcome-title"
    ).innerText = `안녕하세요, ${user.nickname}님! 👋`;

    console.log(user.stats);

    document.querySelector(".allTrips").innerText = user.stats.totalTrips;
    document.querySelector(".completedTrips").innerText =
        user.stats.completedTrips;
    document.querySelector(".achivedBucket").innerText =
        user.stats.completedBucketlists;
    document.querySelector(".visitedPlaces").innerText = user.stats.totalPlaces;
}

loadMyTrips();

document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
        document
            .querySelectorAll(".tab-btn")
            .forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
    });
});

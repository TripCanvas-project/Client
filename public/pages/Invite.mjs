// pages/Invite.mjs
const API_BASE_URL = "http://localhost:8080";

// 초대 메일 발송 (클라이언트 전용)
export async function sendInviteMail(inviteeEmail) {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token found");

    // Main.mjs에서 공유
    const tripId = window.currentTripId;
    if (!tripId) throw new Error("No tripId found");

    const res = await fetch(`${API_BASE_URL}/trip/invite`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            email: inviteeEmail,
            tripId,
        }),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "초대 메일 발송 실패");
    }

    return await res.json();
}

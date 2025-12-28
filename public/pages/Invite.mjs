export async function sendInviteMail(inviteeEmail, currTripId) {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token found");

    const res = await fetch("http://localhost:8080/trip/invite", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            email: inviteeEmail,
            tripId: currTripId,
        }),
    });

    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "초대 실패");
    }

    return await res.json();
}

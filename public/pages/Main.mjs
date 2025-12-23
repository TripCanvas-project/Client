// client/public/pages/Main.mjs
// =====================================================
// TripCanvas Main Page Script (Cleaned)
// - Day 탭별 장소 리스트 + 지도 마커 표시
// - 리스트/마커 클릭 시 "정보 카드(이름+주소)" 표시
// - 숙소 → 1번 / (현재→다음) 구간 폴리라인 + 거리/시간 표시
// - NN + 2-opt로 장소 순서 최적화(클라이언트 UI 순서)
// - ✅ 중복 제거: directions 호출 통일(fetchDirections), 총합/구간 계산 통일(computeDaySegments)
// =====================================================

const API_BASE_URL = "http://localhost:8080";
let currentTripId = null;
let currentUserData = null;

// =====================================================
// ✅ Auth / Token helpers
// =====================================================
function getToken() {
  return localStorage.getItem("token");
}

function requireLogin() {
  const token = getToken();
  if (!token) {
    alert("로그인이 필요합니다.");
    window.location.href = "login.html";
    return false;
  }
  return true;
}

requireLogin();

// =====================================================
// ✅ Security helpers
// =====================================================
function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =====================================================
// ✅ Date helpers
// =====================================================
function fmtDateYMD(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  // ✅ 로컬 기준 YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// =====================================================
// ✅ 탭 전환 helpers
// =====================================================
function switchSidebarTab(tabName) {
  document
    .querySelectorAll(".sidebar-tabs .tab")
    .forEach((t) => t.classList.toggle("active", t.dataset.tab === tabName));

  document
    .querySelectorAll(".tab-content")
    .forEach((c) =>
      c.classList.toggle("active", c.id === `${tabName}-content`)
    );
}

// =====================================================
// ✅ Session 유지 확인 (/user/me)
// =====================================================
async function checkMe() {
  try {
    const token = getToken();
    if (!token) return;

    const res = await fetch(`${API_BASE_URL}/user/me`, {
      method: "POST", // 서버가 GET이면 GET으로 바꾸기
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      alert(
        data.message || "인증 정보가 만료되었습니다. 다시 로그인해 주세요."
      );
      window.location.href = "login.html";
      return;
    }

    console.log("✅ me:", data.user);

    // 사용자 정보 저장
    currentUserData = data.user;
    localStorage.setItem("userId", data.user._id || data.user.userid);
    localStorage.setItem("username", data.user.nickname || "사용자");
  } catch (e) {
    console.error("me error:", e);
    alert("서버 통신 중 오류가 발생했습니다.");
  }
}
checkMe();

// =====================================================
// ✅ 지역(도착지) 옵션 데이터 (원본 유지)
// =====================================================
const subOptionsData = {
  서울특별시: [
    "강남구",
    "강동구",
    "강북구",
    "강서구",
    "관악구",
    "광진구",
    "구로구",
    "금천구",
    "노원구",
    "도봉구",
    "동대문구",
    "동작구",
    "마포구",
    "서대문구",
    "서초구",
    "성동구",
    "성북구",
    "송파구",
    "양천구",
    "영등포구",
    "용산구",
    "은평구",
    "종로구",
    "중구",
    "중랑구",
  ],
  인천광역시: [
    "강화군",
    "계양구",
    "남동구",
    "동구",
    "미추홀구",
    "부평구",
    "서구",
    "연수구",
    "옹진군",
    "중구",
  ],
  대전광역시: ["대덕구", "동구", "서구", "유성구", "중구"],
  대구광역시: [
    "군위군",
    "남구",
    "달서구",
    "달성군",
    "동구",
    "북구",
    "서구",
    "수성구",
    "중구",
    "청도군",
  ],
  광주광역시: ["광산구", "남구", "동구", "북구", "서구", "화순군"],
  부산광역시: [
    "강서구",
    "금정구",
    "기장군",
    "남구",
    "동구",
    "동래구",
    "부산진구",
    "북구",
    "사상구",
    "사하구",
    "서구",
    "수영구",
    "연제구",
    "영도구",
    "중구",
    "해운대구",
  ],
  울산광역시: ["남구", "동구", "북구", "울주군", "중구"],
  세종특별자치시: ["세종특별자치시"],
  경기도: [
    "가평군",
    "고양시",
    "과천시",
    "광명시",
    "광주시",
    "구리시",
    "군포시",
    "김포시",
    "남양주시",
    "동두천시",
    "부천시",
    "성남시",
    "수원시",
    "시흥시",
    "안산시",
    "안성시",
    "안양시",
    "양주시",
    "양평군",
    "여주시",
    "연천군",
    "오산시",
    "용인시",
    "의왕시",
    "의정부시",
    "이천시",
    "파주시",
    "평택시",
    "포천시",
    "하남시",
    "화성시",
  ],
  강원특별자치도: [
    "강릉시",
    "고성군",
    "동해시",
    "삼척시",
    "속초시",
    "양구군",
    "양양군",
    "영월군",
    "원주시",
    "인제군",
    "정선군",
    "철원군",
    "춘천시",
    "태백시",
    "평창군",
    "홍천군",
    "화천군",
    "횡성군",
  ],
  충청북도: [
    "괴산군",
    "단양군",
    "보은군",
    "영동군",
    "옥천군",
    "음성군",
    "제천시",
    "증평군",
    "진천군",
    "청주시",
    "충주시",
  ],
  충청남도: [
    "계룡시",
    "공주시",
    "금산군",
    "논산시",
    "당진시",
    "보령시",
    "부여군",
    "서산시",
    "서천군",
    "아산시",
    "예산군",
    "천안시",
    "청양군",
    "태안군",
    "홍성군",
  ],
  경상북도: [
    "경산시",
    "경주시",
    "고령군",
    "구미시",
    "김천시",
    "문경시",
    "봉화군",
    "상주시",
    "성주군",
    "안동시",
    "영덕군",
    "영양군",
    "영주시",
    "영천시",
    "예천군",
    "울릉군",
    "울진군",
    "의성군",
    "청도군",
    "청송군",
    "칠곡군",
    "포항시",
  ],
  경상남도: [
    "거제시",
    "거창군",
    "고성군",
    "김해시",
    "남해군",
    "밀양시",
    "사천시",
    "산청군",
    "양산시",
    "의령군",
    "진주시",
    "창녕군",
    "창원시",
    "통영시",
    "하동군",
    "함안군",
    "함양군",
    "합천군",
  ],
  전북특별자치도: [
    "고창군",
    "군산시",
    "김제시",
    "남원시",
    "무주군",
    "부안군",
    "순창군",
    "완주군",
    "익산시",
    "임실군",
    "장수군",
    "전주시",
    "정읍시",
    "진안군",
  ],
  전라남도: [
    "강진군",
    "고흥군",
    "곡성군",
    "광양시",
    "구례군",
    "나주시",
    "담양군",
    "목포시",
    "무안군",
    "보성군",
    "순천시",
    "신안군",
    "여수시",
    "영광군",
    "영암군",
    "완도군",
    "장성군",
    "장흥군",
    "진도군",
    "함평군",
    "해남군",
    "홍성군",
    "화순군",
  ],
  제주특별자치도: ["서귀포시", "제주시"],
};

// =====================================================
// ✅ Loading overlay
// =====================================================
const loadingOverlay = document.getElementById("loading-overlay");
function showLoading() {
  if (loadingOverlay) loadingOverlay.classList.remove("hidden");
}
function hideLoading() {
  if (loadingOverlay) loadingOverlay.classList.add("hidden");
}

// =====================================================
// ✅ Budget UI
// =====================================================
function calculateTotalBudget() {
  const personalBudget =
    parseFloat(document.getElementById("personal-budget")?.value) || 0;
  const peopleCount =
    parseInt(document.getElementById("people-count")?.value, 10) || 0;

  const totalBudget = personalBudget * peopleCount;
  const el = document.getElementById("total-budget");
  if (el) el.textContent = totalBudget.toLocaleString("ko-KR") + "원";
}

// =====================================================
// ✅ Map State (Kakao Map)
// =====================================================
let currentMap = null;
let isMapReady = false;
let currentMarkers = [];
let currentInfoOverlay = null;

let currentActiveDay = 1;
let pendingDayToRender = null;

const dayRouteCache = new Map(); // day -> { accLL, orderedPlaces, orderedLLs, acc }
const daySegmentsCache = new Map(); // day -> { segments, back }

let currentRoutePolyline = null;
let currentPolylines = [];
let polylineReqSeq = 0;

// =====================================================
// ✅ Overlay (정보 카드)
// =====================================================
function clearInfoOverlay() {
  if (currentInfoOverlay) currentInfoOverlay.setMap(null);
  currentInfoOverlay = null;
}
window.__tc_closeInfo = () => clearInfoOverlay();

function buildAccInfoHtml(acc) {
  const name = escapeHtml(acc?.title || "숙소");
  const addr = escapeHtml(acc?.addressFull || "주소 정보 없음");

  return `
  <div onclick="event.cancelBubble=true;" style="
    width:380px; max-width:420px;
    background:#fff;
    border:1px solid rgba(0,0,0,0.08);
    border-radius:18px;
    box-shadow:0 16px 44px rgba(0,0,0,0.22);
    overflow:hidden;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto;
  ">
    <div style="
      padding:16px 16px;
      display:flex; gap:12px; align-items:flex-start;
      background:linear-gradient(180deg, rgba(139,92,246,0.16), rgba(255,255,255,1));
      border-bottom:1px solid rgba(0,0,0,0.06);
    ">
      <div style="
        width:38px;height:38px;border-radius:999px;
        display:flex;align-items:center;justify-content:center;
        background:#8b5cf6;color:#fff;font-weight:900;
      ">🏨</div>

      <div style="min-width:0; flex:1;">
        <div style="
          font-size:16px;font-weight:900;line-height:1.2;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        ">${name}</div>
        <div style="margin-top:6px; font-size:12px; color:rgba(0,0,0,0.55);">
          숙소
        </div>
      </div>

      <button onclick="window.__tc_closeInfo(); event.preventDefault(); event.stopPropagation();" style="
        border:0; background:rgba(0,0,0,0.05);
        width:32px;height:32px;border-radius:10px;
        cursor:pointer; font-size:18px; line-height:32px;
      ">x</button>
    </div>

    <div style="padding:16px; font-size:13px; line-height:1.55; color:rgba(0,0,0,0.78);">
      <div style="font-weight:900; margin-bottom:8px; color:rgba(0,0,0,0.55);">주소</div>
      ${addr}
    </div>
  </div>`;
}

function buildPlaceInfoHtml(place, idx, total) {
  const name = escapeHtml(place?.placeName || place?.name || "(이름 없음)");
  const addr = escapeHtml(place?.addressFull || "주소 정보 없음");
  const category = place?.category ?? place?.placeId?.category ?? null;

  return `
  <div onclick="event.cancelBubble=true;" style="
    width:380px; max-width:420px;
    background:#fff;
    border:1px solid rgba(0,0,0,0.08);
    border-radius:18px;
    box-shadow:0 16px 44px rgba(0,0,0,0.22);
    overflow:hidden;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto;
  ">
    <div style="
      padding:16px 16px;
      display:flex; gap:12px; align-items:flex-start;
      background:linear-gradient(180deg, rgba(139,92,246,0.14), rgba(255,255,255,1));
      border-bottom:1px solid rgba(0,0,0,0.06);
    ">
      <div style="
        width:38px;height:38px;border-radius:999px;
        display:flex;align-items:center;justify-content:center;
        font-weight:900;color:#fff;
        background:#8b5cf6;
        box-shadow:0 8px 18px rgba(139,92,246,0.35);
        flex:0 0 auto;
      ">${idx + 1}</div>

      <div style="flex:1; min-width:0;">
        <div style="
          font-size:16px;font-weight:900;line-height:1.2;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        ">${name}</div>

        <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
          <span style="
            font-size:11px;
            padding:5px 10px;
            border-radius:999px;
            background:rgba(0,0,0,0.05);
            color:rgba(0,0,0,0.72);
          ">${
            category ? `#${escapeHtml(String(category))}` : "#카테고리없음"
          }</span>

          <span style="
            font-size:11px;
            padding:5px 10px;
            border-radius:999px;
            background:rgba(139,92,246,0.12);
            color:#6d28d9;
            font-weight:900;
          ">${idx + 1}/${total}</span>
        </div>
      </div>

      <button onclick="window.__tc_closeInfo();" style="
        border:0;background:rgba(0,0,0,0.05);
        width:32px;height:32px;border-radius:10px;
        cursor:pointer; font-size:18px; line-height:32px;
      ">x</button>
    </div>

    <div style="padding:16px; font-size:13px; line-height:1.55; color:rgba(0,0,0,0.78);">
      <div style="font-weight:900; margin-bottom:8px; color:rgba(0,0,0,0.55);">주소</div>
      ${addr}
    </div>
  </div>`;
}

function showAccInfoOverlay() {
  if (!currentMap) return;

  const cached = dayRouteCache.get(currentActiveDay);
  const acc = cached?.acc;
  const accLL = cached?.accLL;
  if (!acc || !accLL) return;

  clearInfoOverlay();

  const pos = new kakao.maps.LatLng(accLL.lat, accLL.lng);
  currentInfoOverlay = new kakao.maps.CustomOverlay({
    position: pos,
    content: buildAccInfoHtml(acc),
    yAnchor: 1.2,
    xAnchor: 0.5,
    zIndex: 999,
    clickable: true,
  });

  currentInfoOverlay.setMap(currentMap);
}

function showPlaceInfoOverlay(posLatLng, place, idx, total) {
  clearInfoOverlay();

  currentInfoOverlay = new kakao.maps.CustomOverlay({
    position: posLatLng,
    content: buildPlaceInfoHtml(place, idx, total),
    yAnchor: 1.2,
    xAnchor: 0.5,
    zIndex: 999,
    clickable: true,
  });

  currentInfoOverlay.setMap(currentMap);
}

// =====================================================
// ✅ Map click marker + accommodation link (NEW)
// =====================================================
let clickMarker = null;

function clearClickMarkerAndLink() {
  if (clickMarker) clickMarker.setMap(null);
  clickMarker = null;
}

async function linkClickedPointToAccommodation(clickedLL) {
  if (!isMapReady || !currentMap) return;

  const cached = dayRouteCache.get(currentActiveDay);
  const accLL = cached?.accLL;
  if (!accLL) {
    alert(
      "현재 Day의 숙소 좌표가 없어서 연결할 수 없어요. (숙소를 먼저 설정해 주세요)"
    );
    return;
  }

  // ✅ 숙소->1번처럼: 이전 요청 무효화 + 다른 장소 연결 싹 지우고(선택->숙소만 남김)
  const seq = ++polylineReqSeq;
  clearPolylines();
  clearRoutePolyline();
  clearInfoOverlay();

  // ✅ 기존 클릭 마커 제거 후 새로 생성
  clearClickMarkerAndLink();

  const pos = new kakao.maps.LatLng(clickedLL.lat, clickedLL.lng);
  clickMarker = new kakao.maps.Marker({ position: pos });
  clickMarker.setMap(currentMap);

  // ✅ 거리/시간 UI 업데이트(숙소->1번처럼)
  const segEl = ensureSegmentStatsEl();
  if (segEl) segEl.textContent = "선택 → 숙소 계산 중…";

  try {
    // ✅ directions: 선택 -> 숙소
    const r = await fetchDirections(clickedLL, accLL);
    if (seq !== polylineReqSeq) return;

    // ✅ 폴리라인은 기존 공통 함수로 통일(outer/inner + currentPolylines에 관리됨)
    drawPolylineFromPoints(r.points, { strokeWeight: 10 });

    // ✅ 거리/시간 표시
    if (segEl)
      segEl.textContent = `선택 → 숙소: ${fmtKm(r.distanceM)} · ${fmtMin(
        r.durationS
      )}`;

    // ✅ 줌/바운드 적용
    fitMapToTwo(r.points, []);
  } catch (e) {
    console.warn("선택→숙소 directions 실패:", e);

    // fallback: 직선
    drawPolylineFromPoints([clickedLL, accLL], { strokeWeight: 10 });
    fitMapToTwo([clickedLL, accLL], []);

    if (segEl) segEl.textContent = "선택 → 숙소 계산 실패(직선 연결 표시)";
  }
}

// =====================================================
// ✅ Coordinates + Optimization (NN + 2-opt)
// =====================================================
function extractLatLng(p) {
  const lat1 = p?.coordinates?.lat ?? p?.lat ?? p?.y ?? p?.latitude;
  const lng1 = p?.coordinates?.lng ?? p?.lng ?? p?.x ?? p?.longitude;

  if (lat1 != null && lng1 != null) {
    const lat = Number(lat1);
    const lng = Number(lng1);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  const s = p?.coords ?? p?.coord;
  if (typeof s === "string") {
    const parts = s.split(",").map((v) => v.trim());
    if (parts.length >= 2) {
      const a = Number(parts[0]);
      const b = Number(parts[1]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lng: b };
        if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return { lat: b, lng: a };
      }
    }
  }
  return null;
}

function dist(a, b) {
  const dx = a.lng - b.lng;
  const dy = a.lat - b.lat;
  return Math.sqrt(dx * dx + dy * dy);
}

function tourLength(originLL, orderedLLs) {
  if (!originLL || !orderedLLs?.length) return 0;

  let sum = 0;
  sum += dist(originLL, orderedLLs[0]);

  for (let i = 0; i < orderedLLs.length - 1; i++) {
    sum += dist(orderedLLs[i], orderedLLs[i + 1]);
  }

  sum += dist(orderedLLs[orderedLLs.length - 1], originLL);
  return sum;
}

function twoOptImprove(originLL, items, maxPasses = 6) {
  if (!originLL || !items || items.length < 4) return items;

  let best = items.slice();
  let bestLen = tourLength(
    originLL,
    best.map((x) => x.ll)
  );

  const reverseSegment = (arr, i, k) => {
    const a = arr.slice(0, i);
    const b = arr.slice(i, k + 1).reverse();
    const c = arr.slice(k + 1);
    return a.concat(b, c);
  };

  for (let pass = 0; pass < maxPasses; pass++) {
    let improved = false;

    for (let i = 1; i < best.length - 2; i++) {
      for (let k = i + 1; k < best.length - 1; k++) {
        const candidate = reverseSegment(best, i, k);
        const candLen = tourLength(
          originLL,
          candidate.map((x) => x.ll)
        );

        if (candLen + 1e-12 < bestLen) {
          best = candidate;
          bestLen = candLen;
          improved = true;
        }
      }
    }

    if (!improved) break;
  }

  return best;
}

function optimizePlacesNearest(originLL, places) {
  const withLL = [];
  const withoutLL = [];

  for (const p of places || []) {
    const ll = extractLatLng(p);
    if (ll) withLL.push({ p, ll });
    else withoutLL.push(p);
  }

  if (withLL.length <= 1) return [...withLL.map((x) => x.p), ...withoutLL];

  const remaining = [...withLL];
  const ordered = [];
  let cur = originLL;

  while (remaining.length) {
    let bestIdx = 0;
    let bestD = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = dist(cur, remaining[i].ll);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }

    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    cur = next.ll;
  }

  const improved = twoOptImprove(originLL, ordered, 6);
  return [...improved.map((x) => x.p), ...withoutLL];
}

// =====================================================
// ✅ Day Cache (숙소 기준 최적화 결과 저장)
// =====================================================
function buildDayRouteCache(dayPlan, day, effectiveAccommodation) {
  const accLL = effectiveAccommodation
    ? extractLatLng(effectiveAccommodation)
    : null;

  if (!accLL) {
    dayRouteCache.delete(day);
    return;
  }

  const places = dayPlan?.places || [];
  const orderedPlaces = optimizePlacesNearest(accLL, places);
  const orderedLLs = orderedPlaces.map(extractLatLng).filter(Boolean);

  dayRouteCache.set(day, {
    accLL,
    orderedPlaces,
    orderedLLs,
    acc: effectiveAccommodation,
  });
}

// =====================================================
// ✅ Directions (points + distance/time) - 단일 진입점
// =====================================================
function toKakaoXY(ll) {
  return `${ll.lng},${ll.lat}`; // "lng,lat"
}

async function fetchDirections(originLL, destLL) {
  const token = getToken();
  if (!token) throw new Error("no token");

  const res = await fetch(`${API_BASE_URL}/route/directions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      origin: toKakaoXY(originLL),
      destination: toKakaoXY(destLL),
      priority: "TIME",
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "directions failed");

  return {
    points: data?.points || [],
    distanceM: Number(data?.distanceM || 0),
    durationS: Number(data?.durationS || 0),
  };
}

// =====================================================
// ✅ Stats UI elements
// =====================================================
function ensureDayStatsEl() {
  let el = document.getElementById("day-route-stats");
  if (!el) {
    const listEl = document.getElementById("ai-day-places");
    if (!listEl) return null;

    el = document.createElement("div");
    el.id = "day-route-stats";
    el.style.margin = "8px 0 12px";
    el.style.fontWeight = "700";
    listEl.parentElement?.insertBefore(el, listEl);
  }
  return el;
}

function ensureAccToFirstBtn(day) {
  let btn = document.getElementById("btn-acc-to-first");
  if (btn) return btn;

  const base = ensureDayStatsEl();
  if (!base) return null;

  btn = document.createElement("button");
  btn.id = "btn-acc-to-first";
  btn.type = "button";
  btn.textContent = "🏨 숙소 → 1번 경로 보기";
  btn.style.margin = "10px 0 14px";
  btn.style.padding = "10px 12px";
  btn.style.border = "1px solid rgba(0,0,0,0.12)";
  btn.style.borderRadius = "12px";
  btn.style.background = "#fff";
  btn.style.cursor = "pointer";
  btn.style.fontWeight = "800";

  btn.addEventListener("click", () => {
    // ✅ 숙소 마커 클릭과 동일한 동작으로
    window.__tc_onAccInfo?.();
  });

  // day-route-stats 바로 아래에 버튼 삽입
  base.parentElement?.insertBefore(btn, base.nextSibling);
  return btn;
}

async function showAccToFirstLeg(day) {
  const cached = dayRouteCache.get(day);
  if (!cached) return;

  const places = cached.orderedPlaces || [];
  const accLL = cached.accLL;
  if (!accLL || places.length === 0) return;

  const firstLL = extractLatLng(places[0]);
  if (!firstLL) return;

  const seq = ++polylineReqSeq;

  clearPolylines();
  clearRoutePolyline();

  const segEl = ensureSegmentStatsEl();
  if (segEl) segEl.textContent = "숙소 → 1번 계산 중…";

  try {
    const r = await fetchDirections(accLL, firstLL);
    if (seq !== polylineReqSeq) return;

    // ✅ 숙소->1번 폴리라인 표시
    drawPolylineFromPoints(r.points, {
      strokeWeight: 10,
    });

    if (segEl)
      segEl.textContent = `다음 이동(숙소 → 1번): ${fmtKm(
        r.distanceM
      )} · ${fmtMin(r.durationS)}`;
    fitMapToTwo(r.points, []);
  } catch (e) {
    console.warn("acc->first 실패:", e);
    if (segEl) segEl.textContent = "숙소 → 1번 계산 실패";
  }
}

function ensureSegmentStatsEl() {
  let el = document.getElementById("segment-route-stats");
  if (!el) {
    const base =
      document.getElementById("day-route-stats") ||
      document.getElementById("ai-day-places");
    if (!base) return null;

    el = document.createElement("div");
    el.id = "segment-route-stats";
    el.style.margin = "6px 0 12px";
    el.style.fontWeight = "700";
    el.style.opacity = "0.85";

    base.parentElement?.insertBefore(el, base.nextSibling);
  }
  return el;
}

function fmtKm(m) {
  return (m / 1000).toFixed(1) + "km";
}

function fmtMin(sec) {
  const m = Math.round(sec / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}시간 ${mm}분` : `${mm}분`;
}

// day의 "직전->현재" 구간들 계산해서 캐시에 저장 + 상단 총합 표시까지 한 번에
async function computeDaySegments(day) {
  const cached = dayRouteCache.get(day);
  if (!cached) return;

  const accLL = cached.accLL;
  const places = cached.orderedPlaces || [];
  if (!accLL || places.length === 0) return;

  const dayEl = ensureDayStatsEl();
  if (dayEl) dayEl.textContent = "총 이동거리/시간 계산 중…";

  const segments = [];
  let prev = accLL;

  try {
    for (let i = 0; i < places.length; i++) {
      const curLL = extractLatLng(places[i]);
      if (!curLL) {
        segments.push({ distanceM: 0, durationS: 0 });
        continue;
      }
      const r = await fetchDirections(prev, curLL);
      segments.push({ distanceM: r.distanceM, durationS: r.durationS });
      prev = curLL;
    }

    const back = await fetchDirections(prev, accLL);
    daySegmentsCache.set(day, { segments, back });

    const totalM =
      segments.reduce((s, x) => s + (x.distanceM || 0), 0) +
      (back.distanceM || 0);
    const totalS =
      segments.reduce((s, x) => s + (x.durationS || 0), 0) +
      (back.durationS || 0);

    if (dayEl)
      dayEl.textContent = `총 이동거리 ${fmtKm(
        totalM
      )} · 예상 이동시간 ${fmtMin(totalS)}`;
  } catch (e) {
    console.error("computeDaySegments failed:", e);
    if (dayEl) dayEl.textContent = "총 이동거리/시간 계산 실패";
  }
}

// =====================================================
// ✅ Polyline helpers
// =====================================================
function clearPolylines() {
  currentPolylines.forEach((pl) => pl.setMap(null));
  currentPolylines = [];
}

function clearRoutePolyline() {
  if (currentRoutePolyline) currentRoutePolyline.setMap(null);
  currentRoutePolyline = null;
}

function drawPolylineFromPoints(points, opts = {}) {
  if (!currentMap || !points?.length) return null;

  const path = points.map((p) => new kakao.maps.LatLng(p.lat, p.lng));

  // ✅ 겉선(테두리): 불투명 흰색
  const outer = new kakao.maps.Polyline({
    path,
    strokeWeight: (opts.strokeWeight ?? 6) + 4, // 테두리 두께 = 안쪽보다 더 두껍게
    strokeColor: opts.outerColor ?? "#ffffff",
    strokeOpacity: opts.outerOpacity ?? 1,
    strokeStyle: opts.strokeStyle ?? "solid",
  });

  // ✅ 안쪽선: 밝은 녹색
  const inner = new kakao.maps.Polyline({
    path,
    strokeWeight: opts.strokeWeight ?? 6,
    strokeColor: opts.strokeColor ?? "#22c55e",
    strokeOpacity: opts.strokeOpacity ?? 0.95,
    strokeStyle: opts.strokeStyle ?? "solid",
  });

  outer.setMap(currentMap);
  inner.setMap(currentMap);

  // ✅ clearPolylines()로 같이 지워지도록 둘 다 넣기
  currentPolylines.push(outer, inner);

  // 기존 호출부 호환을 위해 inner를 리턴
  return inner;
}

function fitMapToTwo(pointsA = [], pointsB = []) {
  const all = [...pointsA, ...pointsB];
  if (!all.length || !currentMap) return;

  const bounds = new kakao.maps.LatLngBounds();
  all.forEach((p) => bounds.extend(new kakao.maps.LatLng(p.lat, p.lng)));
  currentMap.setBounds(bounds);
}

async function drawAccToFirstPlaceRoute(dayPlan, effectiveAccommodation) {
  try {
    if (!isMapReady || !currentMap) return;

    clearPolylines();
    clearRoutePolyline();

    const acc = effectiveAccommodation;
    const firstPlace = dayPlan?.places?.[0];
    if (!acc || !firstPlace) return;

    const accLL = extractLatLng(acc);
    const firstLL = extractLatLng(firstPlace);
    if (!accLL || !firstLL) return;

    // ✅ 표시 엘리먼트
    const segEl = ensureSegmentStatsEl();
    if (segEl) segEl.textContent = "숙소 → 1번 계산 중…";

    const r = await fetchDirections(accLL, firstLL);

    // ✅ 시간/거리 텍스트 표시
    if (segEl) {
      segEl.textContent = `다음 이동(숙소 → 1번): ${fmtKm(
        r.distanceM
      )} · ${fmtMin(r.durationS)}`;
    }

    const pts = Array.isArray(r?.points) ? r.points : [];

    if (pts.length) {
      // ✅ 기존 routePolyline 대신, 이중 폴리라인으로 그림
      clearPolylines(); // 숙소→1번만 보여주려면 먼저 지우는 게 깔끔
      drawPolylineFromPoints(pts, {
        strokeWeight: 6,
        strokeColor: "#22c55e", // 안쪽 밝은 녹색
        strokeOpacity: 0.95,
        outerColor: "#ffffff", // 겉 흰색
        outerOpacity: 1,
      });

      fitMapToTwo(pts, []);
    } else {
      fitMapToTwo([accLL, firstLL], []);
    }

    // ✅ 너무 타이트하면 살짝 줌아웃(선택)
    // currentMap.setLevel(currentMap.getLevel() + 1);
  } catch (e) {
    console.error("drawAccToFirstPlaceRoute error:", e);
    const segEl = ensureSegmentStatsEl();
    if (segEl) segEl.textContent = "숙소 → 1번 계산 실패";
  }
}

// ✅ idx 클릭 시: (숙소→1) 또는 (현재→다음) 또는 (마지막→숙소) 구간 표시 + 텍스트 표시
async function showNextLegFromPlaceIdx(idx) {
  const cached = dayRouteCache.get(currentActiveDay);
  if (!cached) return;

  const places = cached.orderedPlaces || [];
  const accLL = cached.accLL;

  const cur = places[idx];
  if (!cur) return;

  const curLL = extractLatLng(cur);
  if (!curLL) return;

  // ✅ 규칙: idx 클릭이면 (idx+1번 장소) → (idx+2번 장소)
  // 단, 마지막이면 마지막 → 숙소
  let fromLL = curLL;
  let toLL = null;
  let label = "";

  if (idx === places.length - 1) {
    toLL = accLL;
    label = `다음 이동(${idx + 1} → 숙소)`;
  } else {
    toLL = extractLatLng(places[idx + 1]);
    label = `다음 이동(${idx + 1} → ${idx + 2})`;
  }

  const seq = ++polylineReqSeq;

  clearRoutePolyline();
  clearPolylines();

  const segEl = ensureSegmentStatsEl();
  if (segEl) segEl.textContent = "다음 구간 계산 중…";

  try {
    if (!toLL) {
      if (segEl) segEl.textContent = "";
      return;
    }

    const r = await fetchDirections(fromLL, toLL);
    if (seq !== polylineReqSeq) return;

    drawPolylineFromPoints(r.points, {
      strokeWeight: 10,
    });

    if (segEl)
      segEl.textContent = `${label}: ${fmtKm(r.distanceM)} · ${fmtMin(
        r.durationS
      )}`;
    fitMapToTwo(r.points, []);
  } catch (e) {
    console.warn("next directions 실패:", e);
    if (segEl) segEl.textContent = "다음 구간 계산 실패";
  }
}

// =====================================================
// 내 여행 불러오기 사이드 탭에
// =====================================================
async function loadMyTripsIntoTemplate() {
  const wrap = document.getElementById("my-trips-list");
  if (!wrap) return;

  wrap.innerHTML = `<div class="place-description">불러오는 중…</div>`;

  const token = getToken(); // 토큰 헬퍼 이미 있음 :contentReference[oaicite:3]{index=3}
  if (!token) return;

  const res = await fetch(`${API_BASE_URL}/trip/mine`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    wrap.innerHTML = `<div class="place-description">불러오기 실패: ${escapeHtml(
      data?.message || "오류"
    )}</div>`;
    return;
  }

  const trips = Array.isArray(data?.trips) ? data.trips : [];
  if (!trips.length) {
    wrap.innerHTML = `<div class="place-description">저장된 여행이 없습니다.</div>`;
    return;
  }

  wrap.innerHTML = "";
  trips.forEach((t) => {
    const card = document.createElement("div");
    card.className = "template-card";

    card.innerHTML = `
    <div class="template-name">${escapeHtml(t.title || "제목 없음")}</div>
    <div class="template-desc">
      ${escapeHtml(t.description || "")}
      <div style="margin-top:8px; opacity:.7; font-size:12px;">
        ${escapeHtml(fmtDateYMD(t.startDate))} ~ ${escapeHtml(
      fmtDateYMD(t.endDate)
    )}
      </div>
      <button class="btn-generate" style="margin-top:12px; width:100%; padding:10px;">
        ✅ 이 여행 선택
      </button>
    </div>
  `;

    const btn = card.querySelector("button");
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      switchSidebarTab("route");
      await loadRouteForTripAndRenderTabs(t._id);
    });

    wrap.appendChild(card);
  });
}

// =====================================================
// ✅ Markers
// =====================================================
function clearMarkers() {
  currentMarkers.forEach((m) => m.setMap(null));
  currentMarkers = [];
  clearInfoOverlay();
  clearPolylines();
  clearRoutePolyline();
  clearClickMarkerAndLink();
}

function renderMarkersForDay(dayPlan, day, effectiveAccommodation) {
  if (!dayPlan) return;

  currentActiveDay = day;

  if (!isMapReady || !currentMap) {
    pendingDayToRender = { dayPlan, day, effectiveAccommodation };
    return;
  }

  clearMarkers();

  const bounds = new kakao.maps.LatLngBounds();
  let count = 0;

  const places = dayPlan.places || [];
  places.forEach((p, idx) => {
    const ll = extractLatLng(p);
    if (!ll) return;

    const pos = new kakao.maps.LatLng(ll.lat, ll.lng);
    bounds.extend(pos);
    count++;

    const title = escapeHtml(p.placeName || p.name || "장소");
    const bg = day === 1 ? "#ff5a5f" : day === 2 ? "#1e90ff" : "#22c55e";

    const content = `
      <div
        onclick="window.__tc_onPlaceInfo(${idx})"
        title="${title}"
        style="
          width:28px;height:28px;border-radius:999px;
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:900;color:#fff;
          background:${bg};
          border:2px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,0.25);
          user-select:none;
          cursor:pointer;
        "
      >${idx + 1}</div>
    `;

    const overlay = new kakao.maps.CustomOverlay({
      position: pos,
      content,
      yAnchor: 1,
      xAnchor: 0.5,
      zIndex: 10,
      clickable: true,
    });

    overlay.setMap(currentMap);
    currentMarkers.push(overlay);
  });

  if (effectiveAccommodation) {
    const accLL = extractLatLng(effectiveAccommodation);
    if (accLL) {
      const pos = new kakao.maps.LatLng(accLL.lat, accLL.lng);
      bounds.extend(pos);
      count++;

      const accTitle = escapeHtml(effectiveAccommodation.title || "숙소");

      const accContent = `
        <div
          onclick="window.__tc_onAccInfo()"
          title="${accTitle}"
          style="
            width:34px;height:34px;border-radius:999px;
            display:flex;align-items:center;justify-content:center;
            font-size:14px;font-weight:900;color:#fff;
            background:#8b5cf6;
            border:2px solid #fff;
            box-shadow:0 2px 8px rgba(0,0,0,0.28);
            user-select:none;
            cursor:pointer;
          "
        >🏨</div>
      `;

      const accOverlay = new kakao.maps.CustomOverlay({
        position: pos,
        content: accContent,
        yAnchor: 1,
        xAnchor: 0.5,
        zIndex: 20,
        clickable: true,
      });

      accOverlay.setMap(currentMap);
      currentMarkers.push(accOverlay);
    }
  }

  console.log(
    `✅ Day${day} 마커 생성 개수:`,
    count,
    "/ places:",
    places.length
  );

  if (count === 0) return;
  if (count === 1) {
    currentMap.setCenter(bounds.getSouthWest());
    currentMap.setLevel(5);
  } else {
    currentMap.setBounds(bounds);
  }
}

// =====================================================
// ✅ Global click handlers (리스트/마커 공용)
// =====================================================
window.__tc_onPlaceInfo = (idx) => {
  const cached = dayRouteCache.get(currentActiveDay);
  if (!cached) return;

  const place = cached.orderedPlaces?.[idx];
  if (!place) return;

  const ll = extractLatLng(place);
  if (!ll) return;

  const pos = new kakao.maps.LatLng(ll.lat, ll.lng);
  showPlaceInfoOverlay(pos, place, idx, cached.orderedPlaces.length);

  showNextLegFromPlaceIdx(idx);
};

window.__tc_onAccInfo = () => {
  showAccInfoOverlay();

  const cached = dayRouteCache.get(currentActiveDay);
  if (!cached) return;

  // ✅ 지도 중심을 숙소로 이동
  if (currentMap && cached.accLL) {
    const pos = new kakao.maps.LatLng(cached.accLL.lat, cached.accLL.lng);
    currentMap.panTo(pos); // 부드럽게 이동
    // currentMap.setCenter(pos); // 즉시 이동을 원하면 이걸 사용
    // currentMap.setLevel(4);    // 원하면 줌 레벨도 고정
  }
  drawAccToFirstPlaceRoute({ places: cached.orderedPlaces }, cached.acc);
};

// =====================================================
// ✅ Accommodation fallback
// =====================================================
function getEffectiveAccommodation(plansSorted, activeDay) {
  let lastAcc = null;

  for (const dp of plansSorted) {
    if (dp.day > activeDay) break;

    const a = dp.accommodation;
    const normalized = !a ? null : typeof a === "string" ? { placeId: a } : a;

    const hasCoords =
      normalized?.coords ||
      normalized?.coordinates ||
      normalized?.lat ||
      normalized?.lng;

    if (normalized && hasCoords) {
      lastAcc = normalized;
    } else if (normalized && (normalized.title || normalized.addressFull)) {
      lastAcc = normalized;
    }
  }

  return lastAcc;
}

// =====================================================
// ✅ Places List UI
// =====================================================
function renderPlacesList(dayPlan) {
  const listEl = document.getElementById("ai-day-places");
  if (!listEl) return;

  listEl.innerHTML = "";

  // ✅ (추가) 숙소 → 1번 경로를 "장소처럼" 리스트에 넣기
  const accCard = document.createElement("div");
  accCard.className = "place-item";
  accCard.style.cursor = "pointer";

  // 숙소→1번 구간은 segments[0]
  const cache = daySegmentsCache.get(currentActiveDay);
  const seg0 = cache?.segments?.[0];

  const segText0 = seg0
    ? `${fmtKm(seg0.distanceM)} · ${fmtMin(seg0.durationS)}`
    : "이동 계산 전";

  accCard.innerHTML = `
  <div class="place-name">
    <span class="place-number">🏨</span>
    숙소 → 1번 경로
  </div>
  <div class="place-description">${segText0}</div>
`;

  accCard.addEventListener("click", () => {
    window.__tc_onAccInfo?.(); // 기존 "숙소→1번 보기"와 동일 동작
  });

  listEl.appendChild(accCard);

  const places = dayPlan?.places || [];
  if (places.length === 0) {
    listEl.innerHTML = `<div class="place-description">장소가 없습니다.</div>`;
    return;
  }

  places.forEach((p, idx) => {
    const category = p.category ?? p.placeId?.category ?? null;
    const addr = p.addressFull || p.address?.full || "";
    const description = p.description;

    const descText =
      (description && escapeHtml(description)) ||
      (addr && escapeHtml(addr)) ||
      "설명 정보 없음";

    const card = document.createElement("div");
    card.className = "place-item";
    card.style.cursor = "pointer";

    const cache = daySegmentsCache.get(currentActiveDay);
    const segOut =
      idx < places.length - 1
        ? cache?.segments?.[idx + 1] // ✅ idx=0이면 1→2, idx=1이면 2→3 ...
        : cache?.back; // ✅ 마지막 → 숙소

    const segText = segOut
      ? `예상 이동 : ${fmtKm(segOut.distanceM)} · 예상 시간 : ${fmtMin(
          segOut.durationS
        )}`
      : "이동 계산 전";

    card.innerHTML = `
      <div class="place-name">
        <span class="place-number">${idx + 1}</span>
        ${escapeHtml(p.placeName || p.name || "(이름 없음)")}
      </div>

      <div class="place-description">
        ${descText}
      </div>

      <div class="place-move">${segText}</div>

      <div class="place-tags">
        ${
          category
            ? `<span class="tag">#${escapeHtml(String(category))}</span>`
            : `<span class="tag">#카테고리없음</span>`
        }
      </div>
    `;

    card.addEventListener("click", () => {
      window.__tc_onPlaceInfo?.(idx);

      listEl
        .querySelectorAll(".place-item")
        .forEach((el) => el.classList.remove("active"));
      card.classList.add("active");
    });

    listEl.appendChild(card);
  });
}

// =====================================================
// ✅ Route Load + Day Tabs
// =====================================================
async function loadLatestRouteAndRenderTabs() {
  const token = getToken();
  if (!token) return;

  const res = await fetch(`${API_BASE_URL}/route/latest`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.warn("⚠️ /route/latest 실패:", res.status);
    return;
  }

  const data = await res.json();

  currentTripId = data.route?.tripId;

  if (currentTripId) {
    console.log(`Current Trip ID: ${currentTripId}`);
    localStorage.setItem("lastTripId", currentTripId);
  }

  renderDayTabs(data.route);
}

async function loadRouteForTripAndRenderTabs(tripId) {
  const token = getToken();
  if (!token) return;

  const res = await fetch(`${API_BASE_URL}/route/by-trip/${tripId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert(data?.message || "Trip 경로 불러오기 실패");
    return;
  }

  const data = await res.json();

  // tripId 저장
  currentTripId = tripId;
  localStorage.setItem("lastTripId", tripId);

  renderDayTabs(data.route);
}

function renderDayTabs(route) {
  const tabsEl = document.getElementById("ai-day-tabs");
  if (!tabsEl) return;

  tabsEl.innerHTML = "";

  const plans = (route.dailyPlans || []).slice().sort((a, b) => a.day - b.day);
  if (plans.length === 0) return;

  let activeDay = plans.find((p) => p.day === 1)?.day ?? plans[0].day;

  const setActive = async (day) => {
    activeDay = day;
    currentActiveDay = day;

    tabsEl.querySelectorAll(".day-tab").forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.day) === day);
    });

    const dp = plans.find((p) => p.day === day);
    if (!dp) return;

    const effectiveAcc = getEffectiveAccommodation(plans, day);

    buildDayRouteCache(dp, day, effectiveAcc);

    const cached = dayRouteCache.get(day);
    const dpForUI = cached ? { ...dp, places: cached.orderedPlaces } : dp;

    // 1) 먼저 화면 뿌리기
    renderPlacesList(dpForUI);
    renderMarkersForDay(dpForUI, day, effectiveAcc);
    drawAccToFirstPlaceRoute(dpForUI, effectiveAcc);

    // 2) 총합 + 구간 계산(캐시 저장) → 리스트 다시 렌더
    await computeDaySegments(day);
    renderPlacesList(dpForUI);

    // ✅ 기본값: 예상 경로를 "숙소 → 1번"으로 설정
    window.__tc_onAccInfo?.();
  };

  plans.forEach((dp) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-tab";
    btn.dataset.day = dp.day;
    btn.textContent = `Day ${dp.day}`;
    btn.addEventListener("click", () => setActive(dp.day));
    tabsEl.appendChild(btn);
  });

  setActive(activeDay);
}

// =====================================================
// ✅ Kakao Map init
// =====================================================
function initKakaoMap() {
  const mapContainer = document.getElementById("kakao-map");
  if (!mapContainer) {
    console.error("카카오 지도를 표시할 요소를 찾을 수 없습니다: #kakao-map");
    return;
  }

  const mapOption = {
    center: new kakao.maps.LatLng(37.566826, 126.9786567),
    level: 3,
  };

  currentMap = new kakao.maps.Map(mapContainer, mapOption);
  isMapReady = true;

  // ✅ 지도 클릭하면: 마커 찍고 숙소와 연결
  kakao.maps.event.addListener(currentMap, "click", (mouseEvent) => {
    const latlng = mouseEvent.latLng;
    const clickedLL = { lat: latlng.getLat(), lng: latlng.getLng() };
    linkClickedPointToAccommodation(clickedLL);
  });

  // 드로잉 기능 추가
  setupCanvas();
  setupDrawingTools();

  // 지도 이벤트에 메모 랜더링 추가
  kakao.maps.event.addListener(currentMap, "zoom_changed", () => {
    renderMemos();
  });
  kakao.maps.event.addListener(currentMap, "dragend", () => {
    renderMemos();
  });
  kakao.maps.event.addListener(currentMap, "center_changed", () => {
    renderMemos();
  });

  // ✅ 지도 클릭하면: 마커 찍고 숙소와 연결
  kakao.maps.event.addListener(currentMap, "click", (mouseEvent) => {
    const latlng = mouseEvent.latLng;
    const clickedLL = { lat: latlng.getLat(), lng: latlng.getLng() };
    linkClickedPointToAccommodation(clickedLL);
  });

  if (pendingDayToRender) {
    renderMarkersForDay(
      pendingDayToRender.dayPlan,
      pendingDayToRender.day,
      pendingDayToRender.effectiveAccommodation
    );
    pendingDayToRender = null;
  }

  const mapPlaceholder = document.querySelector(".map-placeholder");
  if (mapPlaceholder) mapPlaceholder.style.display = "none";

  console.log("✅ 카카오 지도가 성공적으로 초기화되었습니다.");
}
// =====================================================
// ✅ DOMContentLoaded (Main Wiring)
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------
  // 도착지 선택(세부사항)
  // -----------------------------
  const mainSelection = document.getElementById("destination");
  const subSelection = document.getElementById("sub-destination");
  attachMyLocationButtonToDeparture();

  if (mainSelection && subSelection) {
    mainSelection.addEventListener("change", function () {
      const selectedCategory = this.value;
      subSelection.innerHTML =
        '<option value="">세부 항목을 선택하세요</option>';

      const options = subOptionsData[selectedCategory];
      if (options && options.length > 0) {
        options.forEach((item) => {
          const newOption = document.createElement("option");
          newOption.value = item;
          newOption.textContent = item;
          subSelection.appendChild(newOption);
        });
      } else {
        subSelection.innerHTML =
          '<option value="">선택 가능한 항목이 없습니다</option>';
      }

      initCollaboration();
    });
  }

  // -----------------------------
  // 여행 스타일 칩 선택
  // -----------------------------
  const chipsContainer = document.getElementById("travel-style-chips");
  const hiddenInput = document.getElementById("selected-styles");

  function updateSelectedStyles() {
    if (!chipsContainer) return;

    const selectedChips = chipsContainer.querySelectorAll(".chip.selected");
    const selectedValues = [];

    selectedChips.forEach((chip) => {
      const value = chip.getAttribute("data-value") || chip.textContent.trim();
      selectedValues.push(value);
    });

    const resultString = selectedValues.join(", ");
    if (hiddenInput) hiddenInput.value = resultString;

    console.log("현재 선택된 여행 스타일:", resultString);
  }

  if (chipsContainer) {
    chipsContainer.addEventListener("click", (e) => {
      const clickedChip = e.target.closest(".chip");
      if (!clickedChip) return;
      clickedChip.classList.toggle("selected");
      updateSelectedStyles();
    });
    updateSelectedStyles();
  }

  // -----------------------------
  // 총 예산
  // -----------------------------
  document
    .getElementById("personal-budget")
    ?.addEventListener("input", calculateTotalBudget);
  document
    .getElementById("people-count")
    ?.addEventListener("input", calculateTotalBudget);
  calculateTotalBudget();

  // -----------------------------
  // 여행 계획 생성 버튼
  // -----------------------------
  const generatePlanButton = document.getElementById("btn-generate");
  if (generatePlanButton) {
    generatePlanButton.addEventListener("click", async () => {
      showLoading();

      const departure = document.getElementById("departure")?.value.trim();
      const destination = document.getElementById("destination")?.value.trim();
      const startDate = document.getElementById("start-date")?.value;
      const endDate = document.getElementById("end-date")?.value;

      if (!departure || !destination || !startDate || !endDate) {
        hideLoading();
        alert("출발지, 도착지, 여행 날짜를 모두 입력해주세요!");
        return;
      }

      const token = getToken();

      const tripData = {
        start_loc: departure,
        end_area: destination,
        detail_addr: document.getElementById("sub-destination")?.value || "",
        start_date: startDate,
        end_date: endDate,
        budget_per_person: parseInt(
          document.getElementById("personal-budget")?.value || "0",
          10
        ),
        total_people: parseInt(
          document.getElementById("people-count")?.value || "0",
          10
        ),
        place_themes: document.getElementById("selected-styles")?.value || "",
        accommodation_theme: "숙소",
      };

      try {
        const response = await fetch(`${API_BASE_URL}/plan/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(tripData),
        });

        const data = await response.json();

        if (response.ok) {
          console.log("여행 계획 생성 성공:", data);
          await loadLatestRouteAndRenderTabs();
        } else {
          alert(`계획 생성 실패: ${data.message || "오류"}`);
        }
      } catch (error) {
        console.error("통신 오류:", error);
        alert("서버 통신 중 오류가 발생했습니다.");
      } finally {
        hideLoading();
      }
    });
  }

  // ==============================
  // ✅ 출발지 옆 "현재 위치" 버튼 (HTML에 버튼 없음 전제)
  // ==============================
  function attachMyLocationButtonToDeparture() {
    const depInput = document.getElementById("departure");
    if (!depInput) return;

    // 이미 붙어있으면 중복 생성 방지
    if (document.getElementById("btn-departure-mypos")) return;

    // ✅ input+button을 한 줄로 만들 wrapper
    let wrap = depInput.closest(".input-with-btn");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "input-with-btn";
      depInput.parentNode.insertBefore(wrap, depInput);
      wrap.appendChild(depInput);
    }

    // ✅ 버튼 생성
    const btn = document.createElement("button");
    btn.id = "btn-departure-mypos";
    btn.type = "button";
    btn.className = "icon-btn";
    btn.textContent = "📍";
    btn.title = "현재 위치로 출발지 입력";
    wrap.appendChild(btn);

    // ✅ 클릭 이벤트
    btn.addEventListener("click", () => {
      if (!navigator.geolocation) {
        alert("이 브라우저는 위치 기능을 지원하지 않아요.");
        return;
      }

      btn.disabled = true;
      const prevText = btn.textContent;
      btn.textContent = "…";

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          // 1) 지도 이동
          if (currentMap && window.kakao?.maps?.LatLng) {
            try {
              currentMap.panTo(new kakao.maps.LatLng(lat, lng));
            } catch {}
          }

          // 2) 지도 클릭과 동일 동작 (마커 + 선택→숙소 경로)
          linkClickedPointToAccommodation({ lat, lng });

          // 3) 출발지 input 채우기(주소/좌표)
          if (window.kakao?.maps?.services?.Geocoder) {
            const geocoder = new kakao.maps.services.Geocoder();
            geocoder.coord2Address(lng, lat, (result, status) => {
              if (
                status === kakao.maps.services.Status.OK &&
                result?.[0]?.address?.address_name
              ) {
                depInput.value = result[0].address.address_name;
              } else {
                depInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
              }
            });
          } else {
            depInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          }

          btn.disabled = false;
          btn.textContent = prevText;
        },
        (err) => {
          console.warn("geolocation error:", err);
          if (err.code === 1)
            alert("위치 권한이 거부됐어요. 브라우저 권한을 허용해 주세요.");
          else alert("현재 위치를 가져오지 못했어요.");
          btn.disabled = false;
          btn.textContent = prevText;
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  }

  // -----------------------------
  // 사이드바 탭 전환
  // -----------------------------
  document.querySelectorAll(".sidebar-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab;

      document
        .querySelectorAll(".sidebar-tabs .tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((content) => content.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(`${tabName}-content`)?.classList.add("active");

      // ✅ (추가) 템플릿 탭 클릭 시 내 여행 목록 로드
      if (tabName === "template") loadMyTripsIntoTemplate();
    });
  });

  // -----------------------------
  // 패널 탭 전환
  // -----------------------------
  document.querySelectorAll(".panel-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const panelName = tab.dataset.panel;

      document
        .querySelectorAll(".panel-tabs .tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".panel-tab-content")
        .forEach((content) => content.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(`${panelName}-content`)?.classList.add("active");

      const chatInput = document.querySelector(".chat-input");
      if (chatInput)
        chatInput.style.display = panelName === "chat" ? "flex" : "none";
    });
  });

  // -----------------------------
  // 일정 추가/취소/저장
  // -----------------------------
  document.getElementById("add-schedule-btn")?.addEventListener("click", () => {
    document.getElementById("schedule-form").style.display = "block";
    document.getElementById("add-schedule-btn").style.display = "none";
  });

  document
    .getElementById("cancel-schedule-btn")
    ?.addEventListener("click", () => {
      document.getElementById("schedule-form").style.display = "none";
      document.getElementById("add-schedule-btn").style.display = "block";

      document.getElementById("schedule-time").value = "";
      document.getElementById("schedule-title").value = "";
      document.getElementById("schedule-location").value = "";
    });

  document
    .getElementById("save-schedule-btn")
    ?.addEventListener("click", () => {
      const time = document.getElementById("schedule-time").value;
      const title = document.getElementById("schedule-title").value;
      const location = document.getElementById("schedule-location").value;

      if (!time || !title || !location) {
        alert("모든 필드를 입력해주세요!");
        return;
      }

      const scheduleList = document.getElementById("schedule-list");
      const newSchedule = document.createElement("div");
      newSchedule.className = "schedule-item";
      newSchedule.innerHTML = `
      <div class="schedule-info">
        <div class="schedule-time">⏰ ${escapeHtml(time)}</div>
        <div class="schedule-title">${escapeHtml(title)}</div>
        <div class="schedule-location">📍 ${escapeHtml(location)}</div>
      </div>
      <div class="schedule-actions">
        <button class="btn-icon" title="수정" onclick="alert('수정 기능')">✏️</button>
        <button class="btn-icon" title="삭제" onclick="this.closest('.schedule-item').remove()">🗑️</button>
      </div>
    `;
      scheduleList.appendChild(newSchedule);

      document.getElementById("schedule-form").style.display = "none";
      document.getElementById("add-schedule-btn").style.display = "block";
      document.getElementById("schedule-time").value = "";
      document.getElementById("schedule-title").value = "";
      document.getElementById("schedule-location").value = "";

      alert("일정이 추가되었습니다! ✅");
    });

  // -----------------------------
  // 채팅 전송
  // -----------------------------
  document.getElementById("chat-send-btn")?.addEventListener("click", () => {
    const input = document.getElementById("chat-input");
    const message = input.value.trim();

    if (message) {
      const chatMessages = document.getElementById("chat-messages");
      const newMessage = document.createElement("div");
      newMessage.className = "message";
      newMessage.innerHTML = `
        <div class="message-author">나</div>
        <div class="message-text">${escapeHtml(message)}</div>
        <div class="message-time">방금</div>
      `;
      chatMessages.appendChild(newMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      input.value = "";
    }
  });

  document.getElementById("chat-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") document.getElementById("chat-send-btn")?.click();
  });

  // -----------------------------
  // 초기 루트 로드
  // -----------------------------
  loadLatestRouteAndRenderTabs();

  // -----------------------------
  // 카카오 지도 로드/초기화
  // -----------------------------
  if (window.kakao && window.kakao.maps) {
    if (typeof kakao.maps.load === "function") {
      kakao.maps.load(() => initKakaoMap());
    } else {
      initKakaoMap();
    }
  } else {
    console.error("Kakao 지도 스크립트가 로드되지 않았습니다.");
  }

  // -----------------------------
  // 로그아웃
  // -----------------------------
  document.getElementById("logout-button")?.addEventListener("click", () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      alert("로그아웃 되었습니다!");
      window.location.href = "login.html";
    }
  });
});

// ==========================================================
import Collaboration from "./Collaboration.mjs";
import VideoChat from "./VideoChat.mjs";

// ==================== 지도 & 드로잉 시스템 ====================
let canvas = null;
let ctx = null;
let currentTool = "pan";
let memos = [];
let isDrawing = false;
let currentPath = [];
let undoStack = [];
let collaboration = null;
let videoChat = null;

function setupCanvas() {
  const mapCanvas = document.querySelector(".map-canvas");

  // Canvase 요소 생성
  canvas = document.createElement("canvas");
  canvas.id = "drawing-canvas";
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "auto";
  canvas.style.zIndex = "10";

  mapCanvas.appendChild(canvas);

  // Canvas 크기 설정
  const resizeCanvas = () => {
    canvas.width = mapCanvas.clientWidth;
    canvas.height = mapCanvas.clientHeight;
    renderMemos();
  };

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  ctx = canvas.getContext("2d"); // 2D 그래픽 컨텍스트 생성(CanvasRenderingContext2D)

  // Canvas 마우스 이벤트
  canvas.addEventListener("mousedown", handleCanvasMouseDown);
  canvas.addEventListener("mousemove", handleCanvasMouseMove);
  canvas.addEventListener("mouseup", handleCanvasMouseUp);
  canvas.addEventListener("mouseout", handleCanvasMouseUp);

  // Canvas 터치 이벤트
  canvas.addEventListener("touchstart", handleCanvasTouchStart);
  canvas.addEventListener("touchmove", handleCanvasTouchMove);
  canvas.addEventListener("touchend", handleCanvasTouchEnd);
  canvas.addEventListener("touchcancel", handleCanvasTouchEnd);
}

// 드로잉 도구 설정
function setupDrawingTools() {
  const toolButtons = document.querySelectorAll(".tool-btn");
  const tools = ["pan", "memo", "highlight", "text", "eraser", "undo"];

  toolButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      const tool = tools[index];

      // Undo는 즉시 실행
      if (tool === "undo") {
        undoLastMemo();
        return;
      }

      // 도구 변경
      currentTool = tool;

      // 활성화 스타일
      toolButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // pan 모드일 때는 지도 드래그 가능, 아니면 불가
      if (tool === "pan") {
        currentMap.setDraggable(true);
        currentMap.setZoomable(true);
        canvas.style.pointerEvents = "none";
      } else {
        currentMap.setDraggable(false);
        currentMap.setZoomable(false);
        canvas.style.pointerEvents = "auto";
      }

      console.log("Tool changed:", tool);
    });
  });
}

// 마우스 다운 이벤트
function handleCanvasMouseDown(e) {
  if (currentTool === "pan") return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clinetX - rect.left;
  const y = e.clientY - rect.top;

  if (currentTool === "eraser") {
    // 지우개: 클릭한 위치의 메모 삭제
    const clickedMemo = findMemoAtPosition(x, y);
    if (clickedMemo) {
      removeMemo(clickedMemo._id);
    }
    return;
  }

  if (currentTool === "text") {
    // 텍스트 입력
    const text = prompt("메모 내용을 입력하세요:");
    if (text) {
      const latLng = pixelToLatLng(x, y);
      addTextMemo(text, latLng);
    }
    return;
  }

  // 드로잉 시작
  isDrawing = true;
  currentPath = [{ x, y, latLng: pixelToLatLng(x, y) }];
}

// 마우스 이동 이벤트
function handleCanvasMouseMove(e) {
  if (!isDrawing) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  currentPath.push({ x, y, latLng: pixelToLatLng(x, y) });

  // 실시간 미리보기
  renderMemos();
  drawPathPreview(currentPath);
}

// 마우스 업 이벤트
function handleCanvasMouseUp(e) {
  if (!isDrawing) return;

  isDrawing = false;

  if (currentPath.length > 2) {
    // 점 3개 이상이 모여야 선
    // 메모 생성
    const memo = {
      id: crypto.randomUUID(),
      type: "path",
      coords: currentPath.map((p) => p.latLng), // 지도를 확대하거나 축소해도 메모가 엉뚱한 곳으로 가지 않고 실제 지리적 위치에 고정
      style: {
        color: currentTool === "highlight" ? "#ffeb3b" : "#ff5252",
        width: currentTool === "highlight" ? 8 : 3,
        opacity: currentTool === "highlight" ? 0.6 : 1,
      },
      createdBy: localStorage.getItem("userId") || "anonymous", // 메모 생성자
      timeStamp: Date.now(), // 메모 생성 시간
    };

    addMemo(memo);
  }

  currentPath = [];
}

// 경로 미리보기
function drawPathPreview(path) {
  if (path.length < 2) return;

  ctx.strokeStyle =
    currentTool === "highlight" ? "rgba(255, 235, 59, 0.6)" : "#ff5252";
  ctx.lineWidth = currentTool === "highlight" ? 8 : 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath(); // 경로 시작
  ctx.moveTo(path[0].x, path[0].y); // 첫 번째 점으로 이동

  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y); // 다음 점으로 선 그리기
  }

  ctx.stroke(); // 선 그리기
}

// 메모 추가
function addMemo(memo) {
  memos.push(memo); // 메모 배열에 추가
  undoStack.push(memo); // 되돌리기 스택에 추가

  // Socket으로 전송
  if (collaboration) {
    collaboration.sendMemo(memo); // 협업 모드에서 메모 전송
  }

  renderMemos();
  console.log("Memo added:", memo);
}

// 텍스트 메모 추가
function addTextMemo(text, latLng) {
  const memo = {
    id: crypto.randomUUID(),
    type: "text",
    coords: [latLng],
    text: text,
    style: {
      color: "#000000",
      fontSize: 16,
    },
    createdBy: localStorage.getItem("userId") || "anonymous",
    timestamp: Date.now(),
  };

  addMemo(memo);
}

// 메모 삭제
function removeMemo(memoId) {
  memos = memos.filter((m) => m.id !== memoId);

  // Socket으로 전송
  if (collaboration) {
    collaboration.deleteMemo(memoId);
  }

  renderMemos();
  console.log("Memo removed:", memoId);
}

// Undo
function undoLastMemo() {
  if (undoStack.length === 0) {
    alert("실행 취소할 작업이 없습니다.");
    return;
  }

  const lastMemo = undoStack.pop();
  removeMemo(lastMemo.id);
}

// 점과 선분 사이의 최단 거리 계산
function distanceToSegment(px, py, x1, y1, x2, y2) {
  const A = px - x1; // 선분의 시작점에서 마우스포인터로 향하는 마우스 위치 벡터
  const B = py - y1;
  const C = x2 - x1; // 선분의 시작점에서 끝점으로 향하는 선분 백터
  const D = y2 - y1;

  const dot = A * C + B * D; // 벡터의 내적(내적: 그 선분 방향으로 얼마나 나아갔는가)
  const lenSq = C * C + D * D; // 선분 실제 길이, 피타고라스 정리로 계산

  /* 
    param: 선분백터 위에서 마우스와 가장 가까운 지점이 어디인지를 나타내는 비율
    param < 0: 선분 밖, 최단거리: 시작점과의 거리
    param > 1: 선분 끝점, 최단거리: 끝점과의 거리
    param = 0 ~ 1: 선분 위의 지점, 최단거리: 선분에 내린 수선의 발
  */
  let param = -1;
  if (lenSq !== 0) {
    param = dot / lenSq; // 마우스 포인터가 선분 방향으로 얼마나 나아갔는가/ 선분 길이로 나누어 비율로 계산
  }

  let xx, yy; // xx: 최단거리 지점의 x 좌표, yy: 최단거리 지점의 y 좌표

  if (param < 0) {
    // 선분 시작점이 가장 가까움
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    // 선분 위의 지점이 가장 가까움
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  const dx = px - xx; // x 좌표 차이
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy); // 피타고라스 정리로 최단거리 계산
}

// 위치에서 메모 찾기
function findMemoAtPosition(x, y) {
  const CLICK_THRESHOLD = 15; // 클릭 허용 범위 (픽셀)

  for (let i = memos.length - 1; i >= 0; i--) {
    const memo = memos[i];

    if (memo.type === "text") {
      // 텍스트: 사각형 영역 체크
      const pixel = latLngToPixel(memo.coords[0]); // 메모의 지리적 위치를 픽셀 좌표로 변환
      const dist = Math.sqrt((pixel.x - x) ** 2 + (pixel.y - y) ** 2); // 픽셀 좌표와 마우스 포인터 사이의 거리 계산
      if (dist < CLICK_THRESHOLD + 10) return memo; // 텍스트는 조금 더 넓게 (펜 선보다 클릭하기 어려움)
    } else if (memo.type === "path") {
      // 경로: 각 선분과의 최단 거리 계산
      const pixels = memo.coords.map((coord) => latLngToPixel(coord)); // 메모의 지리적 위치를 픽셀 좌표로 변환

      for (let j = 0; j < pixels.length - 1; j++) {
        const p1 = pixels[j]; // 선분의 시작점
        const p2 = pixels[j + 1]; // 선분의 끝점

        const dist = distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y);

        // 선의 두께를 고려한 클릭 범위
        const lineWidth = memo.style.width || 3;
        const threshold = Math.max(CLICK_THRESHOLD, lineWidth + 5);

        if (dist < threshold) return memo;
      }
    }
  }
  return null;
}

// 모든 메모 렌더링
function renderMemos() {
  if (!ctx || !currentMap) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  memos.forEach((memo) => {
    if (memo.type === "path") {
      drawPathMemo(memo);
    } else if (memo.type === "text") {
      drawTextMemo(memo);
    }
  });
}

// 경로 메모 그리기
function drawPathMemo(memo) {
  if (memo.coords.length < 2) return;

  const pixels = memo.coords.map((coord) => latLngToPixel(coord));

  ctx.strokeStyle =
    memo.style.opacity < 1
      ? `rgba(${hexToRgb(memo.style.color)}, ${memo.style.opacity})`
      : memo.style.color;
  ctx.lineWidth = memo.style.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(pixels[0].x, pixels[0].y);

  for (let i = 1; i < pixels.length; i++) {
    ctx.lineTo(pixels[i].x, pixels[i].y);
  }

  ctx.stroke();
}

// 텍스트 메모 그리기
function drawTextMemo(memo) {
  const pixel = latLngToPixel(memo.coords[0]);

  ctx.font = `${memo.style.fontSize}px sans-serif`;
  ctx.fillStyle = memo.style.color;
  ctx.textBaseline = "top"; // 텍스트 메모의 기준점을 위쪽으로 설정(사각형 배경 안에 글자 배치 수월)

  // 배경
  const metrics = ctx.measureText(memo.text); // 텍스트 메모의 너비와 높이 계산

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillRect(pixel.x, pixel.y, metrics.width + 8, memo.style.fontSize + 8);

  // 테두리
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.strokeRect(pixel.x, pixel.y, metrics.width + 8, memo.style.fontSize + 8);

  // 텍스트
  ctx.fillStyle = memo.style.color;
  ctx.fillText(memo.text, pixel.x + 4, pixel.y + 4);
}

// 좌표 변환: 픽셀 -> 위경도
function pixelToLatLng(x, y) {
  // 지도는 둥근 지구(3D)를 평면(2D)으로 펼쳐놓은 것. 이 평면과 구체 사이의 수학적 변환 규칙을 담고 있는 객체가 projection
  const projection = currentMap.getProjection();
  // 단순한 숫자 쌍인 x, y를 카카오맵 API가 인식할 수 있는 전용 좌표 객체로 래핑(Wrapping), 캔버스의 왼쪽 상단으로부터의 거리
  const point = new kakao.maps.Point(x, y);
  // 컨테이너 좌표를 지리 좌표, ex) 현재 화면의 (500, 300)위치는 실제 지구의 북위 37.5, 동경 127.0 위치에 해당
  const coords = projection.coordsFromContainerPoint(point);
  return { x: point.x, y: point.y };
}

// 좌표 변환: 위경도 -> 픽셀
function latLngToPixel(latLng) {
  const projection = currentMap.getProjection();
  const coords = new kakao.maps.LatLng(latLng.lat, latLng.lng);
  const point = projection.containerPointFromCoords(coords);
  return { x: point.x, y: point.y };
}

// Hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16
      )}`
    : "0, 0, 0";
}

// ==================== getTripId 헬퍼 함수 추가 ===========
function getTripId() {
  // 1. URL 파라미터 우선
  const urlParams = new URLSearchParams(window.location.search);
  const urlTripId = urlParams.get("tripId");
  if (urlTripId) {
    currentTripId = urlTripId;
    return urlTripId;
  }

  // 2. 전역 변수 (route 로드 시 설정됨)
  if (currentTripId) return currentTripId;

  // 3. localStorage (마지막 방문한 여행)
  const lastTripId = localStorage.getItem("lastTripId");
  if (lastTripId) {
    currentTripId = lastTripId;
    return lastTripId;
  }

  return null;
}

// ==================== 협업 모듈 초기화 ====================
async function initCollaboration() {
  try {
    const tripId = getTripId();

    if (!tripId) {
      console.warn("⚠️ No trip ID available, waiting for route load...");
      // route 로드 대기 (최대 5초)
      let attempts = 0;
      while (!currentTripId && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      if (!currentTripId) {
        console.warn("⚠️ Trip ID not available, collaboration disabled");
        return;
      }
    }

    // 사용자 정보 가져오기 (checkMe에서 설정됨)
    const userId = localStorage.getItem("userId") || crypto.randomUUID();
    const userName = localStorage.getItem("username") || "사용자";

    // Collaboration 초기화
    collaboration = new Collaboration({
      chatContainer: "#chat-messages",
      chatInput: "#chat-input",
      onMemoReceived: (memo) => {
        // 중복 체크
        if (!memos.find((m) => m.id === memo.id)) {
          memos.push(memo);
          renderMemos();
        }
      },
      onMemoDeleted: (memoId) => {
        memos = memos.filter((m) => m.id !== memoId);
        renderMemos();
      },
    });

    // VideoChat 초기화
    videoChat = new VideoChat({
      container: ".video-grid",
      controls: ".video-controls",
    });

    // Room 참가
    collaboration.joinRoom(currentTripId, userId, username);

    console.log(`✅ Collaboration initialized`);
    console.log(`   - Trip ID: ${currentTripId}`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Username: ${username}`);
  } catch (error) {
    console.error("❌ Failed to initialize collaboration:", error);
  }
}

// 터치 이벤트 핸들러 (마우스 이벤트로 변환)
function handleCanvasTouchStart(e) {
  e.preventDefault(); // 스크롤 방지
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent("mousedown", {
    clientX: touch.clientX,
    clientY: touch.clientY,
    bubbles: true,
  });
  e.target.dispatchEvent(mouseEvent);
}

function handleCanvasTouchMove(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent("mousemove", {
    clientX: touch.clientX,
    clientY: touch.clientY,
    bubbles: true,
  });
  e.target.dispatchEvent(mouseEvent);
}

function handleCanvasTouchEnd(e) {
  e.preventDefault();
  const mouseEvent = new MouseEvent("mouseup", {
    bubbles: true,
  });
  e.target.dispatchEvent(mouseEvent);
}

const API_BASE = "http://localhost:8080";

// trip 렌더링
async function loadTrip() {
  const tripId = getTripId();
  if (!tripId) {
    console.warn("⚠️ 여행 ID가 없습니다.");
    return;
  }

  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/trip/${tripId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("여행 불러오기 실패");

    const trip = await res.json();

    // 헤더에 여행 타이틀 렌더링
    const tripTitleEl = document.querySelector(".trip-title");
    tripTitleEl.textContent = trip.title || "클릭하여 여행 타이틀 설정";

    // 필요한 다른 정보 렌더링 (예: 시작/종료 날짜, 예산 등)
    document.getElementById("departure").value = trip.origin?.inputText || "";
    document.getElementById("destination").value = trip.destination?.city || "";

    document.getElementById("personal-budget").value =
      trip.constraints?.budget?.perPerson || 0;
    document.getElementById("people-count").value = trip.peopleCount || 1;

    // 카테고리 chips 렌더링
    const selectedStylesInput = document.getElementById("selected-styles");
    selectedStylesInput.value = trip.categories?.join(",") || "";

    // 필요하면 AI 추천 장소, 일정 등도 초기화 가능
    console.log("trip loaded:", trip);
  } catch (err) {
    console.error(err);
  }
}

// 페이지 로드 시 실행
window.addEventListener("DOMContentLoaded", () => {
  loadTrip();
});

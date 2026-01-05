import Collaboration from "./Collaboration.mjs";
import VideoChat from "./VideoChat.mjs";

// client/public/pages/Main.mjs
// =====================================================
// TripCanvas Main Page Script (Cleaned)
// - Day 탭별 장소 리스트 + 지도 마커 표시
// - 리스트/마커 클릭 시 "정보 카드(이름+주소)" 표시
// - 숙소 → 1번 / (현재→다음) 구간 폴리라인 + 거리/시간 표시
// - NN + 2-opt로 장소 순서 최적화(클라이언트 UI 순서)
// - ✅ 중복 제거: directions 호출 통일(fetchDirections), 총합/구간 계산 통일(computeDaySegments)
// =====================================================
const API_BASE_URL = "";
let currentTripId = null;
let currentUserData = null;
let currentTripData = null; // 현재 선택된 여행 정보 (예산 포함)
let isExpenseEditMode = false; // 수정 모드 플래그
let currentEditingExpenseId = null; // 수정 중인 지출 ID
let currentTripStatus = null;

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
    console.log("✅ me:", data.user.id);

    if (!res.ok) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      alert(
        data.message || "인증 정보가 만료되었습니다. 다시 로그인해 주세요."
      );
      window.location.href = "login.html";
      return;
    }

    // 사용자 정보 저장
    currentUserData = data.user;
    localStorage.setItem("userId", data.user.id || data.user.userid);
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
// 내 여행 불러오기 사이드 탭에 (초대받은 Trip 포함)
// =====================================================
async function loadMyTripsIntoTemplate() {
  const wrap = document.getElementById("my-trips-list");
  if (!wrap) return;

  wrap.innerHTML = `<div class="place-description">불러오는 중…</div>`;

  const token = getToken();
  if (!token) return;

  // ✅ /trip 은 owner + collaborators 모두 포함해서 내려주도록 이미 라우터가 구성돼있음
  // router.get("/", isAuth, tripController.getTripsForStatus);
  const res = await fetch(`${API_BASE_URL}/trip`, {
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

  // ✅ /trip 은 "배열"로 내려올 가능성이 큼 (getTripsForStatus가 trips 그대로 return)
  const trips = Array.isArray(data)
    ? data
    : Array.isArray(data?.trips)
    ? data.trips
    : [];

  if (!trips.length) {
    wrap.innerHTML = `<div class="place-description">표시할 여행이 없습니다.</div>`;
    return;
  }

  // 현재 로그인 유저 id (checkMe()에서 userId 저장 중)
  const myUserId = localStorage.getItem("userId");

  // (선택) owner/초대받은 여행 구분해서 정렬: owner 먼저
  trips.sort((a, b) => {
    const aMine = String(a?.owner?._id || a?.owner) === String(myUserId);
    const bMine = String(b?.owner?._id || b?.owner) === String(myUserId);
    return Number(bMine) - Number(aMine);
  });

  wrap.innerHTML = "";

  trips.forEach((t) => {
    const ownerId = String(t?.owner?._id || t?.owner || "");
    const isOwner = myUserId && ownerId === String(myUserId);

    // 내 역할 찾기(서버가 collaborators를 내려주는 경우)
    const myRole =
      (t?.collaborators || []).find(
        (c) => String(c?.userId?._id || c?.userId) === String(myUserId)
      )?.role || (isOwner ? "owner" : "viewer");

    const ownerName = t?.owner?.nickname || t?.owner?.email || "알 수 없음";

    const card = document.createElement("div");
    card.className = "template-card";

    card.innerHTML = `
      <div class="template-name">
        ${escapeHtml(t.title || "제목 없음")}
        <div style="margin-top:6px; font-size:12px; opacity:.75;">
          ${
            isOwner
              ? "🧑‍💼 내 여행"
              : `👥 초대받은 여행 · owner: ${escapeHtml(ownerName)}`
          }
          <span style="margin-left:8px; font-weight:800;">(role: ${escapeHtml(
            myRole
          )})</span>
        </div>
      </div>

      <div class="template-desc">
        ${escapeHtml(t.description || "")}
        <div style="margin-top:8px; opacity:.7; font-size:12px;">
          ${escapeHtml(fmtDateYMD(t.startDate))} ~ ${escapeHtml(
      fmtDateYMD(t.endDate)
    )}
        </div>

        <button class="btn-generate" style="margin-top:12px; width:100%; padding:10px;">
          🗺️ 경로 보기
        </button>
      </div>
    `;

    // ✅ “경로 보기” 허용: 초대받은 여행도 tripId로 route 로드
    const btn = card.querySelector("button");
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();

      // route 탭으로 이동
      switchSidebarTab("route");

      // ✅ 여기서 기존 로직 그대로 사용
      await loadRouteForTripAndRenderTabs(t._id);

      // (선택) URL도 바꿔서 새로고침해도 유지되게
      history.replaceState(null, "", `/main.html?tripId=${t._id}`);
      localStorage.setItem("currentTripId", t._id);
      localStorage.setItem("lastTripId", t._id);
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
    console.log(`🚀 새 여행 생성됨 - tripId: ${currentTripId}`);
    localStorage.setItem("lastTripId", currentTripId);

    // ✅ 여행 정보 가져오기 (예산 정보 포함)
    await loadTripData(currentTripId);

    // ✅ 예산과 일정 초기화 (새 여행이므로 빈 상태)
    await loadMyExpenses();
    await loadMySchedules();
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

  console.log(`🚀 여행 선택됨 - tripId: ${currentTripId}`);

  // 여행 정보 가져오기 (예산 정보 포함)
  await loadTripData(tripId);
  setupLeaveTripUI();

  // ✅ 여행 선택 시 예산과 일정 다시 불러오기
  await loadMyExpenses();
  await loadMySchedules();

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

  kakao.maps.event.addListener(currentMap, "bounds_changed", function () {
    memos.forEach((memo) => {
      if (memo.type === "text") {
        const el = document.querySelector(`[data-memo-id="${memo.id}"]`);
        if (el) {
          const newPixel = latLngToPixel(memo.coords[0]);
          el.style.left = `${newPixel.x}px`;
          el.style.top = `${newPixel.y}px`;
        }
      }
    });
  });

  // 드로잉 기능 추가
  setupCanvas();
  setupDrawingTools();

  // 지도 이벤트에 메모 랜더링 추가
  kakao.maps.event.addListener(currentMap, "zoom_changed", () => {
    renderMemos();
    updateStickyNotesPositions();
  });

  kakao.maps.event.addListener(currentMap, "dragend", () => {
    renderMemos();
    updateStickyNotesPositions();
  });

  kakao.maps.event.addListener(currentMap, "center_changed", () => {
    renderMemos();
    updateStickyNotesPositions();
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
document.addEventListener("DOMContentLoaded", async () => {
  // ==================== Trip ID 확인 및 자동 생성 ====================
  const urlParams = new URLSearchParams(window.location.search);
  const tripIdFromUrl = urlParams.get("tripId");
  const tripIdFromStorage = localStorage.getItem("currentTripId");

  if (tripIdFromUrl) {
    // URL에 tripId가 있으면 우선 사용
    currentTripId = tripIdFromUrl;
    localStorage.setItem("currentTripId", tripIdFromUrl);
    localStorage.setItem("lastTripId", tripIdFromUrl);
    console.log("Using tripId from URL:", currentTripId);
  } else if (
    tripIdFromStorage &&
    tripIdFromStorage !== "null" &&
    tripIdFromStorage !== "undefined"
  ) {
    // localStorage에 유효한 tripId가 있으면 사용
    currentTripId = tripIdFromStorage;
    console.log("Using tripId from storage:", currentTripId);
  } else {
    // tripId가 없으면 자동 생성
    console.log("No tripId found, creating new trip...");
    currentTripId = await createNewTrip();

    if (!currentTripId) {
      alert("여행 생성에 실패했습니다. 대시보드로 이동합니다.");
      window.location.href = "/dashboard.html";
      return;
    }
    console.log("New trip created:", currentTripId);
  }

  // -----------------------------
  // 초대 링크 생성 및 모달 관리
  // -----------------------------
  const inviteBtn = document.getElementById("invite-btn");
  const inviteModal = document.getElementById("invite-modal");
  const closeBtn = document.getElementById("closeInviteModal");
  // 초대 버튼/모달 관련 초기화: 네비게이션이 비동기로 로드될 수 있으므로
  // 네비바가 로드된 직후에도 이 초기화가 실행되도록 별도 함수로 분리합니다.
  function setupInviteUI() {
    const inviteBtn = document.getElementById("invite-btn");
    const inviteModal = document.getElementById("invite-modal");
    const closeBtn = document.getElementById("closeInviteModal");
    const cancelBtn = document.getElementById("invite-cancel-btn");
    const linkInput = document.getElementById("inviteLinkInput");
    const copyBtn = document.getElementById("copyInviteLinkBtn");

    console.debug("[Main] setupInviteUI called. inviteBtn?", !!inviteBtn);
    if (!inviteBtn) return;

    // main.html에서만 버튼 보이기 (라우팅/서버에 따라 .html이 생략될 수 있어 버튼이 있는지 DOM으로도 확인)
    const isMainPath =
      location.pathname.endsWith("main.html") ||
      !!document.getElementById("btn-generate");
    if (isMainPath) {
      console.debug("[Main] on main.html - showing invite button");
      inviteBtn.style.display = "inline-block";
    } else {
      inviteBtn.style.display = "none";
      console.debug("[Main] not on main.html - hiding invite button");
      return;
    }

    // 중복 바인딩 방지
    if (inviteBtn.dataset.inviteAttached) return;
    inviteBtn.dataset.inviteAttached = "true";

    // 초대 버튼 클릭 → 링크 생성 + 모달 열기
    inviteBtn.addEventListener("click", async () => {
      if (inviteModal) inviteModal.classList.remove("hidden");
      if (linkInput) linkInput.value = "초대 링크 생성 중...";

      try {
        const tripId = getTripId();

        if (tripId === null) {
          throw new Error("유효한 여행 ID가 없습니다.");
        }

        const res = await fetch(`/trip/${tripId}/invite-link`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        if (linkInput) linkInput.value = data.inviteLink; // 생성된 초대 링크 표시
      } catch (err) {
        console.error(err);
      }
    });

    // 모달 닫기
    if (closeBtn)
      closeBtn.addEventListener("click", () =>
        inviteModal?.classList.add("hidden")
      );
    if (cancelBtn)
      cancelBtn.addEventListener("click", () =>
        inviteModal?.classList.add("hidden")
      );

    // 복사 버튼
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          if (linkInput && linkInput.value) {
            await navigator.clipboard.writeText(linkInput.value);
            alert("초대 링크가 복사되었습니다.");
          }
        } catch (err) {
          console.error(err);
          alert("복사에 실패했습니다.");
        }
      });
    }
  }

  function setupLeaveTripUI() {
    const btn = document.getElementById("btn-leave-trip");
    if (!btn) return;

    // ✅ main.html에서만 보이게
    const isMain =
      location.pathname.endsWith("main.html") ||
      !!document.getElementById("btn-generate"); // main에만 있는 요소로 보조 체크

    if (!isMain) {
      btn.style.display = "none";
      return;
    }

    // ✅ main에서는 무조건 보이게 + 초대하기랑 동일 스타일
    btn.style.display = "inline-block";
    btn.style.background = "var(--primary)";
    btn.style.color = "white";
    btn.style.border = "none";
    btn.style.borderRadius = "8px";
    btn.style.padding = "10px 20px";
    btn.style.fontSize = "16px";
    btn.style.fontWeight = "bold";
    btn.style.cursor = "pointer";

    // ✅ 중복 바인딩 방지
    if (btn.dataset.attached) return;
    btn.dataset.attached = "true";

    btn.addEventListener("click", async () => {
      const tripId = getTripId();
      if (!tripId) return;

      if (!confirm("이 여행에서 나갈까요?")) return;

      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/trip/${tripId}/leave`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.message || "나가기 실패");
        return;
      }

      // 로컬 정리
      if (localStorage.getItem("currentTripId") === tripId)
        localStorage.removeItem("currentTripId");
      if (localStorage.getItem("lastTripId") === tripId)
        localStorage.removeItem("lastTripId");

      location.href = "/dashboard.html";
    });
  }

  // -----------------------------
  // ✅ 네비바 로딩 타이밍 통일
  // -----------------------------
  function bindNavbarUiOnce() {
    setupInviteUI();
    setupLeaveTripUI();
  }

  bindNavbarUiOnce();
  document.addEventListener("navbar:loaded", bindNavbarUiOnce);
  if (window.__navbarLoaded) bindNavbarUiOnce();

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

  // ==============================
  // ✅ guide modal (alert 대체)
  // ==============================
  function showGuideModal() {
    const modal = document.getElementById("guide-modal");
    if (!modal) return;

    modal.classList.remove("hidden");

    const okBtn = document.getElementById("modal-ok");
    const backdrop = modal.querySelector(".modal-backdrop");

    const close = () => modal.classList.add("hidden");

    okBtn?.addEventListener("click", close, { once: true });
    backdrop?.addEventListener("click", close, { once: true });

    // ESC로 닫기
    const onKeyDown = (e) => {
      if (e.key === "Escape") close();
      document.removeEventListener("keydown", onKeyDown);
    };
    document.addEventListener("keydown", onKeyDown);
  }

  // -----------------------------
  // status 받아오는 helper
  // -----------------------------
  async function fetchCurrentTripStatus() {
    const tripId = localStorage.getItem("currentTripId");

    // 🔍 로그 1: localStorage에서 ID를 제대로 가져왔는지 확인
    console.log("🛠️ [fetchCurrentTripStatus] localStorage tripId:", tripId);

    if (!tripId) {
      console.warn("⚠️ [fetchCurrentTripStatus] tripId가 없습니다.");
      return null;
    }

    const token = getToken();
    if (!token) {
      console.warn("⚠️ [fetchCurrentTripStatus] 인증 토큰이 없습니다.");
      return null;
    }

    const res = await fetch(`${API_BASE_URL}/trip/${tripId}/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));

    // 📦 로그 2: 서버에서 받은 전체 응답 데이터 확인
    console.log("📦 [fetchCurrentTripStatus] 서버 응답:", data);

    if (!res.ok) {
      console.error("❌ [fetchCurrentTripStatus] fetch 실패:", res.status);
      return null;
    }

    // 데이터 구조에 따라 data.trip.status 또는 data.status 확인
    const status = data?.trip?.status ?? data?.status ?? null;

    // ✅ 로그 3: 최종적으로 추출된 상태 값 확인
    console.log("📊 [fetchCurrentTripStatus] 추출된 status:", status);

    return status;
  }

  // -----------------------------
  // 여행 계획 생성 버튼
  // -----------------------------
  const generatePlanButton = document.getElementById("btn-generate");
  if (generatePlanButton) {
    generatePlanButton.addEventListener("click", async () => {
      const currentId = localStorage.getItem("currentTripId");

      // 🚀 로그 4: 버튼 클릭 시점의 ID 확인
      console.log("🚀 [Generate Click] 현재 ID:", currentId);

      if (!currentId) {
        alert("여행을 먼저 선택하거나 생성해주세요.");
        return;
      }

      // ✅ 1) planning 상태인지 먼저 확인
      const status = await fetchCurrentTripStatus();

      // 🚦 로그 5: 조건문 직전 최종 상태 확인
      console.log("🚦 [Generate Click] 최종 체크된 상태:", status);

      if (status !== "planning") {
        showGuideModal();
        return;
      }

      // ✅ 2) 통과하면 그때 로딩 표시
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
        tripId: localStorage.getItem("currentTripId"),
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
  // ✅ 현재 위치 가져오기(타임아웃 대응: 빠른 시도 → watch 재시도)
  // ==============================
  function getCurrentPositionSmart() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("NO_GEO"));
        return;
      }

      // 1) 빠른 시도(네트워크 기반 / 캐시 허용)
      navigator.geolocation.getCurrentPosition(
        resolve,
        (err) => {
          // timeout이면 2) watch로 재시도(조금 더 기다리기)
          if (err.code === 3) {
            const watchId = navigator.geolocation.watchPosition(
              (pos) => {
                navigator.geolocation.clearWatch(watchId);
                resolve(pos);
              },
              (err2) => {
                navigator.geolocation.clearWatch(watchId);
                reject(err2);
              },
              { enableHighAccuracy: false, timeout: 20000, maximumAge: 30000 }
            );

            // 안전장치(25초 지나면 포기)
            setTimeout(() => {
              navigator.geolocation.clearWatch(watchId);
              reject(err);
            }, 25000);
          } else {
            reject(err);
          }
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 30000 }
      );
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

    // ✅ 클릭 이벤트 (getCurrentPositionSmart 반영)
    btn.addEventListener("click", async () => {
      if (!navigator.geolocation) {
        alert("이 브라우저는 위치 기능을 지원하지 않아요.");
        return;
      }

      btn.disabled = true;
      const prevText = btn.textContent;
      btn.textContent = "…";

      try {
        const pos = await getCurrentPositionSmart();
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
      } catch (err) {
        console.warn("geolocation error:", err);

        if (err?.code === 1) {
          alert("위치 권한이 거부됐어요. 브라우저 권한을 허용해 주세요.");
        } else if (err?.code === 2) {
          alert("위치 정보를 사용할 수 없어요. 위치 서비스를 켜주세요.");
        } else if (err?.code === 3) {
          alert(
            "위치 탐색 시간이 초과됐어요. Wi-Fi를 켜고 다시 시도해 주세요."
          );
        } else {
          alert("현재 위치를 가져오지 못했어요.");
        }
      } finally {
        btn.disabled = false;
        btn.textContent = prevText;
      }
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

      // ✅ 일정 탭 클릭 시 이벤트 리스너 재등록
      if (tabName === "schedule") {
        console.log("📅 왼쪽 사이드바 일정 탭 활성화 - 이벤트 리스너 재등록");
        attachScheduleEventListeners();
      }
    });
  });

  // ==================== 사이드바 3단계 토글 ====================
  const sidebar = document.querySelector(".sidebar");
  const rightPanel = document.querySelector(".right-panel");
  const toggleLeftBtn = document.getElementById("toggle-left-btn");
  const toggleRightBtn = document.getElementById("toggle-right-btn");

  // 왼쪽 패널: 기본 → 접힘 → 최대화 → 기본
  if (toggleLeftBtn && sidebar) {
    toggleLeftBtn.addEventListener("click", () => {
      if (sidebar.classList.contains("maximized")) {
        // 최대화 → 기본
        sidebar.classList.remove("maximized");
        toggleLeftBtn.textContent = "◀";
        toggleLeftBtn.style.left = "400px";
        toggleRightBtn.style.display = ""; // 오른쪽 버튼 복원
      } else if (sidebar.classList.contains("collapsed")) {
        // 접힌 → 최대화
        sidebar.classList.remove("collapsed");
        sidebar.classList.add("maximized");
        toggleLeftBtn.textContent = "⊗";
        toggleLeftBtn.style.left = "calc(100vw - 32px)";
        toggleRightBtn.style.display = "none"; // 오른쪽 버튼 숨김
      } else {
        // 기본 → 접힘
        sidebar.classList.add("collapsed");
        toggleLeftBtn.textContent = "▶";
        toggleLeftBtn.style.left = "0";
      }

      setTimeout(() => {
        if (currentMap) currentMap.relayout();
      }, 300);
    });
  }

  // 오른쪽 패널: 기본 → 접힘 → 최대화 → 기본
  if (toggleRightBtn && rightPanel) {
    toggleRightBtn.addEventListener("click", () => {
      if (rightPanel.classList.contains("maximized")) {
        // 최대화 → 기본
        rightPanel.classList.remove("maximized");
        toggleRightBtn.textContent = "▶";
        toggleRightBtn.style.right = "350px";
        toggleLeftBtn.style.display = ""; // 왼쪽 버튼 복원
      } else if (rightPanel.classList.contains("collapsed")) {
        // 접힌 → 최대화
        rightPanel.classList.remove("collapsed");
        rightPanel.classList.add("maximized");
        toggleRightBtn.textContent = "⊗";
        toggleRightBtn.style.right = "calc(100vw - 32px)";
        toggleLeftBtn.style.display = "none"; // 왼쪽 버튼 숨김
      } else {
        // 기본 → 접힘
        rightPanel.classList.add("collapsed");
        toggleRightBtn.textContent = "◀";
        toggleRightBtn.style.right = "0";
      }

      setTimeout(() => {
        if (currentMap) currentMap.relayout();
      }, 300);
    });
  }

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

      // ✅ 예산 탭으로 전환 시 이벤트 리스너 재등록
      if (panelName === "budget") {
        console.log("💰 예산 탭 활성화 - 이벤트 리스너 재등록");
        attachBudgetEventListeners();
      }

      // ✅ 일정 탭으로 전환 시 이벤트 리스너 재등록
      if (panelName === "schedule") {
        console.log("📅 일정 탭 활성화 - 이벤트 리스너 재등록");
        attachScheduleEventListeners();
      }
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
      kakao.maps.load(() => {
        initKakaoMap();
        initCollaboration();
        loadMemoFromServer();
      });
    } else {
      initKakaoMap();
      initCollaboration();
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
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (currentTool === "eraser") {
    // 지우개: 클릭한 위치의 메모 삭제
    const clickedMemo = findMemoAtPosition(x, y);
    if (clickedMemo) {
      removeMemo(clickedMemo.id);
    }
    return;
  }

  if (currentTool === "text") {
    // 포스트잇 생성
    createStickyNote(x, y);
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
  const tripId = localStorage.getItem("currentTripId");

  if (currentPath.length > 2) {
    // 점 3개 이상이 모여야 선
    // 메모 생성
    const memo = {
      tripId: tripId,
      id: crypto.randomUUID(),
      type: "path",
      coords: currentPath.map((p) => ({
        lat: p.latLng.lat,
        lng: p.latLng.lng,
      })), // 지도를 확대하거나 축소해도 메모가 엉뚱한 곳으로 가지 않고 실제 지리적 위치에 고정
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

// ==================== 서버 메모 관리 ====================
// 서버에서 메모 불러오기
async function loadMemoFromServer() {
  console.log("loadMemoFromServer 함수가 실행");
  if (!currentTripId) {
    console.warn("No trip ID available, skipping memo load");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/memo/${currentTripId}`);
    if (!response.ok) {
      throw new Error(`Failed to load memos: ${response.status}`);
    }

    const savedMemos = await response.json();
    memos = savedMemos;

    document.querySelectorAll(".sticky-note").forEach((el) => el.remove());

    // 텍스트 메모는 포스트잇으로 생성
    memos.forEach((memo) => {
      if (memo.type === "text" && memo.coords && memo.coords[0]) {
        const latLng = new kakao.maps.LatLng(
          memo.coords[0].lat,
          memo.coords[0].lng
        );
        const pixel = latLngToPixel(latLng);
        createStickyNote(pixel.x, pixel.y, memo.text, memo);
      }
    });

    renderMemos(); // path 메모만 Canvas에 렌더링
    console.log("Loasded memos from server");
  } catch (error) {
    console.error("Failed to load memos");
  }
}

// 메모 추가
async function addMemo(memo) {
  memos.push(memo); // 메모 배열에 추가
  undoStack.push(memo); // 되돌리기 스택에 추가

  // Socket으로 전송
  if (collaboration) {
    collaboration.sendMemo(memo); // 협업 모드에서 메모 전송
  }

  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/memo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(memo),
    });

    if (!response.ok) {
      throw new Error(`Failed to add memo: ${response.status}`);
    }

    console.log("Memo added:", memo);
  } catch (error) {
    console.error("Error adding memo:", error);
    return null;
  }

  renderMemos();

  console.log("Memo added:", memo);
}

// 포스트잇 생성
function createStickyNote(x, y, text = "", memo = null) {
  const memoId = memo?.id || memo?._id || crypto.randomUUID();

  // 포스트잇 DOM 요소 생성
  const stickyNote = document.createElement("div");
  stickyNote.className = "sticky-note";
  stickyNote.setAttribute("data-memo-id", memoId);

  // 위치 설정
  stickyNote.style.left = `${x}px`;
  stickyNote.style.top = `${y}px`;

  // 헤더 (삭제 버튼)
  const header = document.createElement("div");
  header.className = "sticky-note-header";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "sticky-note-delete";
  deleteBtn.textContent = "x";
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    removeMemo(memoId);
    stickyNote.remove();
  };

  header.appendChild(deleteBtn);

  // 내용
  const content = document.createElement("div");
  content.className = "sticky-note-content";
  content.contentEditable = true;
  content.textContent = text || memo?.text || "";

  // 텍스트 변경 시 저장
  let saveTimeout;
  content.addEventListener("input", () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      updateStickyNoteText(memoId, content.textContent);
    }, 500);
  });

  // 포커스 잃으면 저장
  content.addEventListener("blur", () => {
    updateStickyNoteText(memoId, content.textContent);
  });

  stickyNote.appendChild(header);
  stickyNote.appendChild(content);

  // 드래그 기능 추가
  makeDraggable(stickyNote, memoId);

  // 지도 컨테이너에 추가
  document.querySelector("#kakao-map").appendChild(stickyNote);

  // 새 메모면 자동 포커스
  if (!memo) {
    content.focus();

    const tripId = localStorage.getItem("currentTripId");
    const latLng = pixelToLatLng(x, y);

    // 메모 데이터 저장
    const newMemo = {
      tripId: tripId,
      id: memoId,
      type: "text",
      coords: [{ lat: latLng.lat, lng: latLng.lng }],
      text: "",
      style: { fontSize: 14, color: "#333" },
      createdBy: localStorage.getItem("userId") || "anonymous",
      timestamp: Date.now(),
    };

    addMemo(newMemo);
  }

  return stickyNote;
}

// 포스트잇 텍스트 업데이트
async function updateStickyNoteText(memoId, text) {
  const memo = memos.find((m) => m.id === memoId);
  if (memo) {
    memo.text = text;

    // 서버에 업데이트 (선택사항)
    if (collaboration) {
      collaboration.sendMemo(memo);
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE_URL}/memo/${memoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(memo),
      });

      if (!response.ok) {
        throw new Error(`Failed to update memo text: ${response.status}`);
      }
      console.log("Memo text updated:", memoId);
    } catch (error) {
      console.error("Error updating memo text:", error);
      return null;
    }
  }
}

// 포스트잇 드래그 기능
function makeDraggable(element, memoId) {
  let isDragging = false;
  let startX, startY;
  let initialLeft, initialTop;

  const onMouseDown = (e) => {
    // 내용 영역 클릭 시에는 드래그 하지 않음
    if (e.target.classList.contains("sticky-note-content")) return;
    if (e.target.classList.contains("sticky-note-delete")) return;

    isDragging = true;
    element.classList.add("dragging");

    startX = e.clientX;
    startY = e.clientY;
    initialLeft = parseInt(element.style.left) || 0;
    initialTop = parseInt(element.style.top) || 0;

    e.preventDefault();
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const newLeft = initialLeft + deltaX;
    const newTop = initialTop + deltaY;

    element.style.left = `${newLeft}px`;
    element.style.top = `${newTop}px`;
  };

  const onMouseUp = () => {
    if (!isDragging) return;

    isDragging = false;
    element.classList.remove("dragging");

    // 새 위치를 위경도로 변환하여 메모 업데이트
    const x = parseInt(element.style.left);
    const y = parseInt(element.style.top);
    const newLatLng = pixelToLatLng(x, y);

    const memo = memos.find((m) => m.id === memoId);
    if (memo) {
      memo.coords = [newLatLng];

      // 서버에 업데이트
      if (collaboration) {
        collaboration.sendMemo(memo);
      }
    }
  };

  element.addEventListener("mousedown", onMouseDown);
  element.addEventListener("mousemove", onMouseMove);
  element.addEventListener("mouseup", onMouseUp);
}

// 모든 포스트잇 위치 업데이트
function updateStickyNotesPositions() {
  document.querySelectorAll(".sticky-note").forEach((note) => {
    const memoId = note.getAttribute("data-memo-id");
    const memo = memos.find((m) => m.id === memoId);

    if (memo && memo.coords && memo.coords[0]) {
      const pixel = latLngToPixel(memo.coords[0]);
      note.style.left = `${pixel.x}px`;
      note.style.top = `${pixel.y}px`;
    }
  });
}

// 메모 삭제
async function removeMemo(memoId) {
  memos = memos.filter((m) => m.id !== memoId);
  // Socket으로 전송
  if (collaboration) {
    collaboration.deleteMemo(memoId);
  }

  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/memo/${memoId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to remove memo: ${response.status}`);
    }

    console.log("Memo removed:", memoId);
  } catch (error) {
    console.error("Error removing memo:", error);
    return null;
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
  // 먼저 포스트잇 체크
  const clickedNote = document.elementFromPoint(
    x + canvas.getBoundingClientRect().left,
    y + canvas.getBoundingClientRect().top
  );

  if (clickedNote && clickedNote.closest(".sticky-note")) {
    const stickyNote = clickedNote.closest(".sticky-note");
    const memoId = stickyNote.getAttribute("data-memo-id");
    return memos.find((m) => m.id === memoId);
  }

  // Canvas의 path 메모 체크
  const CLICK_THRESHOLD = 15; // 클릭 허용 범위 (픽셀)

  for (let i = memos.length - 1; i >= 0; i--) {
    const memo = memos[i];

    if (memo.type === "path") {
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
    }
  });

  updateStickyNotesPositions();
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
  return { lat: coords.getLat(), lng: coords.getLng() };
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

    await loadMemoFromServer();

    // Room 참가
    collaboration.joinRoom(currentTripId, userId, userName);

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

// =====================================================
// 예산 & 일정 관리 기능 (Main.mjs에 추가할 코드)
// =====================================================

// =====================================================
// ✅ 여행 정보 불러오기
// =====================================================

// 여행 정보 불러오기 (예산 정보 포함)
async function loadTripData(tripId) {
  const token = getToken();
  if (!token || !tripId) return;

  try {
    const response = await fetch(`${API_BASE_URL}/trip/${tripId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error("여행 정보 조회 실패");
      return;
    }

    const data = await response.json();
    currentTripData = data.trip || data; // 서버 응답 형식에 따라 조정
    currentTripStatus = data.trip?.status ?? null;

    console.log("✅ 여행 정보 불러오기 완료:", currentTripData);

    // 예산 정보가 있으면 업데이트
    if (currentTripData) {
      updateBudgetSummary();
    }
  } catch (error) {
    console.error("여행 정보 불러오기 오류:", error);
  }
}

// =====================================================
// ✅ 예산 관리 (Budget)
// =====================================================

// 예산 추가
async function addExpense() {
  // 수정 모드인 경우 updateExpense 호출
  if (isExpenseEditMode && currentEditingExpenseId) {
    await updateExpense();
    return;
  }

  const token = getToken();
  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }

  // ✅ currentTripId 확인
  if (!currentTripId) {
    alert("여행을 먼저 선택해주세요.");
    console.error("❌ currentTripId가 설정되지 않았습니다.");
    return;
  }

  const name = document.getElementById("expense-name")?.value.trim();
  const category = document.getElementById("expense-category")?.value;
  const amount = document.getElementById("expense-amount")?.value;

  if (!name || !category || !amount) {
    alert("모든 항목을 입력해주세요.");
    return;
  }

  if (Number(amount) <= 0) {
    alert("금액은 0보다 커야 합니다.");
    return;
  }

  console.log(
    `💰 지출 추가 - tripId: ${currentTripId}, name: ${name}, amount: ${amount}`
  );

  try {
    const response = await fetch(`${API_BASE_URL}/budget`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        tripId: currentTripId,
        name,
        category,
        amount: Number(amount),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "지출 추가에 실패했습니다.");
      return;
    }

    alert("지출이 추가되었습니다!");

    // 입력 필드 초기화
    document.getElementById("expense-name").value = "";
    document.getElementById("expense-category").value = "";
    document.getElementById("expense-amount").value = "";

    // 지출 목록 다시 불러오기
    await loadMyExpenses();
  } catch (error) {
    console.error("지출 추가 오류:", error);
    alert("지출 추가 중 오류가 발생했습니다.");
  }
}

// 내 지출 불러오기
async function loadMyExpenses() {
  const token = getToken();
  if (!token || !currentTripId) {
    console.log("⚠️ 여행 ID가 없거나 로그인이 필요합니다.");
    console.log(`   - token: ${token ? "있음" : "없음"}`);
    console.log(`   - currentTripId: ${currentTripId || "없음"}`);
    return;
  }

  console.log(`📊 지출 불러오기 - tripId: ${currentTripId}`);

  try {
    const response = await fetch(`${API_BASE_URL}/budget/my/${currentTripId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error("지출 조회 실패");
      return;
    }

    const data = await response.json();
    const expenses = data.expenses || [];

    // 기존 동적으로 추가된 지출 항목 제거 (기본 예시 항목은 유지)
    const budgetContent = document.getElementById("budget-content");
    const existingExpenses = budgetContent?.querySelectorAll(
      ".expense-item.dynamic"
    );
    existingExpenses?.forEach((item) => item.remove());

    // 불러온 지출 내역 표시
    const expenseForm = budgetContent?.querySelector(
      "div[style*='margin-top: 20px']"
    );

    expenses.forEach((expense) => {
      const expenseItem = document.createElement("div");
      expenseItem.className = "expense-item dynamic"; // 동적 아이템 표시
      expenseItem.dataset.expenseId = expense._id;
      expenseItem.innerHTML = `
        <div class="expense-info">
          <div class="expense-name">${escapeHtml(expense.name)}</div>
          <div class="expense-category">#${escapeHtml(expense.category)}</div>
        </div>
        <div class="expense-right">
          <div class="expense-amount">₩${expense.amount.toLocaleString(
            "ko-KR"
          )}</div>
          <div class="expense-actions">
            <button class="btn-expense-edit" data-id="${
              expense._id
            }">수정</button>
            <button class="btn-expense-delete" data-id="${
              expense._id
            }">삭제</button>
          </div>
        </div>
      `;

      if (expenseForm) {
        expenseForm.parentNode.insertBefore(expenseItem, expenseForm);
      }
    });

    updateBudgetSummary();

    // 수정/삭제 버튼 이벤트 등록
    attachExpenseActions();

    console.log(`✅ ${expenses.length}개의 지출 내역을 불러왔습니다.`);
  } catch (error) {
    console.error("지출 불러오기 오류:", error);
  }
}

// 예산 요약 업데이트 (총 사용 금액)
function updateBudgetSummary() {
  const expenseItems = document.querySelectorAll(".expense-item");
  let totalSpent = 0;

  expenseItems.forEach((item) => {
    const amountText =
      item.querySelector(".expense-amount")?.textContent || "₩0";
    const amount = Number(amountText.replace(/[₩,]/g, ""));
    if (!isNaN(amount)) {
      totalSpent += amount;
    }
  });

  // 개인 예산 가져오기 (여행 데이터에서 또는 입력 필드에서)
  let personalBudget = 0;
  if (currentTripData?.constraints?.budget?.perPerson) {
    // 저장된 여행 데이터에서 가져오기
    personalBudget = currentTripData.constraints.budget.perPerson;
  } else {
    // 입력 필드에서 가져오기 (새로운 여행 생성 중)
    personalBudget =
      parseFloat(document.getElementById("personal-budget")?.value) || 0;
  }

  // 남은 예산 = 개인 예산 - 사용한 금액
  const remainingBudget = personalBudget - totalSpent;

  // budget-amount: 남은 예산 표시
  const remainingBudgetEl = document.getElementById("remaining-budget");
  if (remainingBudgetEl) {
    remainingBudgetEl.textContent = `₩${remainingBudget.toLocaleString(
      "ko-KR"
    )}`;
  }

  /// budget-label: 총 예산 표시
  const totalBudgetLabelEl = document.getElementById("total-budget-label");
  if (totalBudgetLabelEl) {
    totalBudgetLabelEl.textContent = `총 예산: ₩${personalBudget.toLocaleString(
      "ko-KR"
    )}`;
  }
}

// 지출 수정/삭제 버튼 이벤트 연결
function attachExpenseActions() {
  // 수정 버튼
  document.querySelectorAll(".btn-expense-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const expenseId = e.target.dataset.id;
      openEditExpenseForm(expenseId);
    });
  });

  // 삭제 버튼
  document.querySelectorAll(".btn-expense-delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const expenseId = e.target.dataset.id;
      if (confirm("이 지출을 삭제하시겠습니까?")) {
        await deleteExpense(expenseId);
      }
    });
  });
}

// 지출 수정 폼 열기 (기존 추가 폼 재사용)
function openEditExpenseForm(expenseId) {
  const expenseItem = document.querySelector(
    `[data-expense-id="${expenseId}"]`
  );
  if (!expenseItem) return;

  const name = expenseItem.querySelector(".expense-name")?.textContent;
  const category = expenseItem
    .querySelector(".expense-category")
    ?.textContent.replace("#", "");
  const amountText = expenseItem.querySelector(".expense-amount")?.textContent;
  const amount = amountText.replace(/[₩,]/g, "").trim();

  // 폼을 수정 모드로 전환
  isExpenseEditMode = true;
  currentEditingExpenseId = expenseId;

  // 폼 제목 변경
  const formTitle = document.getElementById("expense-form-title");
  if (formTitle) {
    formTitle.textContent = "✏️ 지출 수정";
  }

  // 입력 필드에 기존 값 설정
  document.getElementById("expense-name").value = name;
  document.getElementById("expense-category").value = category;
  document.getElementById("expense-amount").value = amount;

  // 버튼 전환
  document.getElementById("add-expense-btn").style.display = "none";
  const editButtons = document.getElementById("expense-edit-buttons");
  if (editButtons) {
    editButtons.style.display = "flex";
  }

  // 폼으로 스크롤
  document
    .getElementById("expense-form-container")
    ?.scrollIntoView({ behavior: "smooth" });
}

// 지출 수정 모드 취소 (추가 모드로 복귀)
function closeEditExpenseForm() {
  // 수정 모드 해제
  isExpenseEditMode = false;
  currentEditingExpenseId = null;

  // 폼 제목 원래대로
  const formTitle = document.getElementById("expense-form-title");
  if (formTitle) {
    formTitle.textContent = "➕ 지출 추가";
  }

  // 입력 필드 초기화
  document.getElementById("expense-name").value = "";
  document.getElementById("expense-category").value = "";
  document.getElementById("expense-amount").value = "";

  // 버튼 원래대로
  document.getElementById("add-expense-btn").style.display = "block";
  const editButtons = document.getElementById("expense-edit-buttons");
  if (editButtons) {
    editButtons.style.display = "none";
  }
}

// 지출 수정
async function updateExpense() {
  const token = getToken();
  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }

  if (!currentEditingExpenseId) {
    alert("지출 정보를 찾을 수 없습니다.");
    return;
  }

  const name = document.getElementById("expense-name")?.value.trim();
  const category = document.getElementById("expense-category")?.value;
  const amount = document.getElementById("expense-amount")?.value;

  if (!name || !category || !amount) {
    alert("모든 항목을 입력해주세요.");
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/budget/${currentEditingExpenseId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          category,
          amount: Number(amount),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "지출 수정에 실패했습니다.");
      return;
    }

    alert("지출이 수정되었습니다!");
    closeEditExpenseForm();
    await loadMyExpenses();
  } catch (error) {
    console.error("지출 수정 오류:", error);
    alert("지출 수정 중 오류가 발생했습니다.");
  }
}

// 지출 삭제
async function deleteExpense(expenseId) {
  const token = getToken();
  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/budget/${expenseId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "지출 삭제에 실패했습니다.");
      return;
    }

    alert("지출이 삭제되었습니다!");
    await loadMyExpenses();
  } catch (error) {
    console.error("지출 삭제 오류:", error);
    alert("지출 삭제 중 오류가 발생했습니다.");
  }
}

// =====================================================
// ✅ 일정 관리 (Schedule)
// =====================================================

// 일정 추가 폼 열기/닫기
function openScheduleForm() {
  const form = document.getElementById("schedule-form");
  if (form) {
    form.style.display = "block";
  }
}

function closeScheduleForm() {
  const form = document.getElementById("schedule-form");
  if (form) {
    form.style.display = "none";
  }

  // 입력 필드 초기화
  document.getElementById("schedule-time").value = "";
  document.getElementById("schedule-title").value = "";
  document.getElementById("schedule-location").value = "";
}

// 일정 추가
async function saveSchedule() {
  const token = getToken();
  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }

  // ✅ currentTripId 확인
  if (!currentTripId) {
    alert("여행을 먼저 선택해주세요.");
    console.error("❌ currentTripId가 설정되지 않았습니다.");
    return;
  }

  const time = document.getElementById("schedule-time")?.value;
  const title = document.getElementById("schedule-title")?.value.trim();
  const location = document.getElementById("schedule-location")?.value.trim();

  if (!time || !title || !location) {
    alert("모든 항목을 입력해주세요.");
    return;
  }

  console.log(
    `📅 일정 추가 - tripId: ${currentTripId}, title: ${title}, time: ${time}`
  );

  try {
    const response = await fetch(`${API_BASE_URL}/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        tripId: currentTripId,
        time,
        title,
        location,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "일정 추가에 실패했습니다.");
      return;
    }

    alert("일정이 추가되었습니다! ✅");
    closeScheduleForm();

    // 일정 목록 다시 불러오기
    await loadMySchedules();
  } catch (error) {
    console.error("일정 추가 오류:", error);
    alert("일정 추가 중 오류가 발생했습니다.");
  }
}

// 내 일정 불러오기
async function loadMySchedules() {
  const token = getToken();
  if (!token || !currentTripId) {
    console.log("⚠️ 여행 ID가 없거나 로그인이 필요합니다.");
    console.log(`   - token: ${token ? "있음" : "없음"}`);
    console.log(`   - currentTripId: ${currentTripId || "없음"}`);
    return;
  }

  console.log(`📅 일정 불러오기 - tripId: ${currentTripId}`);

  try {
    const response = await fetch(
      `${API_BASE_URL}/schedule/my/${currentTripId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error("일정 조회 실패");
      return;
    }

    const data = await response.json();
    const schedules = data.schedules || [];

    // 기존 일정 목록 제거 (동적으로 추가된 것만)
    const scheduleList = document.getElementById("schedule-list");
    if (!scheduleList) return;

    // 모든 기존 일정 제거
    scheduleList.innerHTML = "";

    // 불러온 일정 표시
    schedules.forEach((schedule) => {
      const scheduleItem = document.createElement("div");
      scheduleItem.className = "schedule-item";
      scheduleItem.dataset.scheduleId = schedule._id;
      scheduleItem.innerHTML = `
        <div class="schedule-info">
          <div class="schedule-time">⏰ ${escapeHtml(schedule.time)}</div>
          <div class="schedule-title">${escapeHtml(schedule.title)}</div>
          <div class="schedule-location">📍 ${escapeHtml(
            schedule.location
          )}</div>
        </div>
        <div class="schedule-actions">
          <button class="btn-icon btn-edit-schedule" title="수정" data-id="${
            schedule._id
          }">✏️</button>
          <button class="btn-icon btn-delete-schedule" title="삭제" data-id="${
            schedule._id
          }">🗑️</button>
        </div>
      `;

      scheduleList.appendChild(scheduleItem);
    });

    // 수정/삭제 버튼 이벤트 등록
    attachScheduleActions();

    console.log(`✅ ${schedules.length}개의 일정을 불러왔습니다.`);
  } catch (error) {
    console.error("일정 불러오기 오류:", error);
  }
}

// 일정 수정/삭제 버튼 이벤트 연결
function attachScheduleActions() {
  // 수정 버튼
  document.querySelectorAll(".btn-edit-schedule").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const scheduleId = e.target.dataset.id;
      openEditScheduleForm(scheduleId);
    });
  });

  // 삭제 버튼
  document.querySelectorAll(".btn-delete-schedule").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const scheduleId = e.target.dataset.id;
      if (confirm("이 일정을 삭제하시겠습니까?")) {
        await deleteSchedule(scheduleId);
      }
    });
  });
}

// 일정 수정 폼 열기
function openEditScheduleForm(scheduleId) {
  const scheduleItem = document.querySelector(
    `[data-schedule-id="${scheduleId}"]`
  );
  if (!scheduleItem) return;

  const time = scheduleItem
    .querySelector(".schedule-time")
    ?.textContent.replace("⏰ ", "");
  const title = scheduleItem.querySelector(".schedule-title")?.textContent;
  const location = scheduleItem
    .querySelector(".schedule-location")
    ?.textContent.replace("📍 ", "");

  const editForm = document.getElementById("schedule-edit-form");
  if (editForm) {
    editForm.style.display = "block";
    editForm.dataset.scheduleId = scheduleId;

    document.getElementById("schedule-edit-time").value = time;
    document.getElementById("schedule-edit-title").value = title;
    document.getElementById("schedule-edit-location").value = location;
  }
}

// 일정 수정 폼 닫기
function closeEditScheduleForm() {
  const editForm = document.getElementById("schedule-edit-form");
  if (editForm) {
    editForm.style.display = "none";
    delete editForm.dataset.scheduleId;
  }
}

// 일정 수정
async function updateSchedule() {
  const token = getToken();
  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }

  const editForm = document.getElementById("schedule-edit-form");
  const scheduleId = editForm?.dataset.scheduleId;

  if (!scheduleId) {
    alert("일정 ID를 찾을 수 없습니다.");
    return;
  }

  const time = document.getElementById("schedule-edit-time")?.value;
  const title = document.getElementById("schedule-edit-title")?.value.trim();
  const location = document
    .getElementById("schedule-edit-location")
    ?.value.trim();

  if (!time || !title || !location) {
    alert("모든 항목을 입력해주세요.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/schedule/${scheduleId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ time, title, location }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "일정 수정에 실패했습니다.");
      return;
    }

    alert("일정이 수정되었습니다!");
    closeEditScheduleForm();
    await loadMySchedules();
  } catch (error) {
    console.error("일정 수정 오류:", error);
    alert("일정 수정 중 오류가 발생했습니다.");
  }
}

// 일정 삭제
async function deleteSchedule(scheduleId) {
  const token = getToken();
  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/schedule/${scheduleId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "일정 삭제에 실패했습니다.");
      return;
    }

    alert("일정이 삭제되었습니다!");
    await loadMySchedules();
  } catch (error) {
    console.error("일정 삭제 오류:", error);
    alert("일정 삭제 중 오류가 발생했습니다.");
  }
}

// =====================================================
// ✅ 예산 탭 이벤트 리스너 연결 함수
// =====================================================
function attachBudgetEventListeners() {
  // 예산 추가 버튼
  const addExpenseBtn = document.getElementById("add-expense-btn");
  if (addExpenseBtn) {
    // 기존 이벤트 리스너 제거 후 재등록 (중복 방지)
    addExpenseBtn.replaceWith(addExpenseBtn.cloneNode(true));
    const newBtn = document.getElementById("add-expense-btn");
    newBtn.addEventListener("click", addExpense);
  }

  // 지출 저장 버튼 (수정 모드)
  const saveExpenseBtn = document.getElementById("save-expense-btn");
  if (saveExpenseBtn) {
    saveExpenseBtn.replaceWith(saveExpenseBtn.cloneNode(true));
    document
      .getElementById("save-expense-btn")
      ?.addEventListener("click", updateExpense);
  }

  // 지출 취소 버튼 (수정 모드)
  const cancelExpenseBtn = document.getElementById("cancel-expense-btn");
  if (cancelExpenseBtn) {
    cancelExpenseBtn.replaceWith(cancelExpenseBtn.cloneNode(true));
    document
      .getElementById("cancel-expense-btn")
      ?.addEventListener("click", closeEditExpenseForm);
  }
}

// =====================================================
// ✅ 일정 탭 이벤트 리스너 연결 함수
// =====================================================
function attachScheduleEventListeners() {
  // 일정 추가 버튼
  const addScheduleBtn = document.getElementById("add-schedule-btn");
  if (addScheduleBtn) {
    addScheduleBtn.replaceWith(addScheduleBtn.cloneNode(true));
    document
      .getElementById("add-schedule-btn")
      ?.addEventListener("click", openScheduleForm);
  }

  // 일정 저장 버튼
  const saveScheduleBtn = document.getElementById("save-schedule-btn");
  if (saveScheduleBtn) {
    saveScheduleBtn.replaceWith(saveScheduleBtn.cloneNode(true));
    document
      .getElementById("save-schedule-btn")
      ?.addEventListener("click", saveSchedule);
  }

  // 일정 취소 버튼
  const cancelScheduleBtn = document.getElementById("cancel-schedule-btn");
  if (cancelScheduleBtn) {
    cancelScheduleBtn.replaceWith(cancelScheduleBtn.cloneNode(true));
    document
      .getElementById("cancel-schedule-btn")
      ?.addEventListener("click", closeScheduleForm);
  }

  // 일정 수정 저장 버튼
  const updateScheduleBtn = document.getElementById("update-schedule-btn");
  if (updateScheduleBtn) {
    updateScheduleBtn.replaceWith(updateScheduleBtn.cloneNode(true));
    document
      .getElementById("update-schedule-btn")
      ?.addEventListener("click", updateSchedule);
  }

  // 일정 수정 취소 버튼
  const cancelEditBtn = document.getElementById("cancel-edit-schedule-btn");
  if (cancelEditBtn) {
    cancelEditBtn.replaceWith(cancelEditBtn.cloneNode(true));
    document
      .getElementById("cancel-edit-schedule-btn")
      ?.addEventListener("click", closeEditScheduleForm);
  }
}

// =====================================================
// ✅ 이벤트 리스너 등록 (DOMContentLoaded 후 실행)
// =====================================================
window.addEventListener("DOMContentLoaded", () => {
  // 예산 탭 이벤트 리스너는 탭 전환 시 등록되므로 여기서는 생략

  // 일정 추가 버튼 (폼 열기)
  document
    .getElementById("add-schedule-btn")
    ?.addEventListener("click", openScheduleForm);

  // 일정 저장 버튼
  document
    .getElementById("save-schedule-btn")
    ?.addEventListener("click", saveSchedule);

  // 일정 추가 취소 버튼
  document
    .getElementById("cancel-schedule-btn")
    ?.addEventListener("click", closeScheduleForm);

  // 일정 수정 저장 버튼
  document
    .getElementById("update-schedule-btn")
    ?.addEventListener("click", updateSchedule);

  // 일정 수정 취소 버튼
  document
    .getElementById("cancel-edit-schedule-btn")
    ?.addEventListener("click", closeEditScheduleForm);
});

// =====================================================
// ✅ 초기 로드
// =====================================================

// 페이지 로드 시 예산과 일정 불러오기
// (Main.mjs의 기존 초기화 함수에서 호출하거나, 여기서 직접 호출)
async function initBudgetAndSchedule() {
  // currentTripId가 설정될 때까지 대기
  let attempts = 0;
  while (!currentTripId && attempts < 50) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    attempts++;
  }

  if (currentTripId) {
    // 여행 정보 먼저 불러오기 (예산 정보 포함)
    await loadTripData(currentTripId);
    // 예산과 일정 불러오기
    await loadMyExpenses();
    await loadMySchedules();
  }
}

// DOM이 준비되면 초기화
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBudgetAndSchedule);
} else {
  initBudgetAndSchedule();
}

// ==================== 여행 자동 생성 ====================
// 새 여행 자동 생성
async function createNewTrip() {
  try {
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");

    const response = await fetch(`${API_BASE_URL}/trip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        userId: userId,
        title: `${username}의 여행 - ${new Date().toLocaleDateString()}`,
        destination: {
          name: "미정",
          district: "미정",
          city: "미정",
        },
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "planning",
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create trip: ${response.status}`);
    }

    const trip = await response.json();
    const tripId = trip._id || trip.id;

    currentTripId = tripId;
    localStorage.setItem("lastTripId", tripId);
    localStorage.setItem("currentTripId", tripId);

    console.log(`New trip created: ${tripId}`);
    return tripId;
  } catch (error) {
    console.error("Failed to create new trip", error);
  }
}

async function updateTripStatus(tripId, status, details = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/trip/${tripId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        status: status,
        ...details,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update trip`);
    }

    const updatedTrip = await response.json();

    return updatedTrip;
  } catch (error) {
    console.error("Failed to update trip status", error);
    throw error;
  }
}

const API_BASE = "";

const grid = document.getElementById("bucketlistGrid");
const emptyState = document.getElementById("bucketlistEmpty");
const statsTotal = document.getElementById("statTotal");
const statsActive = document.getElementById("statActive");
const statsCompleted = document.getElementById("statCompleted");
const statsRate = document.getElementById("statRate");

const createModal = document.getElementById("newBucketModal");
const detailModal = document.getElementById("bucketDetailModal");
const openCreateBtn = document.getElementById("openCreateBtn");
const closeCreateBtn = document.getElementById("closeCreateBtn");
const closeDetailBtn = document.getElementById("closeDetailBtn");
const bucketForm = document.getElementById("bucketForm");

const detailTitle = document.getElementById("detailTitle");
const detailDescription = document.getElementById("detailDescription");
const detailStatus = document.getElementById("detailStatus");
const detailCount = document.getElementById("detailCount");
const detailProgressFill = document.getElementById("detailProgressFill");
const bucketItemsEl = document.getElementById("bucketItems");
const newItemInput = document.getElementById("newItemInput");
const addItemBtn = document.getElementById("addItemBtn");
const deleteBucketBtn = document.getElementById("deleteBucketBtn");

let bucketlists = [];
let currentFilter = "all";
let selectedBucket = null;

function ensureAuthenticated() {
  if (!localStorage.getItem("token")) {
    location.href = "/login.html";
    return false;
  }
  return true;
}

function setModalVisibility(modalEl, show) {
  if (!modalEl) return;
  modalEl.classList[show ? "add" : "remove"]("show");
}

function bindModals() {
  openCreateBtn?.addEventListener("click", () =>
    setModalVisibility(createModal, true)
  );
  closeCreateBtn?.addEventListener("click", () => {
    setModalVisibility(createModal, false);
    bucketForm?.reset();
  });
  closeDetailBtn?.addEventListener("click", () =>
    setModalVisibility(detailModal, false)
  );

  [createModal, detailModal].forEach((modal) => {
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        setModalVisibility(modal, false);
      }
    });
  });
}

function bindFilters() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter || "all";
      renderBuckets();
    });
  });
}

function escapeHtml(text = "") {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  if (!token) {
    location.href = "/login.html";
    throw new Error("no token");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  if (
    !headers["Content-Type"] &&
    options.body !== undefined &&
    !(options.body instanceof FormData)
  ) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (res.status === 401) {
    localStorage.removeItem("token");
    location.href = "/login.html";
    throw new Error("unauthorized");
  }

  console.log("REQ", url, "STATUS", res.status, "OK", res.ok);
  console.log("FAIL BODY", data);
  if (!res.ok) {
    throw new Error(data?.message || "요청이 실패했습니다.");
  }

  return data;
}

function normalizeStatus(status) {
  return status === "completed" ? "completed" : "in-progress";
}

function normalizeBucketData(bucket = {}) {
  const items = Array.isArray(bucket.items) ? bucket.items : [];
  const targetCount =
    bucket.targetCount !== undefined && bucket.targetCount !== null
      ? Number(bucket.targetCount)
      : items.length;
  const completedCount =
    bucket.completedCount !== undefined && bucket.completedCount !== null
      ? Number(bucket.completedCount)
      : items.filter((item) => item.done).length;
  const derivedStatus =
    bucket.status ||
    (targetCount > 0 && completedCount >= targetCount
      ? "completed"
      : "in-progress");

  return {
    ...bucket,
    items,
    targetCount,
    completedCount,
    status: normalizeStatus(derivedStatus),
  };
}

function normalizeBucketResponse(data) {
  if (!data) return null;
  if (data.bucketlist) return normalizeBucketData(data.bucketlist);
  if (data.bucket) return normalizeBucketData(data.bucket);
  return normalizeBucketData(data);
}

function extractListPayload(data) {
  if (Array.isArray(data?.bucketlists)) return data.bucketlists;
  if (Array.isArray(data)) return data;
  return [];
}

function progressPercent(bucket) {
  const completed = Number(bucket?.completedCount || 0);
  const target = Number(bucket?.targetCount || 0);
  if (!target) return 0;
  return Math.round((completed / target) * 100);
}

function renderStats() {
  const total = bucketlists.length;
  const completed = bucketlists.filter(
    (b) => normalizeStatus(b.status) === "completed"
  ).length;
  const active = total - completed;
  const rate = total ? Math.round((completed / total) * 100) : 0;

  if (statsTotal) statsTotal.textContent = total;
  if (statsActive) statsActive.textContent = active;
  if (statsCompleted) statsCompleted.textContent = completed;
  if (statsRate) statsRate.textContent = `${rate}%`;
}

function renderBuckets() {
  if (!grid) return;
  grid.innerHTML = "";

  const filtered = bucketlists.filter((bucket) => {
    if (currentFilter === "all") return true;
    return normalizeStatus(bucket.status) === currentFilter;
  });

  if (emptyState) {
    emptyState.style.display = filtered.length ? "none" : "block";
  }

  if (!filtered.length) {
    return;
  }

  filtered.forEach((bucket) => {
    const status = normalizeStatus(bucket.status);
    const percent = progressPercent(bucket);
    const card = document.createElement("div");
    card.className = "challenge-card";
    card.dataset.bucketId = bucket._id;
    card.innerHTML = `
      <div class="challenge-header">
        <div class="challenge-icon">${escapeHtml(bucket.theme || "🎯")}</div>
        <div class="challenge-status ${
          status === "completed" ? "completed" : "active"
        }">${status === "completed" ? "완료" : "진행"}</div>
      </div>
      <h3 class="challenge-title">${escapeHtml(bucket.title)}</h3>
      <p class="challenge-description">${escapeHtml(
        bucket.description || "목표를 추가해주세요."
      )}</p>
      <div class="challenge-progress-section">
        <div class="progress-header">
          <span class="progress-label">진행률</span>
          <span class="progress-value">${bucket.completedCount || 0}/${
      bucket.targetCount || 0
    }</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percent}%"></div>
        </div>
      </div>
      <div class="challenge-actions">
        <button class="challenge-action-btn" data-action="view">자세히 보기</button>
        <button class="challenge-action-btn" data-action="delete">삭제</button>
      </div>
    `;

    card
      .querySelector('[data-action="view"]')
      ?.addEventListener("click", (e) => {
        e.stopPropagation();
        openDetail(bucket._id);
      });

    card
      .querySelector('[data-action="delete"]')
      ?.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteBucket(bucket._id);
      });

    card.addEventListener("click", () => openDetail(bucket._id));
    grid.appendChild(card);
  });
}

function updateLocalBucket(updated) {
  if (!updated?._id) return;
  const normalized = normalizeBucketData(updated);
  const exists = bucketlists.some((b) => b._id === normalized._id);
  bucketlists = exists
    ? bucketlists.map((b) => (b._id === normalized._id ? normalized : b))
    : [normalized, ...bucketlists];
  renderBuckets();
  renderStats();
}

async function loadBucketlists() {
  try {
    const data = await authFetch(`${API_BASE}/bucketlist`);
    const list = extractListPayload(data);
    bucketlists = list.map(normalizeBucketData);
    renderBuckets();
    renderStats();
  } catch (err) {
    console.error(err);
    alert("버킷리스트를 불러오지 못했습니다.");
  }
}

function formToPayload() {
  const title = document.getElementById("bucketTitle")?.value?.trim();
  const description =
    document.getElementById("bucketDescription")?.value?.trim() || "";
  const theme = document.getElementById("bucketTheme")?.value?.trim() || "";
  const initialItems =
    document
      .getElementById("initialItems")
      ?.value?.split("\n")
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({ text })) || [];

  return { title, description, theme, items: initialItems };
}

async function handleCreate(e) {
  e.preventDefault();
  const payload = formToPayload();
  if (!payload.title) {
    alert("제목을 입력해주세요.");
    return;
  }
  try {
    const data = await authFetch(`${API_BASE}/bucketlist`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const bucket = normalizeBucketResponse(data);
    if (bucket) {
      bucketlists.unshift(bucket);
    }
    renderBuckets();
    renderStats();
    setModalVisibility(createModal, false);
    bucketForm?.reset();
  } catch (err) {
    console.error(err);
    alert(err.message || "버킷리스트를 만들지 못했습니다.");
  }
}

async function openDetail(bucketId) {
  try {
    const data = await authFetch(`${API_BASE}/bucketlist/${bucketId}`);
    const bucket = normalizeBucketResponse(data);
    selectedBucket = bucket;
    renderDetail(bucket);
    setModalVisibility(detailModal, true);
  } catch (err) {
    console.error(err);
    alert("자세히 보기를 불러오지 못했습니다.");
  }
}

function renderItems(bucket) {
  if (!bucketItemsEl) return;
  bucketItemsEl.innerHTML = "";
  if (!bucket.items || !bucket.items.length) {
    bucketItemsEl.innerHTML =
      '<li class="item-row"><span class="item-text">아직 추가된 체크리스트가 없습니다.</span></li>';
    return;
  }

  bucket.items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "item-row";
    li.innerHTML = `
      <label>
        <input type="checkbox" data-item-id="${item._id}" ${
      item.done ? "checked" : ""
    } />
        <span class="item-text ${item.done ? "done" : ""}">${escapeHtml(
      item.text || ""
    )}</span>
      </label>
    `;

    li.querySelector("input")?.addEventListener("change", (e) => {
      toggleItem(bucket._id, item._id, e.target.checked);
    });

    bucketItemsEl.appendChild(li);
  });
}

function renderDetail(bucket) {
  if (!bucket) return;
  const status = normalizeStatus(bucket.status);
  const percent = progressPercent(bucket);
  detailTitle.textContent = bucket.title || "";
  detailDescription.textContent = bucket.description || "";
  detailStatus.textContent = status === "completed" ? "완료" : "진행";
  detailCount.textContent = `${bucket.completedCount || 0}/${
    bucket.targetCount || 0
  }`;
  detailProgressFill.style.width = `${percent}%`;
  renderItems(bucket);
}

async function handleAddItem() {
  const text = newItemInput?.value?.trim();
  if (!text || !selectedBucket?._id) return;
  try {
    const data = await authFetch(
      `${API_BASE}/bucketlist/${selectedBucket._id}/items`,
      {
        method: "POST",
        body: JSON.stringify({ text }),
      }
    );
    const updated = normalizeBucketResponse(data);
    newItemInput.value = "";
    selectedBucket = updated;
    updateLocalBucket(updated);
    renderDetail(updated);
  } catch (err) {
    console.error(err);
    alert(err.message || "아이템을 추가하지 못했습니다.");
  }
}

async function toggleItem(bucketId, itemId, done) {
  try {
    const data = await authFetch(
      `${API_BASE}/bucketlist/${bucketId}/items/${itemId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ done }),
      }
    );
    const updated = normalizeBucketResponse(data);
    selectedBucket = updated;
    updateLocalBucket(updated);
    renderDetail(updated);
  } catch (err) {
    console.error(err);
    alert("상태를 변경하지 못했습니다.");
  }
}

async function deleteBucket(bucketId) {
  if (!confirm("이 버킷리스트를 삭제할까요?")) return;
  try {
    await authFetch(`${API_BASE}/bucketlist/${bucketId}`, {
      method: "DELETE",
    });
    bucketlists = bucketlists.filter((b) => b._id !== bucketId);
    if (selectedBucket?._id === bucketId) {
      setModalVisibility(detailModal, false);
      selectedBucket = null;
    }
    renderBuckets();
    renderStats();
  } catch (err) {
    console.error(err);
    alert("삭제하지 못했습니다.");
  }
}

function bindDetailActions() {
  addItemBtn?.addEventListener("click", handleAddItem);
  newItemInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddItem();
    }
  });
  deleteBucketBtn?.addEventListener("click", () => {
    if (selectedBucket?._id) {
      deleteBucket(selectedBucket._id);
    }
  });
}

function init() {
  if (!ensureAuthenticated()) return;
  bindModals();
  bindFilters();
  bindDetailActions();
  bucketForm?.addEventListener("submit", handleCreate);
  loadBucketlists();
}

init();

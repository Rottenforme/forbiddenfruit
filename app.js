const ACCOUNTS = {
  elexion: { email: "elexion@user.local", label: "엘렉시온" },
  demogorgon: { email: "demogorgon@user.local", label: "데모고르곤" },
};
function otherOf(id) { return id === "elexion" ? "demogorgon" : "elexion"; }

firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const el = (id) => document.getElementById(id);

let currentAccount = null;
let profiles = { elexion: null, demogorgon: null };
let sharedData = {};
let messages = [];
let selectedExpressionImageUrl = null;

/* ===== 프로필 구독 ===== */
db.collection("profiles").doc("elexion").onSnapshot((doc) => {
  profiles.elexion = doc.data() || {};
  if (currentAccount === "elexion") { applyAccentColor(); applyBackground(); }
  renderHeader();
  renderMessages();
  updateExpressionButton();
});

db.collection("profiles").doc("demogorgon").onSnapshot((doc) => {
  profiles.demogorgon = doc.data() || {};
  if (currentAccount === "demogorgon") { applyAccentColor(); applyBackground(); }
  renderHeader();
  renderMessages();
  updateExpressionButton();
});

/* ===== 공용 장식 구독 ===== */
db.collection("site").doc("shared").onSnapshot((doc) => {
  sharedData = doc.data() || {};
  renderDecoLayer();
  updateDecoAdjustVisibility();
});

/* ===== 메시지 구독 ===== */
db.collection("messages").orderBy("createdAt", "asc").onSnapshot((snap) => {
  messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderMessages();
});

/* ===== 로그인 상태 ===== */
auth.onAuthStateChanged((user) => {
  if (user && user.email === ACCOUNTS.elexion.email) currentAccount = "elexion";
  else if (user && user.email === ACCOUNTS.demogorgon.email) currentAccount = "demogorgon";
  else currentAccount = null;

  selectedExpressionImageUrl = null;
  applyAccentColor();
  applyBackground();
  renderLogos();
  renderHeader();
  updateMenuVisibility();
  updateExpressionButton();
  renderMessages();
});

function applyAccentColor() {
  const root = document.documentElement.style;
  if (currentAccount && profiles[currentAccount] && profiles[currentAccount].color) {
    root.setProperty("--accent", profiles[currentAccount].color);
  } else {
    root.setProperty("--accent", "#6B6B6B");
  }
}

function applyBackground() {
  const myProfile = currentAccount && profiles[currentAccount];
  if (myProfile && myProfile.bgUrl) {
    el("app").style.backgroundImage = `linear-gradient(rgba(255,255,255,0.82), rgba(255,255,255,0.82)), url(${myProfile.bgUrl})`;
    el("app").style.backgroundSize = "cover, cover";
    el("app").style.backgroundPosition = "center, center";
  } else {
    el("app").style.backgroundImage = "none";
  }
}

function renderLogos() {
  if (!currentAccount) {
    el("logoElexion").hidden = false;
    el("logoDemogorgon").hidden = false;
  } else if (currentAccount === "elexion") {
    el("logoElexion").hidden = false;
    el("logoDemogorgon").hidden = true;
  } else {
    el("logoElexion").hidden = true;
    el("logoDemogorgon").hidden = false;
  }
}

function renderHeader() {
  if (!currentAccount) {
    el("mainAvatar").hidden = true;
    el("headerName").textContent = "선악과";
    el("statusLine").textContent = "";
    el("composerWrap").hidden = true;
    el("loginHint").hidden = false;
    return;
  }
  const otherId = otherOf(currentAccount);
  const otherProfile = profiles[otherId] || {};
  el("mainAvatar").hidden = false;
  if (otherProfile.avatarUrl) {
    el("mainAvatar").style.backgroundImage = `url(${otherProfile.avatarUrl})`;
    el("mainAvatar").textContent = "";
  } else {
    el("mainAvatar").style.backgroundImage = "none";
    el("mainAvatar").textContent = (otherProfile.nickname || ACCOUNTS[otherId].label).charAt(0);
  }
  el("headerName").textContent = otherProfile.nickname || ACCOUNTS[otherId].label;
  const status = otherProfile.status || { preset: "온라인", note: "" };
  let line = status.note ? `${status.preset} · ${status.note}` : status.preset;
  if (status.location) line += ` · ${status.location}`;
  el("statusLine").textContent = line;

  el("composerWrap").hidden = false;
  el("loginHint").hidden = true;
}

function updateMenuVisibility() {
  el("loginMenuItem").hidden = !!currentAccount;
  el("profileMenuItem").hidden = !currentAccount;
  el("logoutMenuItem").hidden = !currentAccount;
  updateDecoAdjustVisibility();
}

function updateDecoAdjustVisibility() {
  el("decoAdjustMenuItem").hidden = !(currentAccount && sharedData.decorations && sharedData.decorations.length > 0);
}

/* ===== 메시지 렌더링 ===== */
function formatTime(ts) {
  if (!ts) return "방금";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function renderMessages() {
  const feed = el("chatFeed");
  feed.innerHTML = "";

  if (messages.length === 0) {
    feed.innerHTML = '<p class="empty-state">아직 아무 말도 오가지 않았어요.</p>';
    return;
  }

  messages.forEach((m) => {
    const senderProfile = profiles[m.senderId] || {};
    const color = senderProfile.color || "#6B6B6B";
    const isRight = m.senderId === "elexion";

    const row = document.createElement("div");
    row.className = "msg-row " + (isRight ? "right" : "left");

    const avatarImg = m.expressionImageUrl || senderProfile.avatarUrl;
    let avatarEl;
    if (m.expressionImageUrl) {
      avatarEl = document.createElement("img");
      avatarEl.className = "char-avatar-img";
      avatarEl.src = m.expressionImageUrl;
      avatarEl.alt = senderProfile.nickname || "";
    } else {
      avatarEl = document.createElement("div");
      avatarEl.className = "char-avatar";
      if (senderProfile.avatarUrl) {
        avatarEl.style.backgroundImage = `url(${senderProfile.avatarUrl})`;
      } else {
        avatarEl.textContent = (senderProfile.nickname || ACCOUNTS[m.senderId].label).charAt(0);
      }
    }
    row.appendChild(avatarEl);

    const block = document.createElement("div");
    block.className = "msg-block";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.style.background = color;
    if (m.imageUrl) {
      const img = document.createElement("img");
      img.className = "bubble-image";
      img.src = m.imageUrl;
      bubble.appendChild(img);
    }
    const span = document.createElement("span");
    span.textContent = m.text;
    bubble.appendChild(span);
    block.appendChild(bubble);

    const showTime = senderProfile.showTime !== false;
    if (showTime) {
      const meta = document.createElement("p");
      meta.className = "meta";
      meta.textContent = formatTime(m.createdAt);
      block.appendChild(meta);
    }

    if (currentAccount === m.senderId) {
      const actions = document.createElement("div");
      actions.className = "admin-actions";
      actions.appendChild(createDeleteButton(m.id));
      block.appendChild(actions);
    }

    row.appendChild(block);
    feed.appendChild(row);
  });

  feed.scrollTop = feed.scrollHeight;
}

function createDeleteButton(id) {
  const btn = document.createElement("button");
  btn.className = "icon-btn";
  btn.setAttribute("aria-label", "삭제");
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
  btn.addEventListener("click", () => {
    if (confirm("이 메시지를 삭제할까요?")) {
      db.collection("messages").doc(id).delete();
    }
  });
  return btn;
}

/* ===== 이미지 축소/저장 유틸 ===== */
function resizeImageToDataUrl(file, maxSize = 240, quality = 0.85, format = "jpeg") {
  if (file.type === "image/gif") {
    return new Promise((resolve, reject) => {
      if (file.size > 700 * 1024) {
        reject(new Error("움짤 용량이 너무 커요. 700KB 이하로 줄여서 다시 시도해주세요."));
        return;
      }
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        if (format === "png") {
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve(canvas.toDataURL("image/jpeg", quality));
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ===== 메시지 전송 (사진/표정 포함) ===== */
let composerImageFile = null;

el("attachBtn").addEventListener("click", () => el("composerImageInput").click());

el("composerImageInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  composerImageFile = file;
  el("composerImageThumb").src = URL.createObjectURL(file);
  el("composerImagePreview").hidden = false;
});

el("composerImageRemove").addEventListener("click", () => {
  composerImageFile = null;
  el("composerImageInput").value = "";
  el("composerImagePreview").hidden = true;
});

el("composerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentAccount) return;
  const input = el("messageInput");
  const text = input.value.trim();
  if (!text) return;

  const payload = {
    senderId: currentAccount,
    text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  if (selectedExpressionImageUrl) payload.expressionImageUrl = selectedExpressionImageUrl;

  try {
    if (composerImageFile) {
      payload.imageUrl = await resizeImageToDataUrl(composerImageFile, 640, 0.7);
    }
    await db.collection("messages").add(payload);

    input.value = "";
    composerImageFile = null;
    el("composerImageInput").value = "";
    el("composerImagePreview").hidden = true;
  } catch (err) {
    alert("전송에 실패했어요: " + err.message);
  }
});

/* ===== 표정 선택 (입력창) ===== */
function updateExpressionButton() {
  const myProfile = (currentAccount && profiles[currentAccount]) || {};
  const url = selectedExpressionImageUrl || myProfile.avatarUrl;
  el("expressionBtn").style.backgroundImage = url ? `url(${url})` : "none";
}

function renderExpressionPicker() {
  const picker = el("expressionPicker");
  picker.innerHTML = "";
  const myProfile = (currentAccount && profiles[currentAccount]) || {};

  const defaultBtn = document.createElement("button");
  defaultBtn.type = "button";
  defaultBtn.textContent = "기본";
  defaultBtn.classList.toggle("active", !selectedExpressionImageUrl);
  defaultBtn.addEventListener("click", () => {
    selectedExpressionImageUrl = null;
    updateExpressionButton();
    renderExpressionPicker();
    picker.hidden = true;
  });
  picker.appendChild(defaultBtn);

  (myProfile.expressions || []).forEach((expr) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.toggle("active", selectedExpressionImageUrl === expr.imageUrl);
    const img = document.createElement("img");
    img.src = expr.imageUrl;
    img.alt = expr.label;
    btn.appendChild(img);
    const span = document.createElement("span");
    span.textContent = expr.label;
    btn.appendChild(span);
    btn.addEventListener("click", () => {
      selectedExpressionImageUrl = expr.imageUrl;
      updateExpressionButton();
      renderExpressionPicker();
      picker.hidden = true;
    });
    picker.appendChild(btn);
  });
}

el("expressionBtn").addEventListener("click", () => {
  if (!currentAccount) return;
  renderExpressionPicker();
  el("expressionPicker").hidden = !el("expressionPicker").hidden;
});

/* ===== 슬라이드 메뉴 ===== */
el("menuBtn").addEventListener("click", () => el("menuBackdrop").classList.add("open"));
el("menuBackdrop").addEventListener("click", (e) => {
  if (e.target === el("menuBackdrop")) el("menuBackdrop").classList.remove("open");
});

/* ===== 로그인 ===== */
el("loginMenuItem").addEventListener("click", () => {
  el("menuBackdrop").classList.remove("open");
  el("loginError").hidden = true;
  el("passwordInput").value = "";
  document.querySelectorAll(".account-pick-btn").forEach((b, i) => b.classList.toggle("active", i === 0));
  el("loginAccount").value = "elexion";
  el("loginBackdrop").classList.add("open");
});
document.querySelectorAll(".account-pick-btn").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".account-pick-btn").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    el("loginAccount").value = b.dataset.account;
  });
});
el("loginCancel").addEventListener("click", () => el("loginBackdrop").classList.remove("open"));
el("loginBackdrop").addEventListener("click", (e) => {
  if (e.target === el("loginBackdrop")) el("loginBackdrop").classList.remove("open");
});
el("loginSubmit").addEventListener("click", async () => {
  const account = el("loginAccount").value;
  const password = el("passwordInput").value;
  if (!password) return;
  try {
    await auth.signInWithEmailAndPassword(ACCOUNTS[account].email, password);
    el("loginBackdrop").classList.remove("open");
  } catch (err) {
    el("loginError").textContent = "비밀번호가 올바르지 않아요.";
    el("loginError").hidden = false;
  }
});

el("logoutMenuItem").addEventListener("click", async () => {
  el("menuBackdrop").classList.remove("open");
  await auth.signOut();
});

/* ===== 프로필 설정 모달 ===== */
let selectedAvatarFile = null;
let selectedBgFile = null;
let clearBg = false;
let workingExpressions = [];

function renderExprList() {
  const list = el("exprList");
  list.innerHTML = "";
  workingExpressions.forEach((expr) => {
    const chip = document.createElement("span");
    chip.className = "expr-chip";
    const img = document.createElement("img");
    img.src = expr.imageUrl;
    img.alt = expr.label;
    chip.appendChild(img);
    const label = document.createElement("span");
    label.textContent = expr.label;
    chip.appendChild(label);
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.setAttribute("aria-label", "표정 삭제");
    removeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>';
    removeBtn.addEventListener("click", () => {
      workingExpressions = workingExpressions.filter((e) => e.id !== expr.id);
      renderExprList();
    });
    chip.appendChild(removeBtn);
    list.appendChild(chip);
  });
}

el("exprAddBtn").addEventListener("click", async () => {
  const label = el("exprLabelInput").value.trim();
  const file = el("exprFileInput").files[0];
  if (!label || !file) {
    alert("표정 이름과 사진을 둘 다 넣어주세요.");
    return;
  }
  try {
    const imageUrl = await resizeImageToDataUrl(file, 400, 0.85, "png");
    workingExpressions.push({ id: `${Date.now()}`, label, imageUrl });
    el("exprLabelInput").value = "";
    el("exprFileInput").value = "";
    renderExprList();
  } catch (err) {
    alert(err.message || "사진 처리에 실패했어요.");
  }
});

let workingDecorations = [];

function renderDecoList() {
  const list = el("decoList");
  list.innerHTML = "";
  workingDecorations.forEach((d) => {
    const chip = document.createElement("span");
    chip.className = "expr-chip";
    const img = document.createElement("img");
    img.src = d.imageUrl;
    img.alt = "장식";
    chip.appendChild(img);
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.setAttribute("aria-label", "장식 삭제");
    removeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>';
    removeBtn.addEventListener("click", () => {
      workingDecorations = workingDecorations.filter((x) => x.id !== d.id);
      renderDecoList();
    });
    chip.appendChild(removeBtn);
    list.appendChild(chip);
  });
}

el("decoAddBtn").addEventListener("click", async () => {
  const file = el("decoFileInput").files[0];
  if (!file) {
    alert("사진을 선택해주세요.");
    return;
  }
  try {
    const imageUrl = await resizeImageToDataUrl(file, 400, 0.85, "png");
    const idx = workingDecorations.length;
    workingDecorations.push({
      id: `${Date.now()}`,
      imageUrl,
      centerX: 300 + idx * 24,
      bottom: 24 + idx * 24,
      width: 120,
    });
    el("decoFileInput").value = "";
    renderDecoList();
  } catch (err) {
    alert(err.message || "사진 처리에 실패했어요.");
  }
});

el("profileMenuItem").addEventListener("click", () => {
  el("menuBackdrop").classList.remove("open");
  if (!currentAccount) return;
  const myProfile = profiles[currentAccount] || {};
  el("profileModalTitle").textContent = ACCOUNTS[currentAccount].label + " 프로필 설정";

  selectedAvatarFile = null;
  selectedBgFile = null;
  clearBg = false;
  el("avatarFileInput").value = "";
  el("bgFileInput").value = "";
  el("profileError").hidden = true;

  el("avatarPreview").style.backgroundImage = myProfile.avatarUrl ? `url(${myProfile.avatarUrl})` : "none";
  el("bgPreview").style.backgroundImage = myProfile.bgUrl ? `url(${myProfile.bgUrl})` : "none";
  el("nicknameInput").value = myProfile.nickname || "";

  workingExpressions = (myProfile.expressions || []).slice();
  el("exprLabelInput").value = "";
  el("exprFileInput").value = "";
  renderExprList();

  document.querySelectorAll(".color-swatch").forEach((b) => {
    b.classList.toggle("active", b.dataset.color === (myProfile.color || "#185FA5"));
  });

  const status = myProfile.status || { preset: "온라인", note: "", location: "" };
  document.querySelectorAll(".preset-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.preset === status.preset);
  });
  el("statusNoteInput").value = status.note || "";
  el("locationInput").value = status.location || "";

  const showTime = myProfile.showTime !== false;
  el("showTimeToggle").setAttribute("aria-pressed", showTime ? "true" : "false");

  workingDecorations = (sharedData.decorations || []).slice();
  el("decoFileInput").value = "";
  renderDecoList();

  el("profileBackdrop").classList.add("open");
});

el("profileCancel").addEventListener("click", () => el("profileBackdrop").classList.remove("open"));
el("profileBackdrop").addEventListener("click", (e) => {
  if (e.target === el("profileBackdrop")) el("profileBackdrop").classList.remove("open");
});

document.querySelectorAll(".preset-btn").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".preset-btn").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
  });
});
document.querySelectorAll(".color-swatch").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".color-swatch").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
  });
});
el("showTimeToggle").addEventListener("click", () => {
  const pressed = el("showTimeToggle").getAttribute("aria-pressed") === "true";
  el("showTimeToggle").setAttribute("aria-pressed", pressed ? "false" : "true");
});

el("avatarFileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedAvatarFile = file;
  el("avatarPreview").style.backgroundImage = `url(${URL.createObjectURL(file)})`;
});

el("bgFileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedBgFile = file;
  clearBg = false;
  el("bgPreview").style.backgroundImage = `url(${URL.createObjectURL(file)})`;
});
el("bgClearBtn").addEventListener("click", () => {
  selectedBgFile = null;
  clearBg = true;
  el("bgFileInput").value = "";
  el("bgPreview").style.backgroundImage = "none";
});

el("profileSubmit").addEventListener("click", async () => {
  if (!currentAccount) return;
  el("profileError").hidden = true;
  el("profileSubmit").disabled = true;
  el("profileSubmit").textContent = "저장 중...";

  try {
    const nickname = el("nicknameInput").value.trim() || ACCOUNTS[currentAccount].label;
    const activePreset = document.querySelector(".preset-btn.active");
    const activeColor = document.querySelector(".color-swatch.active");
    const showTime = el("showTimeToggle").getAttribute("aria-pressed") === "true";

    const update = {
      nickname,
      color: activeColor ? activeColor.dataset.color : ((profiles[currentAccount] && profiles[currentAccount].color) || "#185FA5"),
      status: {
        preset: activePreset ? activePreset.dataset.preset : "온라인",
        note: el("statusNoteInput").value.trim(),
        location: el("locationInput").value.trim(),
      },
      showTime,
      expressions: workingExpressions,
    };

    if (selectedAvatarFile) {
      update.avatarUrl = await resizeImageToDataUrl(selectedAvatarFile, 240, 0.85, "png");
    }
    if (selectedBgFile) {
      update.bgUrl = await resizeImageToDataUrl(selectedBgFile, 480, 0.7);
    } else if (clearBg) {
      update.bgUrl = firebase.firestore.FieldValue.delete();
    }

    await db.collection("profiles").doc(currentAccount).set(update, { merge: true });
    await db.collection("site").doc("shared").set({ decorations: workingDecorations }, { merge: true });
    el("profileBackdrop").classList.remove("open");
  } catch (err) {
    el("profileError").textContent = "저장에 실패했어요. 다시 시도해주세요.";
    el("profileError").hidden = false;
  } finally {
    el("profileSubmit").disabled = false;
    el("profileSubmit").textContent = "저장";
  }
});

/* ===== 공용 장식(스티커) ===== */
function renderDecoLayer() {
  const layer = el("decoLayer");
  layer.innerHTML = "";
  (sharedData.decorations || []).forEach((d, i) => {
    const img = document.createElement("img");
    img.className = "corner-deco-item";
    img.src = d.imageUrl;
    img.alt = "장식";
    img.dataset.id = d.id;
    const centerX = d.centerX != null ? d.centerX : 300;
    img.style.left = `calc(50vw + ${centerX}px)`;
    img.style.bottom = (d.bottom || 24) + "px";
    img.style.width = (d.width || 120) + "px";
    img.style.zIndex = String(5 + (d.z != null ? d.z : i));
    layer.appendChild(img);
  });
}

el("decoAdjustMenuItem").addEventListener("click", () => {
  el("menuBackdrop").classList.remove("open");
  enterDecoAdjustMode();
});
el("decoAdjustDone").addEventListener("click", () => exitDecoAdjustMode(true));

let decoAdjustActive = false;
let adjustZState = [];

function enterDecoAdjustMode() {
  decoAdjustActive = true;
  adjustZState = (sharedData.decorations || []).map((d, i) => ({ id: d.id, z: d.z != null ? d.z : i }));

  document.querySelectorAll(".corner-deco-item").forEach((img) => {
    img.style.pointerEvents = "auto";
    img.style.cursor = "move";
    img.style.outline = "2px dashed var(--accent)";

    const handle = document.createElement("div");
    handle.className = "deco-resize-handle visible";
    handle.dataset.for = img.dataset.id;
    document.body.appendChild(handle);
    positionResizeHandleFor(img, handle);

    const toolbar = document.createElement("div");
    toolbar.className = "deco-order-toolbar";
    toolbar.dataset.for = img.dataset.id;
    toolbar.innerHTML =
      '<button type="button" data-action="back">뒤로</button>' +
      '<button type="button" data-action="front">앞으로</button>';
    document.body.appendChild(toolbar);
    positionOrderToolbarFor(img, toolbar);
  });
  el("decoAdjustDone").classList.add("visible");
}

function exitDecoAdjustMode(save) {
  decoAdjustActive = false;
  document.querySelectorAll(".corner-deco-item").forEach((img) => {
    img.style.pointerEvents = "none";
    img.style.cursor = "";
    img.style.outline = "";
  });
  document.querySelectorAll(".deco-resize-handle, .deco-order-toolbar").forEach((n) => n.remove());
  el("decoAdjustDone").classList.remove("visible");

  if (save) {
    const updated = (sharedData.decorations || []).map((d) => {
      const img = document.querySelector(`.corner-deco-item[data-id="${d.id}"]`);
      const zEntry = adjustZState.find((z) => z.id === d.id);
      const merged = { ...d };
      if (img) {
        const rect = img.getBoundingClientRect();
        merged.centerX = Math.round(rect.left - window.innerWidth / 2);
        merged.bottom = Math.round(window.innerHeight - rect.bottom);
        merged.width = Math.round(rect.width);
      }
      if (zEntry) merged.z = zEntry.z;
      return merged;
    });
    db.collection("site").doc("shared").set({ decorations: updated }, { merge: true });
  }
  adjustZState = [];
}

function positionResizeHandleFor(img, handle) {
  const rect = img.getBoundingClientRect();
  handle.style.left = (rect.right - 7) + "px";
  handle.style.top = (rect.bottom - 7) + "px";
}
function positionOrderToolbarFor(img, toolbar) {
  const rect = img.getBoundingClientRect();
  toolbar.style.left = rect.left + "px";
  toolbar.style.top = (rect.top - 32) + "px";
}

document.addEventListener("click", (e) => {
  if (!decoAdjustActive) return;
  const btn = e.target.closest(".deco-order-toolbar button");
  if (!btn) return;
  const id = btn.closest(".deco-order-toolbar").dataset.for;
  const entry = adjustZState.find((z) => z.id === id);
  if (!entry) return;
  const zs = adjustZState.map((z) => z.z);
  entry.z = btn.dataset.action === "front" ? Math.max(...zs) + 1 : Math.min(...zs) - 1;
  const img = document.querySelector(`.corner-deco-item[data-id="${id}"]`);
  if (img) img.style.zIndex = String(5 + entry.z);
});

el("decoLayer").addEventListener("mousedown", (e) => {
  if (!decoAdjustActive) return;
  const img = e.target.closest(".corner-deco-item");
  if (!img) return;
  e.preventDefault();
  const rect = img.getBoundingClientRect();
  const startCenterX = rect.left - window.innerWidth / 2;
  const startBottom = window.innerHeight - rect.bottom;
  const startX = e.clientX;
  const startY = e.clientY;
  const handle = document.querySelector(`.deco-resize-handle[data-for="${img.dataset.id}"]`);
  const toolbar = document.querySelector(`.deco-order-toolbar[data-for="${img.dataset.id}"]`);

  function onMove(ev) {
    const newCenterX = startCenterX + (ev.clientX - startX);
    img.style.left = `calc(50vw + ${newCenterX}px)`;
    img.style.bottom = (startBottom - (ev.clientY - startY)) + "px";
    if (handle) positionResizeHandleFor(img, handle);
    if (toolbar) positionOrderToolbarFor(img, toolbar);
  }
  function onUp() {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  }
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
});

document.addEventListener("mousedown", (e) => {
  if (!decoAdjustActive) return;
  const handle = e.target.closest(".deco-resize-handle");
  if (!handle) return;
  e.preventDefault();
  e.stopPropagation();
  const img = document.querySelector(`.corner-deco-item[data-id="${handle.dataset.for}"]`);
  if (!img) return;
  const startWidth = img.getBoundingClientRect().width;
  const startX = e.clientX;
  const toolbar = document.querySelector(`.deco-order-toolbar[data-for="${handle.dataset.for}"]`);

  function onMove(ev) {
    const newWidth = Math.min(400, Math.max(50, startWidth + (ev.clientX - startX)));
    img.style.width = newWidth + "px";
    positionResizeHandleFor(img, handle);
    if (toolbar) positionOrderToolbarFor(img, toolbar);
  }
  function onUp() {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  }
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
});

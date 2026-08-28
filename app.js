const SUPABASE_URL = "https://omperlnpvpjwnryboyob.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_gYQG_iVrP4AfGqPLQJVRFQ_jCQ7ELvc";
const SESSION_KEY = "receipt-splitter-supabase-session";
const SOUND_ENABLED_KEY = "receipt-splitter-sound-enabled";

const state = {
  items: [],
  history: [],
  profile: {},
  session: null,
  authMode: "register",
  settingsOpen: false,
  lastSettlementKey: "",
  celebrationTimer: null,
  confettiTimer: null,
  soundEnabled: localStorage.getItem(SOUND_ENABLED_KEY) !== "false",
  audioContext: null,
  editingSettlementId: null,
  draftItemsBeforeEdit: null,
};

const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const people = {
  a: document.querySelector("#person-a"),
  b: document.querySelector("#person-b"),
};

const accountEmailInput = document.querySelector("#account-email");
const accountPasswordInput = document.querySelector("#account-password");
const accountNameInput = document.querySelector("#account-name");
const loginAccountButton = document.querySelector("#login-account");
const registerAccountButton = document.querySelector("#register-account");
const showLoginButton = document.querySelector("#show-login");
const showRegisterButton = document.querySelector("#show-register");
const authView = document.querySelector("#auth-view");
const appView = document.querySelector("#app-view");
const authTitle = document.querySelector("#auth-title");
const authDescription = document.querySelector("#auth-description");
const authStatus = document.querySelector("#auth-status");
const registerPrompt = document.querySelector("#register-prompt");
const loginPrompt = document.querySelector("#login-prompt");
const currentEmail = document.querySelector("#current-email");
const settingsToggleButton = document.querySelector("#settings-toggle");
const settingsPanel = document.querySelector("#settings-panel");
const saveAccountButton = document.querySelector("#save-account");
const logoutAccountButton = document.querySelector("#logout-account");
const accountStatus = document.querySelector("#account-status");
const soundEnabledInput = document.querySelector("#sound-enabled");
const itemList = document.querySelector("#item-list");
const itemTemplate = document.querySelector("#item-template");
const addRowButton = document.querySelector("#add-row");
const clearButton = document.querySelector("#clear-button");
const copyResultButton = document.querySelector("#copy-result");
const completeSettlementButton = document.querySelector("#complete-settlement");
const copyStatus = document.querySelector("#copy-status");
const grandTotalEl = document.querySelector("#grand-total");
const sharedTotalEl = document.querySelector("#shared-total");
const itemCountEl = document.querySelector("#item-count");
const settlementMain = document.querySelector("#settlement-main");
const settlementSub = document.querySelector("#settlement-sub");
const settlementText = document.querySelector("#settlement-text");
const personALabel = document.querySelector("#person-a-label");
const personBLabel = document.querySelector("#person-b-label");
const aOwed = document.querySelector("#a-owed");
const bOwed = document.querySelector("#b-owed");
const aPaid = document.querySelector("#a-paid");
const bPaid = document.querySelector("#b-paid");
const historyList = document.querySelector("#history-list");
const historyCount = document.querySelector("#history-count");
const resultCard = document.querySelector(".result-card");
const celebration = document.querySelector("#celebration");
const celebrationText = document.querySelector("#celebration-text");
const editingBanner = document.querySelector("#editing-banner");
const cancelEditButton = document.querySelector("#cancel-edit");
const confetti = document.querySelector("#confetti");

addRowButton.addEventListener("click", () => addItem());
clearButton.addEventListener("click", clearItems);
copyResultButton.addEventListener("click", copySettlement);
completeSettlementButton.addEventListener("click", completeSettlement);
cancelEditButton.addEventListener("click", cancelHistoryEdit);
soundEnabledInput.addEventListener("change", handleSoundPreference);
loginAccountButton.addEventListener("click", loginAccount);
registerAccountButton.addEventListener("click", registerAccount);
showLoginButton.addEventListener("click", () => setAuthMode("login"));
showRegisterButton.addEventListener("click", () => setAuthMode("register"));
settingsToggleButton.addEventListener("click", toggleSettingsPanel);
saveAccountButton.addEventListener("click", saveProfile);
logoutAccountButton.addEventListener("click", logoutAccount);
accountNameInput.addEventListener("input", handleProfileInput);
people.a.addEventListener("input", handleProfileInput);
people.b.addEventListener("input", handleProfileInput);

initializeApp();

async function initializeApp() {
  state.session = await restoreSession();
  if (state.session) {
    await loadCloudData();
  } else {
    setAuthMode("register");
  }
  applyProfile();
  addItem({ name: "", price: 0, owner: "shared", payer: "a" });
}

function addItem(item = {}) {
  state.items.unshift({
    id: crypto.randomUUID(),
    name: item.name || "",
    price: Number(item.price) || 0,
    taxMode: item.taxMode || "included",
    owner: item.owner || "shared",
    payer: item.payer || "a",
  });
  render();
  itemList.firstElementChild?.querySelector(".name-input")?.focus();
}

function clearItems() {
  state.items = [];
  render();
}

function render() {
  itemList.replaceChildren();
  for (const item of state.items) {
    itemList.append(createItemRow(item));
  }
  updatePersonLabels();
  renderTotals();
  renderHistory();
  renderEditingState();
}

function createItemRow(item) {
  const row = itemTemplate.content.firstElementChild.cloneNode(true);
  const nameInput = row.querySelector(".name-input");
  const priceInput = row.querySelector(".price-input");
  const taxSelect = row.querySelector(".tax-select");
  const taxPreview = row.querySelector(".tax-preview");
  const ownerSelect = row.querySelector(".owner-select");
  const payerSelect = row.querySelector(".payer-select");
  const deleteButton = row.querySelector(".delete-row");

  nameInput.value = item.name;
  priceInput.value = item.price || "";
  taxSelect.value = item.taxMode;
  ownerSelect.value = item.owner;
  payerSelect.value = item.payer;
  updateTaxPreview(taxPreview, item);
  syncSelectLabels(ownerSelect, payerSelect);

  nameInput.addEventListener("input", () => {
    item.name = nameInput.value;
    renderTotals();
  });
  priceInput.addEventListener("input", () => {
    item.price = Number(priceInput.value) || 0;
    updateTaxPreview(taxPreview, item);
    renderTotals();
  });
  taxSelect.addEventListener("change", () => {
    item.taxMode = taxSelect.value;
    updateTaxPreview(taxPreview, item);
    renderTotals();
  });
  ownerSelect.addEventListener("change", () => {
    item.owner = ownerSelect.value;
    renderTotals();
  });
  payerSelect.addEventListener("change", () => {
    item.payer = payerSelect.value;
    renderTotals();
  });
  deleteButton.addEventListener("click", () => {
    state.items = state.items.filter((candidate) => candidate.id !== item.id);
    render();
  });
  return row;
}

function updateTaxPreview(preview, item) {
  preview.textContent = `税込 ${formatYen(getItemTotal(item))}`;
}

function updatePersonLabels() {
  personALabel.textContent = getName("a");
  personBLabel.textContent = getName("b");
  document.querySelectorAll(".owner-select").forEach((select) => {
    select.options[1].textContent = `${getName("a")}だけ`;
    select.options[2].textContent = `${getName("b")}だけ`;
  });
  document.querySelectorAll(".payer-select").forEach((select) => {
    select.options[0].textContent = `${getName("a")}が払った`;
    select.options[1].textContent = `${getName("b")}が払った`;
  });
}

function syncSelectLabels(ownerSelect, payerSelect) {
  ownerSelect.options[1].textContent = `${getName("a")}だけ`;
  ownerSelect.options[2].textContent = `${getName("b")}だけ`;
  payerSelect.options[0].textContent = `${getName("a")}が払った`;
  payerSelect.options[1].textContent = `${getName("b")}が払った`;
}

function renderTotals() {
  const totals = calculateSettlement();
  grandTotalEl.textContent = formatYen(totals.grandTotal);
  sharedTotalEl.textContent = formatYen(totals.sharedTotal);
  itemCountEl.textContent = `${totals.itemCount}`;
  completeSettlementButton.disabled = totals.itemCount === 0;
  aOwed.textContent = formatYen(totals.owed.a);
  bOwed.textContent = formatYen(totals.owed.b);
  aPaid.textContent = formatYen(totals.paid.a);
  bPaid.textContent = formatYen(totals.paid.b);

  const { from, to, amount } = totals.transfer;
  if (amount === 0) {
    settlementMain.textContent = "精算なし";
    settlementSub.textContent = "このままで差額はありません。";
  } else {
    settlementMain.textContent = `${getName(from)} → ${getName(to)} ${formatYen(amount)}`;
    settlementSub.textContent = `${getName(from)}が${getName(to)}に支払えば精算完了です。`;
  }
  const settlementKey = `${totals.grandTotal}-${totals.sharedTotal}-${from}-${to}-${amount}`;
  if (state.lastSettlementKey && state.lastSettlementKey !== settlementKey) {
    resultCard.classList.remove("is-updated");
    void resultCard.offsetWidth;
    resultCard.classList.add("is-updated");
  }
  state.lastSettlementKey = settlementKey;
  settlementText.value = buildSettlementText(totals);
}

function calculateSettlement() {
  const totals = {
    grandTotal: 0,
    sharedTotal: 0,
    itemCount: 0,
    owed: { a: 0, b: 0 },
    paid: { a: 0, b: 0 },
    transfer: { from: "a", to: "b", amount: 0 },
  };

  for (const item of state.items) {
    const price = getItemTotal(item);
    if (item.name.trim() || Number(item.price) > 0) totals.itemCount += 1;
    totals.grandTotal += price;
    totals.paid[item.payer] += price;
    if (item.owner === "shared") {
      totals.sharedTotal += price;
      totals.owed.a += price / 2;
      totals.owed.b += price / 2;
    } else {
      totals.owed[item.owner] += price;
    }
  }

  totals.owed.a = Math.round(totals.owed.a);
  totals.owed.b = totals.grandTotal - totals.owed.a;
  const balanceA = totals.paid.a - totals.owed.a;
  if (balanceA > 0) {
    totals.transfer = { from: "b", to: "a", amount: balanceA };
  } else if (balanceA < 0) {
    totals.transfer = { from: "a", to: "b", amount: Math.abs(balanceA) };
  }
  return totals;
}

function getItemTotal(item) {
  const price = Math.max(0, Math.round(Number(item.price) || 0));
  return Math.round(price * (1 + getTaxRate(item)));
}

function getTaxRate(item) {
  if (item.taxMode === "excluded") return 0.1;
  if (item.taxMode === "reduced") return 0.08;
  return 0;
}

function getTaxLabel(item) {
  if (item.taxMode === "excluded") return "税抜 +10%";
  if (item.taxMode === "reduced") return "税抜 +8%";
  return "税込";
}

function buildSettlementText(totals) {
  const itemLines = state.items.length
    ? state.items.map((item) => {
        const owner = item.owner === "shared" ? "2人" : getName(item.owner);
        return `・${item.name || "商品名未入力"} ${formatYen(getItemTotal(item))} (${getTaxLabel(item)}) / ${owner} / 支払い:${getName(item.payer)}`;
      })
    : ["・商品未入力"];
  const transfer =
    totals.transfer.amount === 0
      ? "精算なし"
      : `${getName(totals.transfer.from)}が${getName(totals.transfer.to)}に${formatYen(totals.transfer.amount)}払う`;
  return [
    "買い出し精算",
    "",
    ...itemLines,
    "",
    `合計: ${formatYen(totals.grandTotal)}`,
    `共有分: ${formatYen(totals.sharedTotal)}`,
    `${getName("a")}の負担: ${formatYen(totals.owed.a)} / 支払済: ${formatYen(totals.paid.a)}`,
    `${getName("b")}の負担: ${formatYen(totals.owed.b)} / 支払済: ${formatYen(totals.paid.b)}`,
    "",
    `結論: ${transfer}`,
  ].join("\n");
}

async function copySettlement() {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(settlementText.value);
    } else {
      fallbackCopy(settlementText.value);
    }
    copyStatus.textContent = "コピー済み";
  } catch (error) {
    copyStatus.textContent = "コピー失敗";
  }
}

async function completeSettlement() {
  const totals = calculateSettlement();
  if (!state.session) {
    copyStatus.textContent = "ログインが必要";
    accountEmailInput.focus();
    return;
  }
  if (totals.itemCount === 0) {
    copyStatus.textContent = "商品未入力";
    return;
  }

  prepareCelebrationAudio();
  completeSettlementButton.disabled = true;
  copyStatus.textContent = "保存中...";
  const editingEntry = state.editingSettlementId
    ? state.history.find((entry) => entry.id === state.editingSettlementId)
    : null;
  const historyItem = {
    createdAt: editingEntry?.createdAt || new Date().toISOString(),
    people: { a: getName("a"), b: getName("b") },
    items: state.items
      .filter((item) => item.name.trim() || Number(item.price) > 0)
      .map((item) => ({
        name: item.name.trim() || "商品名未入力",
        price: Math.max(0, Math.round(Number(item.price) || 0)),
        taxMode: item.taxMode,
        owner: item.owner,
        payer: item.payer,
      })),
    totals,
    memo: buildSettlementText(totals),
  };

  try {
    let savedEntry;
    if (editingEntry) {
      const rows = await supabaseRequest(`/rest/v1/settlements?id=eq.${encodeURIComponent(editingEntry.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ data: historyItem }),
      });
      if (!rows[0]) {
        throw new Error("履歴を更新できませんでした。Supabase の更新権限を確認してください。");
      }
      savedEntry = { ...historyItem, id: rows[0].id, createdAt: rows[0].created_at };
      state.history = state.history.map((entry) => (entry.id === savedEntry.id ? savedEntry : entry));
    } else {
      const rows = await supabaseRequest("/rest/v1/settlements", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify([{ data: historyItem }]),
      });
      savedEntry = { ...historyItem, id: rows[0].id, createdAt: rows[0].created_at };
      state.history = [savedEntry, ...state.history];
    }
    state.editingSettlementId = null;
    state.draftItemsBeforeEdit = null;
    state.items = [];
    addItem({ name: "", price: 0, owner: "shared", payer: "a" });
    copyStatus.textContent = editingEntry ? "変更を保存" : "精算を保存";
    showCelebration(editingEntry ? "変更を保存しました" : "精算を記録しました");
  } catch (error) {
    copyStatus.textContent = `保存失敗: ${error.message}`;
  } finally {
    renderTotals();
  }
}

function showCelebration(message) {
  window.clearTimeout(state.celebrationTimer);
  celebrationText.textContent = message;
  celebration.hidden = false;
  celebration.classList.remove("is-visible");
  void celebration.offsetWidth;
  celebration.classList.add("is-visible");
  resultCard.classList.remove("is-celebrating");
  void resultCard.offsetWidth;
  resultCard.classList.add("is-celebrating");
  burstConfetti();
  playCelebrationSound();
  state.celebrationTimer = window.setTimeout(() => {
    celebration.classList.remove("is-visible");
    window.setTimeout(() => {
      celebration.hidden = true;
    }, 220);
  }, 2200);
}

function handleSoundPreference() {
  state.soundEnabled = soundEnabledInput.checked;
  localStorage.setItem(SOUND_ENABLED_KEY, String(state.soundEnabled));
}

function prepareCelebrationAudio() {
  if (!state.soundEnabled) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  state.audioContext ||= new AudioContextClass();
  if (state.audioContext.state === "suspended") {
    state.audioContext.resume().catch(() => {});
  }
}

function playCelebrationSound() {
  const context = state.audioContext;
  if (!state.soundEnabled || !context || context.state !== "running") return;

  const notes = [523.25, 659.25, 783.99, 1046.5];
  const start = context.currentTime + 0.03;
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = start + index * 0.1;
    const noteEnd = noteStart + 0.18;
    oscillator.type = index === notes.length - 1 ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.075, noteStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd + 0.02);
  });
}

function burstConfetti() {
  window.clearTimeout(state.confettiTimer);
  confetti.replaceChildren();
  const colors = ["#173866", "#276cc5", "#5b9fe5", "#b8d8f5", "#ffffff"];
  for (let index = 0; index < 28; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.setProperty("--x", `${Math.round((Math.random() - 0.5) * 520)}px`);
    piece.style.setProperty("--y", `${120 + Math.round(Math.random() * 220)}px`);
    piece.style.setProperty("--r", `${Math.round((Math.random() - 0.5) * 540)}deg`);
    piece.style.setProperty("--delay", `${Math.round(Math.random() * 80)}ms`);
    piece.style.backgroundColor = colors[index % colors.length];
    confetti.append(piece);
  }
  state.confettiTimer = window.setTimeout(() => confetti.replaceChildren(), 1500);
}

function renderHistory() {
  historyCount.textContent = `${state.history.length}件`;
  historyList.replaceChildren();
  for (const entry of state.history) historyList.append(createHistoryEntry(entry));
}

function createHistoryEntry(entry) {
  const article = document.createElement("article");
  article.className = "history-entry";
  const title = document.createElement("div");
  title.className = "history-entry-title";
  const date = document.createElement("span");
  date.textContent = formatDate(entry.createdAt);
  const result = document.createElement("strong");
  result.textContent = formatHistoryTransfer(entry);
  const actions = document.createElement("div");
  actions.className = "history-entry-actions";
  const editButton = document.createElement("button");
  editButton.className = "text-button history-edit-button";
  editButton.type = "button";
  editButton.textContent = state.editingSettlementId === entry.id ? "編集中" : "編集";
  editButton.disabled = state.editingSettlementId === entry.id;
  editButton.addEventListener("click", () => editHistoryEntry(entry));
  actions.append(result, editButton);
  title.append(date, actions);
  const details = document.createElement("p");
  details.textContent = `${entry.people.a} / ${entry.people.b} ・ ${formatYen(entry.totals.grandTotal)} ・ ${entry.items.length}件`;
  const itemSummary = document.createElement("small");
  itemSummary.textContent = entry.items.slice(0, 3).map((item) => item.name).join("、") || "商品なし";
  article.append(title, details, itemSummary);
  return article;
}

function renderEditingState() {
  const editing = Boolean(state.editingSettlementId);
  editingBanner.hidden = !editing;
  completeSettlementButton.textContent = editing ? "変更を保存" : "精算完了";
}

function editHistoryEntry(entry) {
  if (!state.editingSettlementId) {
    state.draftItemsBeforeEdit = state.items.map((item) => ({ ...item }));
  }
  state.editingSettlementId = entry.id;
  state.items = entry.items.map((item) => ({
    id: crypto.randomUUID(),
    name: item.name,
    price: Number(item.price) || 0,
    taxMode: item.taxMode || "included",
    owner: item.owner,
    payer: item.payer,
  }));
  if (state.items.length === 0) {
    state.items = [{ id: crypto.randomUUID(), name: "", price: 0, owner: "shared", payer: "a" }];
  }
  copyStatus.textContent = "過去の精算を編集中";
  render();
  document.querySelector(".topbar")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelHistoryEdit() {
  state.items = state.draftItemsBeforeEdit?.map((item) => ({ ...item })) || [];
  state.draftItemsBeforeEdit = null;
  state.editingSettlementId = null;
  copyStatus.textContent = "編集をやめました";
  if (state.items.length === 0) {
    addItem({ name: "", price: 0, owner: "shared", payer: "a" });
    return;
  }
  render();
}

function formatHistoryTransfer(entry) {
  const { from, to, amount } = entry.totals.transfer;
  if (amount === 0) return "精算なし";
  return `${entry.people[from]} → ${entry.people[to]} ${formatYen(amount)}`;
}

function handleProfileInput() {
  if (state.session) accountStatus.textContent = "名前は未保存";
  render();
}

function applyProfile() {
  const loggedIn = Boolean(state.session);
  authView.hidden = loggedIn;
  appView.hidden = !loggedIn;
  accountNameInput.value = state.profile.accountName || "";
  people.a.value = state.profile.people?.a || "自分";
  people.b.value = state.profile.people?.b || "相手";
  currentEmail.textContent = loggedIn ? state.session.user.email : "";
  accountStatus.textContent = loggedIn ? "同期済み" : "";
  renderSettingsPanel();
  render();
}

function toggleSettingsPanel() {
  state.settingsOpen = !state.settingsOpen;
  renderSettingsPanel();
}

function renderSettingsPanel() {
  settingsPanel.hidden = !state.settingsOpen;
  settingsToggleButton.setAttribute("aria-expanded", String(state.settingsOpen));
  settingsToggleButton.setAttribute("aria-label", state.settingsOpen ? "精算設定を閉じる" : "精算設定を開く");
  settingsToggleButton.title = state.settingsOpen ? "精算設定を閉じる" : "精算設定";
  soundEnabledInput.checked = state.soundEnabled;
}

function setAuthMode(mode) {
  state.authMode = mode;
  const registering = mode === "register";
  authTitle.textContent = registering ? "アカウントを作成" : "ログイン";
  authDescription.textContent = registering
    ? "精算履歴を保存して、どの端末からでも使えます。"
    : "登録したメールアドレスとパスワードを入力してください。";
  accountPasswordInput.autocomplete = registering ? "new-password" : "current-password";
  registerAccountButton.hidden = !registering;
  loginAccountButton.hidden = registering;
  registerPrompt.hidden = !registering;
  loginPrompt.hidden = registering;
  showLoginButton.hidden = !registering;
  showRegisterButton.hidden = registering;
  authStatus.textContent = "";
}

async function registerAccount() {
  const credentials = getCredentials();
  if (!credentials) return;
  setAuthLoading(true, "登録中...");
  try {
    const result = await supabaseRequest("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify(credentials),
    }, null);
    if (result.access_token) {
      state.session = result;
      saveSession();
      await loadCloudData();
      accountPasswordInput.value = "";
      applyProfile();
    } else {
      authStatus.textContent = "登録を完了できませんでした。Supabase の Confirm email をオフにしてください。";
    }
  } catch (error) {
    authStatus.textContent = `登録失敗: ${error.message}`;
  } finally {
    if (!state.session) setAuthLoading(false);
  }
}

async function loginAccount() {
  const credentials = getCredentials();
  if (!credentials) return;
  setAuthLoading(true, "ログイン中...");
  try {
    const session = await supabaseRequest("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify(credentials),
    }, null);
    state.session = session;
    saveSession();
    await loadCloudData();
    accountPasswordInput.value = "";
    applyProfile();
  } catch (error) {
    authStatus.textContent = `ログイン失敗: ${error.message}`;
  } finally {
    if (!state.session) setAuthLoading(false);
  }
}

async function logoutAccount() {
  try {
    if (state.session) {
      await supabaseRequest("/auth/v1/logout", { method: "POST" });
    }
  } catch (error) {
    // Clearing the local session still logs this browser out.
  }
  state.session = null;
  state.profile = {};
  state.history = [];
  state.settingsOpen = false;
  localStorage.removeItem(SESSION_KEY);
  accountEmailInput.value = "";
  accountPasswordInput.value = "";
  setAuthMode("login");
  applyProfile();
}

async function saveProfile() {
  if (!state.session) return;
  const accountName = accountNameInput.value.trim();
  if (!accountName) {
    accountStatus.textContent = "精算名を入力してください";
    accountNameInput.focus();
    return;
  }
  saveAccountButton.disabled = true;
  accountStatus.textContent = "保存中...";
  const profile = {
    id: state.session.user.id,
    account_name: accountName,
    person_a: getName("a"),
    person_b: getName("b"),
    updated_at: new Date().toISOString(),
  };
  try {
    await supabaseRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(state.session.user.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(profile),
    });
    state.profile = { accountName: profile.account_name, people: { a: profile.person_a, b: profile.person_b } };
    accountStatus.textContent = "名前を保存しました";
    render();
  } catch (error) {
    accountStatus.textContent = `保存失敗: ${error.message}`;
  } finally {
    saveAccountButton.disabled = false;
  }
}

async function loadCloudData() {
  try {
    const userId = encodeURIComponent(state.session.user.id);
    const profiles = await supabaseRequest(`/rest/v1/profiles?id=eq.${userId}&select=*`);
    if (profiles.length === 0) {
      const profile = {
        id: state.session.user.id,
        account_name: "精算アカウント",
        person_a: "自分",
        person_b: "相手",
      };
      await supabaseRequest("/rest/v1/profiles", {
        method: "POST",
        body: JSON.stringify(profile),
      });
      state.profile = { accountName: profile.account_name, people: { a: profile.person_a, b: profile.person_b } };
    } else {
      const profile = profiles[0];
      state.profile = {
        accountName: profile.account_name,
        people: { a: profile.person_a, b: profile.person_b },
      };
    }

    const rows = await supabaseRequest("/rest/v1/settlements?select=id,created_at,data&order=created_at.desc&limit=30");
    state.history = rows.map((row) => ({ ...row.data, id: row.id, createdAt: row.created_at }));
  } catch (error) {
    state.history = [];
    accountStatus.textContent = `データ取得失敗: ${error.message}`;
  }
}

function getCredentials() {
  const email = accountEmailInput.value.trim();
  const password = accountPasswordInput.value;
  if (!email || !password) {
    authStatus.textContent = "メールアドレスとパスワードを入力してください";
    return null;
  }
  if (password.length < 6) {
    authStatus.textContent = "パスワードは6文字以上です";
    return null;
  }
  return { email, password };
}

function setAuthLoading(isLoading, message = "") {
  loginAccountButton.disabled = isLoading;
  registerAccountButton.disabled = isLoading;
  if (message) authStatus.textContent = message;
}

async function restoreSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (!session?.access_token || !session?.refresh_token) return null;
    if (session.expires_at * 1000 > Date.now() + 60_000) return session;
    const refreshed = await supabaseRequest("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    }, null);
    localStorage.setItem(SESSION_KEY, JSON.stringify(refreshed));
    return refreshed;
  } catch (error) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function saveSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
}

async function supabaseRequest(path, options = {}, token = state.session?.access_token) {
  const headers = new Headers(options.headers || {});
  headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = { message: text };
  }
  if (!response.ok) throw new Error(data?.msg || data?.message || "通信に失敗しました");
  return data;
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function getName(person) {
  const value = people[person].value.trim();
  return value || (person === "a" ? "自分" : "相手");
}

function formatYen(value) {
  return yenFormatter.format(Math.round(Number(value) || 0));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

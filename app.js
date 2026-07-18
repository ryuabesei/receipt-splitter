const SUPABASE_URL = "https://omperlnpvpjwnryboyob.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_gYQG_iVrP4AfGqPLQJVRFQ_jCQ7ELvc";
const SESSION_KEY = "receipt-splitter-supabase-session";

const state = {
  items: [],
  history: [],
  profile: {},
  session: null,
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
const saveAccountButton = document.querySelector("#save-account");
const logoutAccountButton = document.querySelector("#logout-account");
const accountStatus = document.querySelector("#account-status");
const itemList = document.querySelector("#item-list");
const itemTemplate = document.querySelector("#item-template");
const addRowButton = document.querySelector("#add-row");
const clearButton = document.querySelector("#clear-button");
const sampleButton = document.querySelector("#sample-button");
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

const sampleItems = [
  { name: "鍋用カット野菜", price: 258, owner: "shared", payer: "a" },
  { name: "豚ばら肉", price: 612, owner: "shared", payer: "a" },
  { name: "豆腐", price: 98, owner: "shared", payer: "b" },
  { name: "ビール 6缶", price: 1080, owner: "shared", payer: "b" },
  { name: "自分用シャンプー", price: 698, owner: "a", payer: "a" },
  { name: "相手のコーヒー", price: 220, owner: "b", payer: "a" },
];

addRowButton.addEventListener("click", () => addItem());
clearButton.addEventListener("click", clearItems);
sampleButton.addEventListener("click", loadSample);
copyResultButton.addEventListener("click", copySettlement);
completeSettlementButton.addEventListener("click", completeSettlement);
loginAccountButton.addEventListener("click", loginAccount);
registerAccountButton.addEventListener("click", registerAccount);
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
  }
  applyProfile();
  addItem({ name: "", price: 0, owner: "shared", payer: "a" });
}

function addItem(item = {}) {
  state.items.push({
    id: crypto.randomUUID(),
    name: item.name || "",
    price: Number(item.price) || 0,
    owner: item.owner || "shared",
    payer: item.payer || "a",
  });
  render();
  itemList.lastElementChild?.querySelector(".name-input")?.focus();
}

function clearItems() {
  state.items = [];
  render();
}

function loadSample() {
  state.items = sampleItems.map((item) => ({ ...item, id: crypto.randomUUID() }));
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
}

function createItemRow(item) {
  const row = itemTemplate.content.firstElementChild.cloneNode(true);
  const nameInput = row.querySelector(".name-input");
  const priceInput = row.querySelector(".price-input");
  const ownerSelect = row.querySelector(".owner-select");
  const payerSelect = row.querySelector(".payer-select");
  const deleteButton = row.querySelector(".delete-row");

  nameInput.value = item.name;
  priceInput.value = item.price || "";
  ownerSelect.value = item.owner;
  payerSelect.value = item.payer;
  syncSelectLabels(ownerSelect, payerSelect);

  nameInput.addEventListener("input", () => {
    item.name = nameInput.value;
    renderTotals();
  });
  priceInput.addEventListener("input", () => {
    item.price = Number(priceInput.value) || 0;
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
    const price = Math.max(0, Math.round(Number(item.price) || 0));
    if (item.name.trim() || price > 0) totals.itemCount += 1;
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

function buildSettlementText(totals) {
  const itemLines = state.items.length
    ? state.items.map((item) => {
        const owner = item.owner === "shared" ? "2人" : getName(item.owner);
        return `・${item.name || "商品名未入力"} ${formatYen(item.price)} / ${owner} / 支払い:${getName(item.payer)}`;
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

  completeSettlementButton.disabled = true;
  copyStatus.textContent = "保存中...";
  const historyItem = {
    createdAt: new Date().toISOString(),
    people: { a: getName("a"), b: getName("b") },
    items: state.items
      .filter((item) => item.name.trim() || Number(item.price) > 0)
      .map((item) => ({
        name: item.name.trim() || "商品名未入力",
        price: Math.max(0, Math.round(Number(item.price) || 0)),
        owner: item.owner,
        payer: item.payer,
      })),
    totals,
    memo: buildSettlementText(totals),
  };

  try {
    const rows = await supabaseRequest("/rest/v1/settlements", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{ data: historyItem }]),
    });
    state.history = [{ ...historyItem, id: rows[0].id, createdAt: rows[0].created_at }, ...state.history];
    state.items = [];
    addItem({ name: "", price: 0, owner: "shared", payer: "a" });
    copyStatus.textContent = "精算を保存";
  } catch (error) {
    copyStatus.textContent = `保存失敗: ${error.message}`;
  } finally {
    renderTotals();
  }
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
  title.append(date, result);
  const details = document.createElement("p");
  details.textContent = `${entry.people.a} / ${entry.people.b} ・ ${formatYen(entry.totals.grandTotal)} ・ ${entry.items.length}件`;
  const itemSummary = document.createElement("small");
  itemSummary.textContent = entry.items.slice(0, 3).map((item) => item.name).join("、") || "商品なし";
  article.append(title, details, itemSummary);
  return article;
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
  accountEmailInput.disabled = loggedIn;
  accountPasswordInput.disabled = loggedIn;
  loginAccountButton.disabled = loggedIn;
  registerAccountButton.disabled = loggedIn;
  accountNameInput.disabled = !loggedIn;
  people.a.disabled = !loggedIn;
  people.b.disabled = !loggedIn;
  saveAccountButton.disabled = !loggedIn;
  logoutAccountButton.disabled = !loggedIn;

  accountNameInput.value = state.profile.accountName || "";
  people.a.value = state.profile.people?.a || "自分";
  people.b.value = state.profile.people?.b || "相手";
  accountStatus.textContent = loggedIn ? `ログイン中: ${state.session.user.email}` : "ログインしてください";
  render();
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
    if (result.session) {
      state.session = result.session;
      saveSession();
      await loadCloudData();
      accountPasswordInput.value = "";
      applyProfile();
    } else {
      accountStatus.textContent = "確認メールを送信しました。確認後にログインしてください。";
    }
  } catch (error) {
    accountStatus.textContent = `登録失敗: ${error.message}`;
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
    accountStatus.textContent = `ログイン失敗: ${error.message}`;
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
  localStorage.removeItem(SESSION_KEY);
  accountEmailInput.value = "";
  accountPasswordInput.value = "";
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
    accountStatus.textContent = "メールアドレスとパスワードを入力してください";
    return null;
  }
  if (password.length < 6) {
    accountStatus.textContent = "パスワードは6文字以上です";
    return null;
  }
  return { email, password };
}

function setAuthLoading(isLoading, message = "") {
  loginAccountButton.disabled = isLoading;
  registerAccountButton.disabled = isLoading;
  if (message) accountStatus.textContent = message;
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

const LEGACY_HISTORY_KEY = "receipt-splitter-history";
const LEGACY_PROFILE_KEY = "receipt-splitter-profile";
const ACCOUNTS_KEY = "receipt-splitter-accounts";
const ACTIVE_ACCOUNT_KEY = "receipt-splitter-active-account";

const state = {
  items: [],
  accounts: loadAccounts(),
  activeAccountId: localStorage.getItem(ACTIVE_ACCOUNT_KEY) || "",
  history: [],
  profile: {},
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

const accountNameInput = document.querySelector("#account-name");
const accountSelect = document.querySelector("#account-select");
const loginAccountButton = document.querySelector("#login-account");
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
saveAccountButton.addEventListener("click", saveProfile);
logoutAccountButton.addEventListener("click", logoutAccount);
accountNameInput.addEventListener("input", handleProfileInput);
people.a.addEventListener("input", handleProfileInput);
people.b.addEventListener("input", handleProfileInput);

upgradeLegacyAccount();
state.profile = getActiveAccount();
state.history = state.profile.history || [];
applyProfile();
addItem({ name: "", price: 0, owner: "shared", payer: "a" });

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
  state.items = sampleItems.map((item) => ({
    ...item,
    id: crypto.randomUUID(),
  }));
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
    if (item.name.trim() || price > 0) {
      totals.itemCount += 1;
    }
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
  const text = settlementText.value;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopy(text);
    }
    copyStatus.textContent = "コピー済み";
  } catch (error) {
    copyStatus.textContent = "コピー失敗";
  }
}

function completeSettlement() {
  const totals = calculateSettlement();
  if (!state.activeAccountId) {
    copyStatus.textContent = "ログインが必要";
    accountNameInput.focus();
    return;
  }
  if (totals.itemCount === 0) {
    copyStatus.textContent = "商品未入力";
    return;
  }

  const historyItem = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    people: {
      a: getName("a"),
      b: getName("b"),
    },
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

  state.history = [historyItem, ...state.history].slice(0, 30);
  saveHistory();
  state.items = [];
  addItem({ name: "", price: 0, owner: "shared", payer: "a" });
  copyStatus.textContent = "精算を保存";
}

function renderHistory() {
  historyCount.textContent = `${state.history.length}件`;
  historyList.replaceChildren();
  for (const entry of state.history) {
    historyList.append(createHistoryEntry(entry));
  }
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
  itemSummary.textContent = entry.items
    .slice(0, 3)
    .map((item) => item.name)
    .join("、") || "商品なし";

  article.append(title, details, itemSummary);
  return article;
}

function formatHistoryTransfer(entry) {
  const { from, to, amount } = entry.totals.transfer;
  if (amount === 0) return "精算なし";
  return `${entry.people[from]} → ${entry.people[to]} ${formatYen(amount)}`;
}

function saveHistory() {
  if (!state.activeAccountId) return;
  state.accounts = state.accounts.map((account) =>
    account.id === state.activeAccountId ? { ...account, history: state.history } : account,
  );
  saveAccounts();
}

function handleProfileInput() {
  accountStatus.textContent = state.activeAccountId ? "未保存" : "未ログイン";
  render();
  if (state.activeAccountId) {
    saveProfile({ silent: true });
  }
}

function applyProfile() {
  renderAccountOptions();
  accountNameInput.value = state.profile.accountName || "";
  people.a.value = state.profile.people?.a || "自分";
  people.b.value = state.profile.people?.b || "相手";
  accountSelect.value = state.activeAccountId;
  accountStatus.textContent = state.activeAccountId ? `ログイン中: ${state.profile.accountName}` : "未ログイン";
}

function saveProfile(options = {}) {
  const accountName = accountNameInput.value.trim();
  if (!accountName) {
    accountStatus.textContent = "名前を入力";
    accountNameInput.focus();
    return;
  }

  const existingAccount = state.activeAccountId
    ? state.accounts.find((account) => account.id === state.activeAccountId)
    : null;

  state.profile = {
    id: existingAccount?.id || crypto.randomUUID(),
    accountName,
    people: {
      a: getName("a"),
      b: getName("b"),
    },
    history: existingAccount?.history || state.history || [],
    savedAt: new Date().toISOString(),
  };

  state.activeAccountId = state.profile.id;
  state.history = state.profile.history;
  upsertAccount(state.profile);
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, state.activeAccountId);
  renderAccountOptions();
  accountSelect.value = state.activeAccountId;
  accountStatus.textContent = options.silent ? "自動保存" : "ログイン中";
}

function loginAccount() {
  const account = state.accounts.find((candidate) => candidate.id === accountSelect.value);
  if (!account) {
    accountStatus.textContent = "選択してください";
    return;
  }

  state.activeAccountId = account.id;
  state.profile = account;
  state.history = account.history || [];
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);
  applyProfile();
  render();
}

function logoutAccount() {
  state.activeAccountId = "";
  state.profile = {};
  state.history = [];
  localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  accountNameInput.value = "";
  people.a.value = "自分";
  people.b.value = "相手";
  accountSelect.value = "";
  accountStatus.textContent = "ログアウト";
  render();
}

function upsertAccount(account) {
  const index = state.accounts.findIndex((candidate) => candidate.id === account.id);
  if (index >= 0) {
    state.accounts[index] = account;
  } else {
    state.accounts.push(account);
  }
  saveAccounts();
}

function renderAccountOptions() {
  accountSelect.replaceChildren(new Option("アカウントを選択", ""));
  for (const account of state.accounts) {
    accountSelect.append(new Option(account.accountName, account.id));
  }
}

function getActiveAccount() {
  return state.accounts.find((account) => account.id === state.activeAccountId) || {};
}

function loadAccounts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveAccounts() {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(state.accounts));
  } catch (error) {
    accountStatus.textContent = "保存失敗";
  }
}

function upgradeLegacyAccount() {
  if (state.accounts.length > 0) return;

  try {
    const legacyProfile = JSON.parse(localStorage.getItem(LEGACY_PROFILE_KEY) || "{}");
    const legacyHistory = JSON.parse(localStorage.getItem(LEGACY_HISTORY_KEY) || "[]");
    if (!legacyProfile.accountName && !legacyProfile.people && !Array.isArray(legacyHistory)) return;

    const account = {
      id: crypto.randomUUID(),
      accountName: legacyProfile.accountName || "既存アカウント",
      people: legacyProfile.people || { a: "自分", b: "相手" },
      history: Array.isArray(legacyHistory) ? legacyHistory : [],
      savedAt: legacyProfile.savedAt || new Date().toISOString(),
    };

    state.accounts = [account];
    state.activeAccountId = account.id;
    saveAccounts();
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);
  } catch (error) {
    state.accounts = [];
  }
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

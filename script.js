const STORAGE_KEY = "mentis_finance_data";
const THEME_KEY = "mentis-finance-theme";
const DATA_VERSION = 1;
const LEGACY_STORAGE_KEYS = [
  "mentis-finance-phase1-v1",
  "mentis-finance-premium-v1"
];

const CATEGORY_OPTIONS = {
  income: ["Salario", "Extra", "Reembolso", "Investimento", "Outros"],
  expense: ["Casa", "Transporte", "Lazer", "Saude", "Outros"]
};

const initialState = {
  selectedType: "expense",
  editingId: null,
  activeView: "home",
  detailMonthKey: null,
  categoryDetail: null
};

const loadedData = loadData();
let state = {
  ...initialState,
  transactions: loadedData.transactions,
  categories: loadedData.categories
};
let categoryChart = null;

const refs = {
  currentMonthLabel: document.getElementById("currentMonthLabel"),
  todayLabel: document.getElementById("todayLabel"),
  incomeValue: document.getElementById("incomeValue"),
  expenseValue: document.getElementById("expenseValue"),
  balanceValue: document.getElementById("balanceValue"),
  currentMonthMovements: document.getElementById("currentMonthMovements"),
  categoryList: document.getElementById("categoryList"),
  categoryChart: document.getElementById("categoryChart"),
  recentTransactionList: document.getElementById("recentTransactionList"),
  transactionForm: document.getElementById("transactionForm"),
  amountInput: document.getElementById("amountInput"),
  categoryInput: document.getElementById("categoryInput"),
  dateInput: document.getElementById("dateInput"),
  descriptionInput: document.getElementById("descriptionInput"),
  submitBtn: document.getElementById("submitBtn"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  formTitle: document.getElementById("formTitle"),
  historyCount: document.getElementById("historyCount"),
  historyList: document.getElementById("historyList"),
  exportDataBtn: document.getElementById("exportDataBtn"),
  importDataBtn: document.getElementById("importDataBtn"),
  importDataInput: document.getElementById("importDataInput"),
  resetDataBtn: document.getElementById("resetDataBtn"),
  toast: document.getElementById("toast"),
  detailMonthTitle: document.getElementById("detailMonthTitle"),
  detailStats: document.getElementById("detailStats"),
  detailCategoryList: document.getElementById("detailCategoryList"),
  detailTransactionList: document.getElementById("detailTransactionList"),
  detailMovementCount: document.getElementById("detailMovementCount"),
  backToHistoryBtn: document.getElementById("backToHistoryBtn"),
  categoryDetailTitle: document.getElementById("categoryDetailTitle"),
  categoryDetailMeta: document.getElementById("categoryDetailMeta"),
  categoryDetailList: document.getElementById("categoryDetailList"),
  closeCategoryDetailBtn: document.getElementById("closeCategoryDetailBtn"),
  themeToggle: document.getElementById("themeToggle"),
  homeSection: document.getElementById("homeSection"),
  recentSection: document.getElementById("recentSection"),
  addSection: document.getElementById("addSection"),
  historySection: document.getElementById("historySection"),
  settingsSection: document.getElementById("settingsSection"),
  monthDetailSection: document.getElementById("monthDetailSection"),
  categoryDetailSection: document.getElementById("categoryDetailSection")
};

const views = {
  home: refs.homeSection,
  add: refs.addSection,
  history: refs.historySection,
  settings: refs.settingsSection
};

applyTheme();
bindEvents();
render();

function getDefaultData() {
  return {
    version: DATA_VERSION,
    transactions: [],
    categories: []
  };
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return migrateOldData();
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.version === DATA_VERSION) {
      const transactions = normalizeTransactionsArray(parsed.transactions);
      return {
        version: DATA_VERSION,
        transactions,
        categories: mergeCategories(parsed.categories, transactions.map(item => item.category))
      };
    }

    const migrated = migrateOldData(parsed);
    saveData(migrated);
    return migrated;
  } catch {
    return migrateOldData();
  }
}

function saveData(data = getPersistedData()) {
  const transactions = normalizeTransactionsArray(data.transactions);
  const payload = {
    version: DATA_VERSION,
    transactions,
    categories: mergeCategories(data.categories, transactions.map(item => item.category))
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function migrateOldData(source = null) {
  if (source && typeof source === "object") {
    return {
      version: DATA_VERSION,
      transactions: normalizeTransactionsArray(source.transactions),
      categories: normalizeCategories(source.categories)
    };
  }

  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    const raw = localStorage.getItem(legacyKey);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const transactions = normalizeTransactionsArray(parsed?.transactions);
      const migrated = {
        version: DATA_VERSION,
        transactions,
        categories: mergeCategories(parsed?.categories, transactions.map(item => item.category))
      };
      saveData(migrated);
      return migrated;
    } catch {
      continue;
    }
  }

  return getDefaultData();
}

function getPersistedData() {
  const transactions = normalizeTransactionsArray(state.transactions);
  return {
    version: DATA_VERSION,
    transactions,
    categories: mergeCategories(state.categories, transactions.map(item => item.category))
  };
}

function bindEvents() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      openView(btn.dataset.view);
    });
  });

  document.querySelectorAll(".type-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.selectedType = btn.dataset.type;
      updateTypeButtons();
      populateCategorySelect();
    });
  });

  refs.transactionForm.addEventListener("submit", event => {
    event.preventDefault();
    submitTransactionForm();
  });

  refs.cancelEditBtn.addEventListener("click", resetForm);
  refs.backToHistoryBtn.addEventListener("click", () => {
    state.categoryDetail = null;
    openView("history");
  });
  refs.closeCategoryDetailBtn.addEventListener("click", () => {
    state.categoryDetail = null;
    render();
  });
  refs.exportDataBtn.addEventListener("click", exportBackup);
  refs.importDataBtn.addEventListener("click", () => refs.importDataInput.click());
  refs.importDataInput.addEventListener("change", importBackup);
  refs.resetDataBtn.addEventListener("click", resetAllData);
  refs.themeToggle.addEventListener("click", toggleTheme);
}

function render() {
  state.transactions = normalizeTransactionsArray(state.transactions);
  state.categories = normalizeCategories(state.categories);

  const currentMonthKey = getCurrentMonthKey();
  const currentMonthTransactions = getTransactionsForMonth(currentMonthKey);
  const currentMonthSummary = getSummary(currentMonthTransactions);

  refs.currentMonthLabel.textContent = formatMonthKey(currentMonthKey);
  refs.todayLabel.textContent = formatLongDate(new Date());
  refs.incomeValue.textContent = formatCurrency(currentMonthSummary.income);
  refs.expenseValue.textContent = formatCurrency(currentMonthSummary.expense);
  refs.balanceValue.textContent = formatCurrency(currentMonthSummary.balance);
  refs.currentMonthMovements.textContent = `${currentMonthTransactions.length} movimentos`;

  refs.dateInput.value = refs.dateInput.value || toInputDate(new Date());

  updateTypeButtons();
  populateCategorySelect();
  renderHomeCategories(currentMonthTransactions);
  renderCategoryChart(currentMonthTransactions);
  renderRecentTransactions(currentMonthTransactions);
  renderHistory();
  renderMonthDetail();
  renderCategoryDetail();
  updateVisibleSections();
  updateNavButtons();
}

function openView(view) {
  state.activeView = view;
  if (view !== "detail") {
    state.categoryDetail = null;
  }
  if (view === "add" && !state.editingId) {
    refs.dateInput.value = toInputDate(new Date());
  }
  render();
}

function updateVisibleSections() {
  const isDetail = state.activeView === "detail";

  refs.homeSection.classList.toggle("hidden", state.activeView !== "home");
  refs.recentSection.classList.toggle("hidden", state.activeView !== "home");
  Object.entries(views).forEach(([viewName, section]) => {
    if (viewName === "home") return;
    section.classList.toggle("hidden", state.activeView !== viewName);
  });
  refs.monthDetailSection.classList.toggle("hidden", !isDetail);
  refs.categoryDetailSection.classList.toggle("hidden", !state.categoryDetail);
}

function updateNavButtons() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    const isActive = btn.dataset.view === state.activeView || (state.activeView === "detail" && btn.dataset.view === "history");
    btn.classList.toggle("active", isActive);
  });
}

function updateTypeButtons() {
  document.querySelectorAll(".type-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.type === state.selectedType);
  });
}

function populateCategorySelect() {
  const categories = CATEGORY_OPTIONS[state.selectedType];
  refs.categoryInput.innerHTML = categories
    .map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");

  const editingTx = state.editingId ? state.transactions.find(item => item.id === state.editingId) : null;
  const selected = editingTx?.category && categories.includes(editingTx.category)
    ? editingTx.category
    : categories[0];
  refs.categoryInput.value = selected;
}

function submitTransactionForm() {
  const payload = {
    id: state.editingId,
    type: state.selectedType,
    amount: Number(refs.amountInput.value),
    category: refs.categoryInput.value.trim(),
    date: refs.dateInput.value,
    description: refs.descriptionInput.value.trim()
  };

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    refs.amountInput.focus();
    return;
  }

  if (!payload.category) {
    refs.categoryInput.focus();
    return;
  }

  if (!payload.date) {
    refs.dateInput.focus();
    return;
  }

  const transaction = buildTransaction(payload);
  if (payload.id) {
    state.transactions = state.transactions.map(item => item.id === payload.id ? transaction : item);
  } else {
    state.transactions.unshift(transaction);
  }

  state.categories = mergeCategories([payload.category], state.categories);
  saveData();
  resetForm();
  showToast("Movimento adicionado");
  openView("home");
}

function buildTransaction({ id, type, amount, category, date, description }) {
  return {
    id: id || crypto.randomUUID(),
    type,
    amount,
    category,
    description,
    date: toIsoDate(date)
  };
}

function resetForm() {
  state.editingId = null;
  refs.transactionForm.reset();
  refs.dateInput.value = toInputDate(new Date());
  refs.descriptionInput.value = "";
  refs.amountInput.value = "";
  refs.formTitle.textContent = "Adicionar movimento";
  refs.submitBtn.textContent = "Guardar movimento";
  refs.cancelEditBtn.classList.add("hidden");
  populateCategorySelect();
  render();
}

function startEditTransaction(id) {
  const transaction = state.transactions.find(item => item.id === id);
  if (!transaction) return;

  state.editingId = id;
  state.selectedType = transaction.type;
  refs.amountInput.value = transaction.amount;
  refs.dateInput.value = toInputDate(transaction.date);
  refs.descriptionInput.value = transaction.description || "";
  refs.formTitle.textContent = "Editar movimento";
  refs.submitBtn.textContent = "Guardar alteracoes";
  refs.cancelEditBtn.classList.remove("hidden");
  populateCategorySelect();
  refs.categoryInput.value = transaction.category;
  openView("add");
}

function deleteTransaction(id) {
  state.transactions = state.transactions.filter(item => item.id !== id);
  if (state.editingId === id) {
    resetForm();
    saveData();
    return;
  }
  saveData();
  render();
}

function exportBackup() {
  const payload = localStorage.getItem(STORAGE_KEY) || "{}";
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mentis-finance-backup-${toInputDate(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const migrated = parsed?.version ? {
      version: DATA_VERSION,
      transactions: normalizeTransactionsArray(parsed.transactions),
      categories: mergeCategories(parsed.categories, normalizeTransactionsArray(parsed.transactions).map(item => item.category))
    } : migrateOldData(parsed);

    state.transactions = migrated.transactions;
    state.categories = migrated.categories;
    state.editingId = null;
    saveData(migrated);
    refs.importDataInput.value = "";
    resetForm();
    openView("home");
  } catch {
    refs.importDataInput.value = "";
  }
}

function resetAllData() {
  const confirmDelete = confirm("Tens a certeza que queres apagar todos os dados?");
  if (!confirmDelete) return;

  localStorage.removeItem(STORAGE_KEY);
  alert("Dados apagados");
  location.reload();
}

function renderHomeCategories(transactions) {
  const expenseCategories = getExpenseCategories(transactions);
  if (!expenseCategories.length) {
    refs.categoryList.innerHTML = '<div class="empty-state"><strong>Ainda nao existem gastos por categoria.</strong><span>As categorias com saidas deste mes vao aparecer aqui.</span></div>';
    return;
  }

  refs.categoryList.innerHTML = expenseCategories.map(item => {
    const percent = item.percent > 0 ? `<span class="category-percent">${item.percent}% das saidas</span>` : "";
    return `
      <button class="category-card" data-category-month="${item.monthKey}" data-category-name="${escapeHtml(item.category)}">
        <div>
          <strong>${escapeHtml(item.category)}</strong>
          ${percent}
        </div>
        <span>${formatCurrency(item.total)}</span>
      </button>
    `;
  }).join("");

  refs.categoryList.querySelectorAll("[data-category-month]").forEach(btn => {
    btn.addEventListener("click", () => openCategoryDetail(btn.dataset.categoryMonth, btn.dataset.categoryName));
  });
}

function renderRecentTransactions(transactions) {
  const recent = sortTransactions(transactions).slice(0, 6);
  refs.recentTransactionList.innerHTML = renderTransactionListMarkup(
    recent,
    "Ainda nao ha movimentos neste mes.|Adicione a primeira entrada ou saida."
  );
  bindTransactionActions(refs.recentTransactionList);
}

function renderHistory() {
  const monthKeys = getMonthKeys();
  refs.historyCount.textContent = `${monthKeys.length} meses`;

  if (!monthKeys.length) {
    refs.historyList.innerHTML = '<div class="empty-state"><strong>Ainda nao ha historico mensal.</strong><span>Os meses aparecerao aqui apos os primeiros registos.</span></div>';
    return;
  }

  refs.historyList.innerHTML = monthKeys.map(monthKey => {
    const transactions = getTransactionsForMonth(monthKey);
    const summary = getSummary(transactions);
    return `
      <button class="history-card" data-history-month="${monthKey}">
        <div class="history-card-head">
          <strong>${formatMonthKey(monthKey)}</strong>
          <span>${transactions.length} movimentos</span>
        </div>
        <div class="history-card-grid">
          <div>
            <small>Entradas</small>
            <strong>${formatCurrency(summary.income)}</strong>
          </div>
          <div>
            <small>Saidas</small>
            <strong>${formatCurrency(summary.expense)}</strong>
          </div>
          <div>
            <small>Saldo final</small>
            <strong>${formatCurrency(summary.balance)}</strong>
          </div>
        </div>
      </button>
    `;
  }).join("");

  refs.historyList.querySelectorAll("[data-history-month]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.detailMonthKey = btn.dataset.historyMonth;
      state.activeView = "detail";
      render();
    });
  });
}

function renderMonthDetail() {
  const monthKey = state.detailMonthKey;
  if (!monthKey) {
    refs.detailStats.innerHTML = "";
    refs.detailCategoryList.innerHTML = "";
    refs.detailTransactionList.innerHTML = "";
    return;
  }

  const transactions = getTransactionsForMonth(monthKey);
  const summary = getSummary(transactions);
  const closedMonth = isClosedMonth(monthKey);
  const statCards = [
    { label: "Entradas", value: formatCurrency(summary.income) },
    { label: "Saidas", value: formatCurrency(summary.expense) },
    { label: "Saldo final", value: formatCurrency(summary.balance) }
  ];

  if (closedMonth) {
    statCards.push({ label: "Taxa de poupanca", value: formatPercent(summary.saveRate) });
  }

  refs.detailMonthTitle.textContent = formatMonthKey(monthKey);
  refs.detailStats.innerHTML = statCards.map(card => `
    <article class="summary-box">
      <span>${card.label}</span>
      <strong>${card.value}</strong>
    </article>
  `).join("");

  const expenseCategories = getExpenseCategories(transactions);
  refs.detailCategoryList.innerHTML = expenseCategories.length
    ? expenseCategories.map(item => `
        <button class="category-card" data-category-month="${monthKey}" data-category-name="${escapeHtml(item.category)}">
          <div>
            <strong>${escapeHtml(item.category)}</strong>
            <span class="category-percent">${item.percent}% das saidas</span>
          </div>
          <span>${formatCurrency(item.total)}</span>
        </button>
      `).join("")
    : '<div class="empty-state"><strong>Ainda nao existem gastos por categoria.</strong><span>Quando criar saidas neste mes, vao aparecer aqui.</span></div>';

  refs.detailTransactionList.innerHTML = renderTransactionListMarkup(
    sortTransactions(transactions),
    "Nao existem movimentos neste mes."
  );
  refs.detailMovementCount.textContent = `${transactions.length} movimentos`;

  refs.detailCategoryList.querySelectorAll("[data-category-month]").forEach(btn => {
    btn.addEventListener("click", () => openCategoryDetail(btn.dataset.categoryMonth, btn.dataset.categoryName));
  });
  bindTransactionActions(refs.detailTransactionList);
}

function openCategoryDetail(monthKey, category) {
  state.categoryDetail = { monthKey, category };
  render();
}

function renderCategoryDetail() {
  if (!state.categoryDetail) {
    refs.categoryDetailList.innerHTML = "";
    return;
  }

  const { monthKey, category } = state.categoryDetail;
  const transactions = sortTransactions(
    getTransactionsForMonth(monthKey).filter(item => item.category === category)
  );

  refs.categoryDetailTitle.textContent = category;
  refs.categoryDetailMeta.textContent = `${formatMonthKey(monthKey)} · ${transactions.length} movimentos`;
  refs.categoryDetailList.innerHTML = renderTransactionListMarkup(
    transactions,
    "Nao existem movimentos para esta categoria."
  );
  bindTransactionActions(refs.categoryDetailList);
}

function renderTransactionListMarkup(transactions, emptyMessage) {
  if (!transactions.length) {
    const [title, subtitle] = emptyMessage.split("|");
    return `<div class="empty-state"><strong>${title}</strong>${subtitle ? `<span>${subtitle}</span>` : ""}</div>`;
  }

  return transactions.map(item => `
    <article class="transaction-item ${item.type}">
      <div class="tx-icon">${iconForCategory(item.category, item.type)}</div>
      <div class="tx-main">
        <strong>${escapeHtml(item.description || getFallbackTitle(item))}</strong>
        <div class="tx-tags">
          <span class="tx-tag">${item.type === "income" ? "Entrada" : "Saida"}</span>
          <span class="tx-tag">${escapeHtml(item.category)}</span>
          <span class="tx-tag">${formatDate(item.date)}</span>
        </div>
      </div>
      <div class="tx-value">
        <strong class="amount ${item.type}">${signedCurrency(item)}</strong>
        <div class="tx-actions">
          <button type="button" data-edit="${item.id}">Editar</button>
          <button type="button" data-remove="${item.id}">Apagar</button>
        </div>
      </div>
    </article>
  `).join("");
}

function bindTransactionActions(container) {
  container.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => startEditTransaction(btn.dataset.edit));
  });
  container.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => deleteTransaction(btn.dataset.remove));
  });
}

function getExpenseCategories(transactions) {
  const totals = {};
  const expenseTotal = transactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => {
      totals[item.category] = (totals[item.category] || 0) + item.amount;
      return sum + item.amount;
    }, 0);

  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => ({
      monthKey: transactions[0] ? getMonthKey(transactions[0].date) : getCurrentMonthKey(),
      category,
      total,
      percent: expenseTotal > 0 ? Math.round((total / expenseTotal) * 100) : 0
    }));
}

function getSummary(transactions) {
  const income = transactions
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = transactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expense;
  const saveRate = income > 0 ? ((balance / income) * 100) : 0;

  return {
    income,
    expense,
    balance,
    saveRate: Math.max(0, saveRate)
  };
}

function getMonthKeys() {
  return [...new Set(state.transactions.map(item => getMonthKey(item.date)))]
    .sort((a, b) => b.localeCompare(a));
}

function getTransactionsForMonth(monthKey) {
  return state.transactions.filter(item => getMonthKey(item.date) === monthKey);
}

function getMonthKey(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getCurrentMonthKey() {
  return getMonthKey(new Date());
}

function isClosedMonth(monthKey) {
  return monthKey < getCurrentMonthKey();
}

function sortTransactions(transactions) {
  return [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function normalizeTransactionsArray(transactions) {
  if (!Array.isArray(transactions)) return [];

  return sortTransactions(transactions
    .filter(item => item && typeof item === "object")
    .map(item => ({
      id: item.id || crypto.randomUUID(),
      type: item.type === "income" ? "income" : "expense",
      amount: Number(item.amount) > 0 ? Number(item.amount) : 0,
      category: normalizeCategory(item.category),
      description: typeof item.description === "string" ? item.description : "",
      date: toIsoDate(item.date || new Date())
    }))
    .filter(item => item.amount > 0));
}

function normalizeCategories(categories) {
  if (!Array.isArray(categories)) return [];
  return [...new Set(categories
    .filter(item => typeof item === "string")
    .map(item => normalizeCategory(item))
    .filter(Boolean))];
}

function mergeCategories(nextCategories, existingCategories = []) {
  return normalizeCategories([...(existingCategories || []), ...(nextCategories || [])]);
}

function getFallbackTitle(item) {
  return item.type === "income" ? "Entrada sem nota" : "Saida sem nota";
}

function formatMonthKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("pt-PT", {
    month: "long",
    year: "numeric"
  });
}

function formatLongDate(date) {
  return date.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).replace(/^./, char => char.toUpperCase());
}

function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR"
  }).format(value || 0);
}

function formatPercent(value) {
  return `${Math.round(value || 0)}%`;
}

function signedCurrency(item) {
  const prefix = item.type === "income" ? "+" : "-";
  return `${prefix}${formatCurrency(item.amount)}`;
}

function toIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T12:00:00`;
}

function toInputDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function iconForCategory(category, type) {
  const map = {
    Salario: "💼",
    Extra: "✨",
    Reembolso: "↩️",
    Investimento: "📈",
    Casa: "🏠",
    Transporte: "🚗",
    Lazer: "🎮",
    Saude: "💊",
    Outros: "📦"
  };
  return map[category] || (type === "income" ? "💸" : "🧾");
}

function normalizeCategory(category) {
  const normalized = typeof category === "string" ? category.trim() : "";
  if (!normalized) return "Outros";
  if (normalized === "Alimentacao" || normalized === "Alimentação") return "Outros";
  return normalized;
}

function renderCategoryChart(transactions) {
  const categoryTotals = {};

  transactions.forEach(transaction => {
    if (transaction.type === "expense") {
      categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + Number(transaction.amount);
    }
  });

  const labels = Object.keys(categoryTotals);
  const values = Object.values(categoryTotals);
  const ctx = refs.categoryChart;

  if (!ctx || typeof Chart === "undefined") return;

  if (categoryChart) {
    categoryChart.destroy();
    categoryChart = null;
  }

  if (!labels.length) {
    return;
  }

  categoryChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [
          "#315b9a",
          "#4c7bd9",
          "#7a5c8f",
          "#456f83",
          "#64748b"
        ],
        borderColor: "rgba(255, 255, 255, 0.08)",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#b6c8ea"
          }
        }
      }
    }
  });
}

function showToast(message){
  const toast = refs.toast;
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function applyTheme() {
  const theme = localStorage.getItem(THEME_KEY) || "dark";
  document.body.classList.toggle("light", theme === "light");
  refs.themeToggle.textContent = theme === "light" ? "🌙" : "☀️";
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("light") ? "dark" : "light";
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme();
}

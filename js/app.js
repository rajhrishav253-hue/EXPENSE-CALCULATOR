/**
 * CampusSpend - Main Controller
 * 1. Total Expense (All-Time)
 * 2. Yearly Record (Year Total & 12-Month Interactive Grid)
 * 3. Monthly Expense (Month Total & Detailed Transactions with Explicit Delete Feature)
 * 4. Dedicated Separate Side Drawer to Add Expenses
 * 5. Charts of the Expense (Spending Velocity Trend & Category Breakdown)
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Application State
const AppState = {
  expenses: [],
  filteredMonthlyExpenses: [],
  currency: CURRENCIES.INR,
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().getMonth(), // 0-indexed (7 for August)
  chartType: 'bar', // 'bar' or 'line'
  filters: {
    search: '',
    category: 'all'
  },
  editingExpenseId: null,
  confirmModalAction: null
};

// Period helper functions
function getSelectedPeriodKey() {
  const mStr = String(AppState.selectedMonth + 1).padStart(2, '0');
  return `${AppState.selectedYear}-${mStr}`;
}

function getSelectedPeriodLabel() {
  return `${MONTH_NAMES[AppState.selectedMonth]} ${AppState.selectedYear}`;
}

function isCurrentMonthSelected() {
  const now = new Date();
  return AppState.selectedYear === now.getFullYear() && AppState.selectedMonth === now.getMonth();
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initData();
  initMonthPicker();
  initSideDrawer();
  initCollapseToggles();
  initAddExpenseForm();
  initMonthlyFilters();
  initChartControls();
  initModals();
  initLiveAmountInputs();
  initDataBackupControls();

  // Render initial state
  renderApp();

  // Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }
});

/**
 * Dark / Light Theme Manager
 */
function initTheme() {
  const savedTheme = StorageService.getTheme();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  const themeToggleBtns = document.querySelectorAll('[data-theme-toggle]');
  themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isNowDark = document.documentElement.classList.toggle('dark');
      StorageService.saveTheme(isNowDark ? 'dark' : 'light');
      updateThemeIcons(isNowDark);
      renderApp();
    });
  });

  updateThemeIcons(isDark);
}

function updateThemeIcons(isDark) {
  const themeIcons = document.querySelectorAll('.theme-icon');
  themeIcons.forEach(icon => {
    if (isDark) {
      icon.setAttribute('data-lucide', 'sun');
    } else {
      icon.setAttribute('data-lucide', 'moon');
    }
  });
  if (window.lucide) lucide.createIcons();
}

/**
 * Data Initialization
 */
function initData() {
  AppState.expenses = StorageService.getExpenses();
  AppState.currency = StorageService.getCurrency();

  // Populate Header Currency Selector
  const currencySelect = document.getElementById('headerCurrencySelect');
  if (currencySelect) {
    currencySelect.innerHTML = '';
    Object.values(CURRENCIES).forEach(curr => {
      const opt = document.createElement('option');
      opt.value = curr.code;
      opt.textContent = `${curr.symbol} - ${curr.name}`;
      if (curr.code === AppState.currency.code) opt.selected = true;
      currencySelect.appendChild(opt);
    });

    currencySelect.addEventListener('change', (e) => {
      StorageService.saveCurrency(e.target.value);
      AppState.currency = StorageService.getCurrency();
      showToast(`Currency set to ${AppState.currency.name} (${AppState.currency.symbol})`);
      renderApp();
      initLiveAmountInputs();
    });
  }

  // Populate Category Filter
  const filterCatSelect = document.getElementById('expenseCategoryFilter');
  const editCatSelect = document.getElementById('editExpenseCategory');

  if (filterCatSelect) {
    filterCatSelect.innerHTML = '<option value="all">All Categories</option>';
    CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      filterCatSelect.appendChild(opt);
    });
  }

  if (editCatSelect) {
    editCatSelect.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      editCatSelect.appendChild(opt);
    });
  }
}

/**
 * Month & Year Picker Navigation Controller
 */
function initMonthPicker() {
  const select = document.getElementById('headerPeriodSelect');
  const prevBtn = document.getElementById('headerPrevMonthBtn');
  const nextBtn = document.getElementById('headerNextMonthBtn');

  populateMonthYearSelect();

  if (select) {
    select.addEventListener('change', (e) => {
      const [y, m] = e.target.value.split('-');
      AppState.selectedYear = parseInt(y, 10);
      AppState.selectedMonth = parseInt(m, 10);
      showToast(`Viewing ${getSelectedPeriodLabel()}`);
      renderApp();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      changePeriod(-1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      changePeriod(1);
    });
  }
}

function populateMonthYearSelect() {
  const select = document.getElementById('headerPeriodSelect');
  if (!select) return;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const options = [];

  // Current year months from Dec down to Jan
  for (let m = 11; m >= 0; m--) {
    const isCurrent = (m === currentMonth && currentYear === new Date().getFullYear());
    const isSelected = (m === AppState.selectedMonth && currentYear === AppState.selectedYear);
    options.push({
      value: `${currentYear}-${m}`,
      label: `${MONTH_NAMES[m]} ${currentYear}${isCurrent ? ' (Current)' : ''}`,
      selected: isSelected
    });
  }

  // Previous year months (past records)
  for (let m = 11; m >= 0; m--) {
    const isSelected = (m === AppState.selectedMonth && (currentYear - 1) === AppState.selectedYear);
    options.push({
      value: `${currentYear - 1}-${m}`,
      label: `${MONTH_NAMES[m]} ${currentYear - 1}`,
      selected: isSelected
    });
  }

  select.innerHTML = options.map(opt => `
    <option value="${opt.value}" ${opt.selected ? 'selected' : ''}>${opt.label}</option>
  `).join('');
}

function changePeriod(direction) {
  let newMonth = AppState.selectedMonth + direction;
  if (newMonth > 11) {
    newMonth = 0;
    AppState.selectedYear += 1;
  } else if (newMonth < 0) {
    newMonth = 11;
    AppState.selectedYear -= 1;
  }
  AppState.selectedMonth = newMonth;

  populateMonthYearSelect();
  showToast(`Viewing ${getSelectedPeriodLabel()}`);
  renderApp();
}

/**
 * Dedicated Separate Side Drawer for Add Expense
 */
function initSideDrawer() {
  const drawer = document.getElementById('addExpenseSideDrawer');
  const backdrop = document.getElementById('sideDrawerBackdrop');
  const openButtons = document.querySelectorAll('[data-open-side-drawer]');
  const closeBtn = document.getElementById('closeSideDrawerBtn');
  const cancelBtn = document.getElementById('cancelSideDrawerBtn');

  const openDrawer = () => {
    if (drawer && backdrop) {
      drawer.classList.add('drawer-open');
      backdrop.classList.add('backdrop-open');
      document.body.classList.add('overflow-hidden');

      // Default date to today
      const dateInput = document.getElementById('addExpenseDate');
      if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
      }

      // Focus on title
      setTimeout(() => {
        const titleInput = document.getElementById('addExpenseName');
        if (titleInput) titleInput.focus();
      }, 200);
    }
  };

  const closeDrawer = () => {
    if (drawer && backdrop) {
      drawer.classList.remove('drawer-open');
      backdrop.classList.remove('backdrop-open');
      document.body.classList.remove('overflow-hidden');
    }
  };

  openButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openDrawer();
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (cancelBtn) cancelBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('drawer-open')) {
      closeDrawer();
    }
  });

  window.closeAddExpenseDrawer = closeDrawer;
  window.openAddExpenseDrawer = openDrawer;
}

/**
 * Section Hide / Show (^ / ⌄) Collapse Toggles
 */
function initCollapseToggles() {
  const setupToggle = (btnId, bodyId, sectionName) => {
    const btn = document.getElementById(btnId);
    const body = document.getElementById(bodyId);
    if (!btn || !body) return;

    btn.addEventListener('click', () => {
      const isHidden = body.classList.toggle('is-hidden');
      btn.classList.toggle('is-collapsed', isHidden);

      const textSpan = btn.querySelector('.toggle-text');
      const icon = btn.querySelector('.toggle-icon');

      if (isHidden) {
        if (textSpan) textSpan.textContent = 'Show';
        if (icon) icon.setAttribute('data-lucide', 'chevron-down');
        btn.setAttribute('title', `Show ${sectionName}`);
      } else {
        if (textSpan) textSpan.textContent = 'Hide';
        if (icon) icon.setAttribute('data-lucide', 'chevron-up');
        btn.setAttribute('title', `Hide ${sectionName}`);
      }

      if (window.lucide) lucide.createIcons();
    });
  };

  setupToggle('toggleMonthlyRecordBtn', 'monthlyRecordBody', 'Monthly Expense');
  setupToggle('toggleYearlyRecordBtn', 'yearlyRecordBody', 'Yearly Record');
  setupToggle('toggleChartsBtn', 'chartsSectionBody', 'Expense Charts');
}

/**
 * Number to Indian Words Converter (Easy to Understand)
 * Handles Crores, Lakhs, Thousands, Hundreds, Rupees, and Paise
 */
function amountToWords(amount, currencyCode = null) {
  const num = parseFloat(amount);
  if (isNaN(num) || num === 0) {
    const code = currencyCode || AppState.currency.code;
    return code === 'INR' ? 'Zero Rupees' : 'Zero';
  }

  const code = currencyCode || AppState.currency.code;
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const rupeesPart = Math.floor(absNum);
  const paisePart = Math.round((absNum - rupeesPart) * 100);

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n < 20) return ones[n];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? ' ' + ones[unit] : '');
  }

  function convertThreeDigits(n) {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (hundred > 0) {
      str += ones[hundred] + ' Hundred';
      if (rest > 0) str += ' ';
    }
    if (rest > 0) {
      str += convertTwoDigits(rest);
    }
    return str;
  }

  let words = '';

  if (code === 'INR') {
    // Indian Numbering System
    let n = rupeesPart;
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const remaining = n;

    const parts = [];
    if (crore > 0) parts.push(convertThreeDigits(crore) + ' Crore');
    if (lakh > 0) parts.push(convertTwoDigits(lakh) + ' Lakh');
    if (thousand > 0) parts.push(convertTwoDigits(thousand) + ' Thousand');
    if (remaining > 0) parts.push(convertThreeDigits(remaining));

    words = parts.length > 0 ? parts.join(' ') + ' Rupees' : 'Zero Rupees';

    if (paisePart > 0) {
      words += ' and ' + convertTwoDigits(paisePart) + ' Paise';
    }
  } else {
    // International Numbering
    let n = rupeesPart;
    const billion = Math.floor(n / 1000000000);
    n %= 1000000000;
    const million = Math.floor(n / 1000000);
    n %= 1000000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const remaining = n;

    const parts = [];
    if (billion > 0) parts.push(convertThreeDigits(billion) + ' Billion');
    if (million > 0) parts.push(convertThreeDigits(million) + ' Million');
    if (thousand > 0) parts.push(convertThreeDigits(thousand) + ' Thousand');
    if (remaining > 0) parts.push(convertThreeDigits(remaining));

    const unitName = code === 'USD' ? 'Dollars' : (code === 'EUR' ? 'Euros' : (code === 'GBP' ? 'Pounds' : ''));
    words = parts.length > 0 ? parts.join(' ') + (unitName ? ' ' + unitName : '') : 'Zero ' + unitName;

    if (paisePart > 0) {
      const centName = code === 'GBP' ? 'Pence' : 'Cents';
      words += ' and ' + convertTwoDigits(paisePart) + ' ' + centName;
    }
  }

  return (isNegative ? 'Minus ' : '') + words.trim();
}

/**
 * Currency Formatting Helper (Indian Rupee en-IN grouping)
 */
function formatMoney(amount, showSymbol = true) {
  const num = parseFloat(amount) || 0;
  const locale = AppState.currency.code === 'INR' ? 'en-IN' : undefined;
  const formatted = num.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return showSymbol ? `${AppState.currency.symbol}${formatted}` : formatted;
}

/**
 * Compact Indian Notation
 */
function formatEasyCompact(amount) {
  const num = Math.abs(parseFloat(amount) || 0);
  if (AppState.currency.code === 'INR') {
    if (num >= 10000000) return (num / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr';
    if (num >= 100000) return (num / 100000).toFixed(2).replace(/\.00$/, '') + ' Lakh';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
  } else {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }
}

/**
 * Render Denomination Chips (+₹10, +₹50, +₹100, +₹500, +₹1000, Clear)
 */
function renderDenominationChips(container, inputElement, updateCallback) {
  if (!container || !inputElement) return;
  container.innerHTML = '';

  const isINR = AppState.currency.code === 'INR';
  const denoms = isINR ? [10, 50, 100, 500, 1000] : [5, 10, 20, 50, 100];

  denoms.forEach(d => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'denom-chip';
    const label = isINR ? `+₹${d.toLocaleString('en-IN')}` : `+${AppState.currency.symbol}${d}`;
    btn.textContent = label;
    btn.title = `Add ${label}`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const current = parseFloat(inputElement.value) || 0;
      inputElement.value = Math.round(current + d);
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      if (updateCallback) updateCallback();
    });
    container.appendChild(btn);
  });

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'denom-chip text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/60';
  clearBtn.textContent = 'Clear';
  clearBtn.title = 'Reset amount to 0';
  clearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    inputElement.value = '';
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    if (updateCallback) updateCallback();
  });
  container.appendChild(clearBtn);
}

/**
 * Bind Live Amount-in-Words listener
 */
function bindLiveAmountListener(inputId, wordsContainerId, denomsContainerId = null) {
  const input = document.getElementById(inputId);
  const wordsContainer = document.getElementById(wordsContainerId);

  if (!input || !wordsContainer) return;

  const update = () => {
    const val = parseFloat(input.value) || 0;
    const words = amountToWords(val);
    const compact = val >= 1000 ? ` (${formatEasyCompact(val)})` : '';
    const formatted = formatMoney(val);

    const outputEl = wordsContainer.querySelector('.words-output') || wordsContainer;
    outputEl.textContent = `${formatted} • ${words}${compact}`;
  };

  input.addEventListener('input', update);
  update();

  if (denomsContainerId) {
    const denomsContainer = document.getElementById(denomsContainerId);
    if (denomsContainer) {
      renderDenominationChips(denomsContainer, input, update);
    }
  }
}

function initLiveAmountInputs() {
  bindLiveAmountListener('addExpenseAmount', 'addExpenseAmountInWords', 'addExpenseDenoms');
  bindLiveAmountListener('editExpenseAmount', 'editExpenseAmountInWords');
}

/**
 * Add Expense Form Handler (Separate Side Drawer)
 */
function initAddExpenseForm() {
  const form = document.getElementById('mainAddExpenseForm');
  const dateInput = document.getElementById('addExpenseDate');
  const presetChips = document.querySelectorAll('.preset-chip');

  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const name = chip.getAttribute('data-preset-name');
      const amount = chip.getAttribute('data-preset-amount');
      const category = chip.getAttribute('data-preset-category');

      const nameInput = document.getElementById('addExpenseName');
      const amountInput = document.getElementById('addExpenseAmount');
      const categoryRadio = document.querySelector(`input[name="addExpenseCategoryRadio"][value="${category}"]`);

      if (nameInput) nameInput.value = name;
      if (amountInput) {
        amountInput.value = amount;
        amountInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (categoryRadio) categoryRadio.checked = true;

      showToast(`Selected preset: ${name} (${formatMoney(amount)})`);
    });
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('addExpenseName').value;
      const amount = parseFloat(document.getElementById('addExpenseAmount').value);
      const selectedCategoryRadio = document.querySelector('input[name="addExpenseCategoryRadio"]:checked');
      const category = selectedCategoryRadio ? selectedCategoryRadio.value : 'Food';
      const date = document.getElementById('addExpenseDate').value;
      const paymentMethod = document.getElementById('addExpensePaymentMethod').value;
      const description = document.getElementById('addExpenseDescription').value;

      if (!name || name.trim() === '') {
        showToast('Please enter an expense title', 'error');
        return;
      }

      if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid amount greater than 0', 'error');
        return;
      }

      if (!date) {
        showToast('Please select a date', 'error');
        return;
      }

      const newExpense = StorageService.addExpense({
        name,
        amount,
        category,
        date,
        paymentMethod,
        description
      });

      AppState.expenses = StorageService.getExpenses();

      // Switch to added month so user immediately sees it
      const addedDate = new Date(date + 'T12:00:00');
      AppState.selectedYear = addedDate.getFullYear();
      AppState.selectedMonth = addedDate.getMonth();
      populateMonthYearSelect();

      showToast(`Logged "${newExpense.name}" for ${formatMoney(newExpense.amount)}!`);

      // Close Side Drawer
      if (window.closeAddExpenseDrawer) window.closeAddExpenseDrawer();

      // Reset form
      form.reset();
      if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
      const defaultFoodRadio = document.querySelector('input[name="addExpenseCategoryRadio"][value="Food"]');
      if (defaultFoodRadio) defaultFoodRadio.checked = true;

      const addExpenseAmountInput = document.getElementById('addExpenseAmount');
      if (addExpenseAmountInput) {
        addExpenseAmountInput.value = '';
        addExpenseAmountInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      renderApp();
    });
  }
}

/**
 * Monthly Search & Category Filters
 */
function initMonthlyFilters() {
  const searchInput = document.getElementById('expenseSearchInput');
  const catFilter = document.getElementById('expenseCategoryFilter');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.filters.search = e.target.value.toLowerCase();
      renderMonthlyTable();
    });
  }

  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      AppState.filters.category = e.target.value;
      renderMonthlyTable();
    });
  }
}

/**
 * Chart Controls
 */
function initChartControls() {
  const barBtn = document.getElementById('trendChartBarBtn');
  const lineBtn = document.getElementById('trendChartLineBtn');

  if (barBtn && lineBtn) {
    barBtn.addEventListener('click', () => {
      AppState.chartType = 'bar';
      barBtn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm transition';
      lineBtn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 transition';
      renderCharts(computeStatistics());
    });

    lineBtn.addEventListener('click', () => {
      AppState.chartType = 'line';
      lineBtn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm transition';
      barBtn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 transition';
      renderCharts(computeStatistics());
    });
  }
}

/**
 * Modals & Edit/Delete Handlers
 */
function initModals() {
  // Edit Modal
  const editModal = document.getElementById('editExpenseModal');
  const closeEditBtns = document.querySelectorAll('[data-close-edit-modal]');
  const editForm = document.getElementById('editExpenseForm');

  closeEditBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (editModal) editModal.classList.add('hidden');
      AppState.editingExpenseId = null;
    });
  });

  if (editForm) {
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!AppState.editingExpenseId) return;

      const name = document.getElementById('editExpenseName').value;
      const amount = parseFloat(document.getElementById('editExpenseAmount').value);
      const category = document.getElementById('editExpenseCategory').value;
      const date = document.getElementById('editExpenseDate').value;
      const paymentMethod = document.getElementById('editExpensePayment').value;
      const description = document.getElementById('editExpenseDescription').value;

      if (!name || isNaN(amount) || amount <= 0) {
        showToast('Please provide a valid name and amount', 'error');
        return;
      }

      StorageService.updateExpense({
        id: AppState.editingExpenseId,
        name,
        amount,
        category,
        date,
        paymentMethod,
        description
      });

      AppState.expenses = StorageService.getExpenses();
      if (editModal) editModal.classList.add('hidden');
      AppState.editingExpenseId = null;

      showToast('Expense updated successfully');
      renderApp();
    });
  }

  // Confirmation Modal
  const confirmModal = document.getElementById('confirmationModal');
  const closeConfirmBtns = document.querySelectorAll('[data-close-confirm-modal]');
  const confirmActionBtn = document.getElementById('confirmActionButton');

  closeConfirmBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirmModal) confirmModal.classList.add('hidden');
      AppState.confirmModalAction = null;
    });
  });

  if (confirmActionBtn) {
    confirmActionBtn.addEventListener('click', () => {
      if (typeof AppState.confirmModalAction === 'function') {
        AppState.confirmModalAction();
      }
      if (confirmModal) confirmModal.classList.add('hidden');
      AppState.confirmModalAction = null;
    });
  }
}

function openEditExpense(id) {
  const exp = AppState.expenses.find(e => e.id === id);
  if (!exp) return;

  AppState.editingExpenseId = id;
  const modal = document.getElementById('editExpenseModal');

  document.getElementById('editExpenseName').value = exp.name || '';
  const amountInput = document.getElementById('editExpenseAmount');
  amountInput.value = exp.amount || '';
  amountInput.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('editExpenseCategory').value = exp.category || 'Other';
  document.getElementById('editExpenseDate').value = exp.date || new Date().toISOString().split('T')[0];
  document.getElementById('editExpensePayment').value = exp.paymentMethod || 'UPI / Online';
  document.getElementById('editExpenseDescription').value = exp.description || '';

  if (modal) modal.classList.remove('hidden');
}

/**
 * Explicit Delete Feature (Feature to Delete Expense)
 */
function promptDeleteExpense(id) {
  const exp = AppState.expenses.find(e => e.id === id);
  if (!exp) return;

  showConfirmModal({
    title: 'Delete Expense Record',
    message: `Are you sure you want to permanently delete "${exp.name}" (${formatMoney(exp.amount)}) on ${exp.date}?`,
    confirmBtnText: 'Delete Expense',
    confirmBtnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
    onConfirm: () => {
      StorageService.deleteExpense(id);
      AppState.expenses = StorageService.getExpenses();
      showToast(`Deleted "${exp.name}" (${formatMoney(exp.amount)})`);
      renderApp();
    }
  });
}

function showConfirmModal({ title, message, confirmBtnText, confirmBtnClass, onConfirm }) {
  const modal = document.getElementById('confirmationModal');
  const titleEl = document.getElementById('confirmModalTitle');
  const messageEl = document.getElementById('confirmModalMessage');
  const btn = document.getElementById('confirmActionButton');

  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  if (btn) {
    btn.innerHTML = `<i data-lucide="trash-2" class="w-3.5 h-3.5 mr-1 inline-block"></i> ${confirmBtnText || 'Confirm'}`;
    btn.className = `px-4 py-2.5 rounded-xl font-semibold shadow text-xs transition ${confirmBtnClass || 'bg-rose-600 hover:bg-rose-700 text-white'}`;
  }

  AppState.confirmModalAction = onConfirm;
  if (modal) modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

/**
 * Data Backup & Restore Controls
 */
function initDataBackupControls() {
  const exportBtn = document.getElementById('exportCSVBtn');
  const reloadBtn = document.getElementById('reloadDemoDataBtn');
  const clearBtn = document.getElementById('clearAllExpensesBtn');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const csvUri = StorageService.exportToCSV();
      if (!csvUri) {
        showToast('No expenses found to export', 'error');
        return;
      }
      const link = document.createElement('a');
      link.setAttribute('href', csvUri);
      link.setAttribute('download', `student_expenses_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('CSV downloaded successfully!');
    });
  }

  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      AppState.expenses = StorageService.seedDemoStudentData();
      showToast('Reloaded college multi-month sample records!');
      renderApp();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      showConfirmModal({
        title: 'Delete All Expenses',
        message: 'Are you sure you want to delete ALL recorded expenses from browser storage? This cannot be undone.',
        confirmBtnText: 'Delete All Records',
        confirmBtnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
        onConfirm: () => {
          StorageService.clearAllExpenses();
          AppState.expenses = [];
          showToast('All expense records deleted');
          renderApp();
        }
      });
    });
  }
}

/**
 * Statistics Computation
 */
function computeStatistics() {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const periodPrefix = getSelectedPeriodKey();
  const yearPrefix = `${AppState.selectedYear}-`;

  let totalAllTime = 0;
  let totalYear = 0;
  let totalMonth = 0;
  let totalToday = 0;

  const monthlyTotals = new Array(12).fill(0);
  const categoryTotals = {};
  const dailySpendingMap = {};

  CATEGORIES.forEach(c => { categoryTotals[c.id] = 0; });

  AppState.expenses.forEach(exp => {
    const amt = exp.amount || 0;
    totalAllTime += amt;

    // Year matching
    if (exp.date && exp.date.startsWith(yearPrefix)) {
      totalYear += amt;
      const mIdx = parseInt(exp.date.split('-')[1], 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        monthlyTotals[mIdx] += amt;
      }
    }

    // Selected Month matching
    if (exp.date && exp.date.startsWith(periodPrefix)) {
      totalMonth += amt;
      const cat = exp.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      dailySpendingMap[exp.date] = (dailySpendingMap[exp.date] || 0) + amt;
    }

    // Today matching
    if (exp.date === todayStr) {
      totalToday += amt;
    }
  });

  return {
    totalAllTime,
    totalYear,
    totalMonth,
    totalToday,
    monthlyTotals,
    categoryTotals,
    dailySpendingMap
  };
}

/**
 * Render Main Application
 */
function renderApp() {
  const stats = computeStatistics();

  updateHeaderAndLabels();
  renderMetricCards(stats);
  renderCharts(stats);
  renderMonthlyTable();
  renderYearlyRecordGrid(stats);
  updateCurrencyDisplays();

  if (window.lucide) {
    lucide.createIcons();
  }
}

function updateHeaderAndLabels() {
  const label = getSelectedPeriodLabel();
  const periodLabelEls = document.querySelectorAll('.active-period-label');
  periodLabelEls.forEach(el => { el.textContent = label; });

  const activePeriodBadgeText = document.getElementById('dashActivePeriodText');
  if (activePeriodBadgeText) activePeriodBadgeText.textContent = label;

  const greetingTitle = document.getElementById('dashGreetingTitle');
  if (greetingTitle) {
    if (isCurrentMonthSelected()) {
      greetingTitle.textContent = `Hey! 👋 Here's your ${label} spending summary`;
    } else {
      greetingTitle.textContent = `Past Expense Records for ${label} 📅`;
    }
  }
}

/**
 * Render Core Metric Cards
 */
function renderMetricCards(stats) {
  // 1. TOTAL EXPENSE (All-Time)
  const totalAllTimeEl = document.getElementById('statTotalExpense');
  const totalAllTimeWordsEl = document.getElementById('statTotalExpenseWords');
  if (totalAllTimeEl) totalAllTimeEl.textContent = formatMoney(stats.totalAllTime);
  if (totalAllTimeWordsEl) totalAllTimeWordsEl.textContent = amountToWords(stats.totalAllTime);

  // 2. YEARLY RECORD
  const yearlyRecordLabel = document.getElementById('statYearlyRecordLabel');
  const yearlyRecordEl = document.getElementById('statYearlyRecord');
  const yearlyRecordWordsEl = document.getElementById('statYearlyRecordWords');
  const yearlyRecordSubtext = document.getElementById('statYearlyRecordSubtext');

  if (yearlyRecordLabel) yearlyRecordLabel.textContent = `Yearly Record (${AppState.selectedYear})`;
  if (yearlyRecordEl) yearlyRecordEl.textContent = formatMoney(stats.totalYear);
  if (yearlyRecordWordsEl) yearlyRecordWordsEl.textContent = amountToWords(stats.totalYear);
  if (yearlyRecordSubtext) yearlyRecordSubtext.textContent = `Total spent across ${AppState.selectedYear}`;

  // 3. MONTHLY EXPENSE
  const monthlyExpenseLabel = document.getElementById('statMonthlyExpenseLabel');
  const monthlyExpenseEl = document.getElementById('statMonthlyExpense');
  const monthlyExpenseWordsEl = document.getElementById('statMonthlyExpenseWords');
  const monthlyExpenseSubtext = document.getElementById('statMonthlyExpenseSubtext');

  if (monthlyExpenseLabel) monthlyExpenseLabel.textContent = `Monthly Expense (${MONTH_NAMES[AppState.selectedMonth]})`;
  if (monthlyExpenseEl) monthlyExpenseEl.textContent = formatMoney(stats.totalMonth);
  if (monthlyExpenseWordsEl) monthlyExpenseWordsEl.textContent = amountToWords(stats.totalMonth);
  if (monthlyExpenseSubtext) monthlyExpenseSubtext.textContent = `In ${getSelectedPeriodLabel()}`;

  // 4. TODAY'S EXPENSE
  const todayExpenseEl = document.getElementById('statTodayExpense');
  const todayExpenseWordsEl = document.getElementById('statTodayExpenseWords');
  if (todayExpenseEl) todayExpenseEl.textContent = formatMoney(stats.totalToday);
  if (todayExpenseWordsEl) todayExpenseWordsEl.textContent = amountToWords(stats.totalToday);
}

/**
 * Render Expense Charts
 */
function renderCharts(stats) {
  // Chart 1: Spending Trend for active month
  const trendData = [];
  const daysInMonth = new Date(AppState.selectedYear, AppState.selectedMonth + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${AppState.selectedYear}-${String(AppState.selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const sum = stats.dailySpendingMap[dateKey] || 0;
    trendData.push({ label: `${d} ${SHORT_MONTH_NAMES[AppState.selectedMonth]}`, amount: sum });
  }

  if (typeof ChartManager !== 'undefined') {
    ChartManager.renderSpendingTrendChart(
      'expenseTrendChart',
      trendData,
      AppState.chartType || 'bar',
      AppState.currency.symbol,
      false
    );

    // Chart 2: Category Breakdown
    ChartManager.renderCategoryDoughnut(
      'expenseCategoryChart',
      stats.categoryTotals,
      AppState.currency.symbol,
      false
    );
  }
}

/**
 * Render Monthly Expense Table & Transactions with PROMINENT DELETE BUTTONS
 */
function renderMonthlyTable() {
  const periodPrefix = getSelectedPeriodKey();
  const search = AppState.filters.search;
  const category = AppState.filters.category;

  const filtered = AppState.expenses.filter(exp => {
    if (!exp.date || !exp.date.startsWith(periodPrefix)) return false;
    if (category !== 'all' && exp.category !== category) return false;

    if (search) {
      const name = (exp.name || '').toLowerCase();
      const cat = (exp.category || '').toLowerCase();
      const desc = (exp.description || '').toLowerCase();
      const amtStr = (exp.amount || 0).toString();
      if (!name.includes(search) && !cat.includes(search) && !desc.includes(search) && !amtStr.includes(search)) {
        return false;
      }
    }

    return true;
  });

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  const tbody = document.getElementById('monthlyTableBody');
  const countBadge = document.getElementById('monthlyCountBadge');
  const totalDisplay = document.getElementById('monthlyTotalDisplay');
  const emptyState = document.getElementById('monthlyEmptyState');
  const tableContainer = document.getElementById('monthlyTableContainer');

  let filteredTotal = 0;
  filtered.forEach(e => { filteredTotal += e.amount; });

  if (countBadge) countBadge.textContent = `${filtered.length} spend${filtered.length === 1 ? '' : 's'}`;
  if (totalDisplay) totalDisplay.textContent = formatMoney(filteredTotal);

  if (filtered.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.add('hidden');
    if (tbody) tbody.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (tableContainer) tableContainer.classList.remove('hidden');

  if (tbody) {
    tbody.innerHTML = filtered.map(exp => {
      const catObj = CATEGORIES.find(c => c.id === exp.category) || { name: 'Other', colorClass: 'cat-badge-other', icon: 'tag' };
      return `
        <tr class="border-b border-slate-100 dark:border-gray-800/80 hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition">
          <td class="py-3 px-3 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
            ${exp.date}
          </td>
          <td class="py-3 px-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <div>${exp.name}</div>
            ${exp.description ? `<p class="text-xs text-slate-400 font-normal truncate max-w-xs">${exp.description}</p>` : ''}
          </td>
          <td class="py-3 px-3 whitespace-nowrap">
            <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ${catObj.colorClass}">
              ${catObj.name}
            </span>
          </td>
          <td class="py-3 px-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
            <span class="bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-medium">
              ${exp.paymentMethod || 'UPI'}
            </span>
          </td>
          <td class="py-3 px-3 text-sm font-bold text-right text-slate-900 dark:text-slate-100 whitespace-nowrap">
            ${formatMoney(exp.amount)}
          </td>
          <td class="py-3 px-3 text-right whitespace-nowrap">
            <div class="flex items-center justify-end space-x-1.5">
              <button onclick="openEditExpense('${exp.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition" title="Edit spend">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button onclick="promptDeleteExpense('${exp.id}')" class="btn-delete-row" title="Delete this spend record">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                <span>Delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

/**
 * Render Yearly Record 12-Month Grid
 */
function renderYearlyRecordGrid(stats) {
  const gridContainer = document.getElementById('yearlyMonthsGrid');
  const yearLabel = document.getElementById('yearlyGridYearLabel');
  const totalDisplay = document.getElementById('yearlyGridTotalDisplay');

  if (yearLabel) yearLabel.textContent = AppState.selectedYear;
  if (totalDisplay) totalDisplay.textContent = formatMoney(stats.totalYear);

  if (!gridContainer) return;

  const maxMonthVal = Math.max(...stats.monthlyTotals, 1);

  gridContainer.innerHTML = stats.monthlyTotals.map((monthTotal, mIdx) => {
    const isActive = (mIdx === AppState.selectedMonth);
    const pct = ((monthTotal / maxMonthVal) * 100).toFixed(0);

    return `
      <div onclick="selectMonthFromGrid(${mIdx})" class="yearly-month-card ${isActive ? 'active-month-card' : ''}">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="font-bold ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}">${SHORT_MONTH_NAMES[mIdx]}</span>
          ${isActive ? '<span class="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">Active</span>' : ''}
        </div>
        <div class="text-sm font-extrabold text-slate-900 dark:text-white mb-2">
          ${formatMoney(monthTotal)}
        </div>
        <div class="w-full bg-slate-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div class="h-1.5 rounded-full ${isActive ? 'bg-indigo-600' : 'bg-purple-500'}" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function selectMonthFromGrid(monthIndex) {
  AppState.selectedMonth = monthIndex;
  populateMonthYearSelect();
  showToast(`Switched to ${getSelectedPeriodLabel()}`);
  renderApp();
}

/**
 * Update Currency Indicators in UI
 */
function updateCurrencyDisplays() {
  const currencySymbolEls = document.querySelectorAll('.active-currency-symbol');
  currencySymbolEls.forEach(el => {
    el.textContent = AppState.currency.symbol;
  });
}

/**
 * Toast Notification System
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const isError = type === 'error';

  toast.className = `flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold animate-fade-in transition-all duration-300 ${
    isError
      ? 'bg-rose-600 text-white shadow-rose-900/30'
      : 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-indigo-950/40'
  }`;

  toast.innerHTML = `
    <i data-lucide="${isError ? 'alert-circle' : 'check-circle-2'}" class="w-4 h-4 flex-shrink-0"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

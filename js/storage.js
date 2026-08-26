/**
 * Storage & Data Management Module for Student Personal Expense Calculator
 * Multi-User Account Support with Complete Expense Isolation & LocalStorage Persistence
 */

const STORAGE_KEYS = {
  ACCOUNTS: 'campusspend_accounts_v1',
  CURRENT_USER_ID: 'campusspend_active_user_v1',
  THEME: 'campusspend_theme_v1',
  PERIOD: 'campusspend_selected_period_v1'
};

const CATEGORIES = [
  { id: 'Food', name: 'Food', icon: 'utensils', color: '#f97316', colorClass: 'cat-badge-food' },
  { id: 'Travel', name: 'Travel', icon: 'bus', color: '#0284c7', colorClass: 'cat-badge-travel' },
  { id: 'Shopping', name: 'Shopping', icon: 'shopping-bag', color: '#9333ea', colorClass: 'cat-badge-shopping' },
  { id: 'Education', name: 'Education', icon: 'graduation-cap', color: '#0d9488', colorClass: 'cat-badge-education' },
  { id: 'Entertainment', name: 'Entertainment', icon: 'film', color: '#db2777', colorClass: 'cat-badge-entertainment' },
  { id: 'Bills', name: 'Bills', icon: 'receipt', color: '#d97706', colorClass: 'cat-badge-bills' },
  { id: 'Health', name: 'Health', icon: 'heart-pulse', color: '#e11d48', colorClass: 'cat-badge-health' },
  { id: 'Other', name: 'Other', icon: 'more-horizontal', color: '#64748b', colorClass: 'cat-badge-other' }
];

const PAYMENT_METHODS = [
  'Cash',
  'Debit Card',
  'Credit Card',
  'UPI / Online',
  'Student Wallet',
  'Other'
];

const CURRENCIES = {
  INR: { symbol: '₹', name: 'Indian Rupee (INR)', code: 'INR' },
  USD: { symbol: '$', name: 'US Dollar (USD)', code: 'USD' },
  EUR: { symbol: '€', name: 'Euro (EUR)', code: 'EUR' },
  GBP: { symbol: '£', name: 'British Pound (GBP)', code: 'GBP' },
  CAD: { symbol: 'CA$', name: 'Canadian Dollar (CAD)', code: 'CAD' },
  AUD: { symbol: 'AU$', name: 'Australian Dollar (AUD)', code: 'AUD' },
  JPY: { symbol: '¥', name: 'Japanese Yen (JPY)', code: 'JPY' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar (SGD)', code: 'SGD' }
};

// In-memory fallback in case browser storage is restricted
const _memoryStore = {};

const StorageService = {
  /**
   * Safe getter for LocalStorage with in-memory fallback
   */
  _getItem(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      console.warn(`LocalStorage read failed for key "${key}":`, e);
    }
    return _memoryStore[key] !== undefined ? _memoryStore[key] : null;
  },

  /**
   * Safe setter for LocalStorage with in-memory fallback
   */
  _setItem(key, value) {
    _memoryStore[key] = value;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return true;
      }
    } catch (e) {
      console.warn(`LocalStorage write failed for key "${key}":`, e);
    }
    return true;
  },

  /**
   * Safe remover for LocalStorage
   */
  _removeItem(key) {
    delete _memoryStore[key];
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return true;
      }
    } catch (e) {
      console.warn(`LocalStorage remove failed for key "${key}":`, e);
    }
    return true;
  },

  // Helper key generators for user isolation
  _getExpenseKey(userId) {
    const uid = userId || this.getCurrentUserId() || 'guest';
    return `campusspend_expenses_${uid}_v1`;
  },

  _getBudgetKey(userId) {
    const uid = userId || this.getCurrentUserId() || 'guest';
    return `campusspend_budget_${uid}_v1`;
  },

  _getCurrencyKey(userId) {
    const uid = userId || this.getCurrentUserId() || 'guest';
    return `campusspend_currency_${uid}_v1`;
  },

  /* ==========================================================================
     USER ACCOUNT & ACCESS MANAGEMENT
     ========================================================================== */

  /**
   * Get all registered accounts
   */
  getAccounts() {
    try {
      const data = this._getItem(STORAGE_KEYS.ACCOUNTS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Save accounts list
   */
  saveAccounts(accounts) {
    try {
      const safe = Array.isArray(accounts) ? accounts : [];
      this._setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(safe));
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Get active user ID
   */
  getCurrentUserId() {
    return this._getItem(STORAGE_KEYS.CURRENT_USER_ID) || null;
  },

  /**
   * Set active user ID
   */
  setCurrentUserId(userId) {
    if (userId) {
      this._setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
    } else {
      this._removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    }
  },

  /**
   * Get active user account object
   */
  getCurrentUser() {
    const uid = this.getCurrentUserId();
    const accounts = this.getAccounts();
    if (!accounts.length) return null;

    if (uid) {
      const found = accounts.find(a => a.id.toLowerCase() === uid.toLowerCase());
      if (found) return found;
    }

    return accounts[0] || null;
  },

  /**
   * Create a new user account with Name & ID
   */
  createAccount({ name, id, tag, budget, avatarColor }) {
    const trimmedName = (name || '').trim();
    const trimmedId = (id || '').trim();

    if (!trimmedName) {
      return { success: false, error: 'Please enter your Full Name' };
    }
    if (!trimmedId) {
      return { success: false, error: 'Please enter a Student ID / User ID' };
    }

    const accounts = this.getAccounts();
    const exists = accounts.some(a => a.id.toLowerCase() === trimmedId.toLowerCase());
    if (exists) {
      return { success: false, error: `Account with ID "${trimmedId}" already exists. Please log in or choose a different ID.` };
    }

    const newAccount = {
      id: trimmedId,
      name: trimmedName,
      tag: (tag || 'College Student').trim(),
      budget: Math.max(0, parseFloat(budget) || 12000),
      avatarColor: avatarColor || '#6366f1',
      createdAt: new Date().toISOString()
    };

    accounts.push(newAccount);
    this.saveAccounts(accounts);
    this.setCurrentUserId(newAccount.id);

    // Initialize 00 clean slate for new user
    this.saveExpenses([], newAccount.id);
    this.saveBudget({
      monthlyLimit: newAccount.budget,
      alertsEnabled: true,
      categoryLimits: {
        Food: Math.round(newAccount.budget * 0.35),
        Travel: Math.round(newAccount.budget * 0.15),
        Education: Math.round(newAccount.budget * 0.20),
        Entertainment: Math.round(newAccount.budget * 0.10),
        Bills: Math.round(newAccount.budget * 0.10),
        Shopping: Math.round(newAccount.budget * 0.05),
        Health: Math.round(newAccount.budget * 0.05)
      }
    }, newAccount.id);

    return { success: true, user: newAccount };
  },

  /**
   * Log into an existing account by ID
   */
  loginAccount(id) {
    const trimmedId = (id || '').trim();
    const accounts = this.getAccounts();
    const account = accounts.find(a => a.id.toLowerCase() === trimmedId.toLowerCase());

    if (!account) {
      return { success: false, error: `No account found with ID "${trimmedId}"` };
    }

    this.setCurrentUserId(account.id);
    return { success: true, user: account };
  },

  /**
   * Log out active user
   */
  logout() {
    this.setCurrentUserId(null);
    return true;
  },

  /**
   * Delete an account and all its expenses
   */
  deleteAccount(id) {
    let accounts = this.getAccounts();
    const target = accounts.find(a => a.id.toLowerCase() === id.toLowerCase());
    if (!target) return false;

    accounts = accounts.filter(a => a.id.toLowerCase() !== id.toLowerCase());
    this.saveAccounts(accounts);

    // Remove user specific data
    this._removeItem(this._getExpenseKey(id));
    this._removeItem(this._getBudgetKey(id));
    this._removeItem(this._getCurrencyKey(id));

    if (this.getCurrentUserId() && this.getCurrentUserId().toLowerCase() === id.toLowerCase()) {
      if (accounts.length > 0) {
        this.setCurrentUserId(accounts[0].id);
      } else {
        this.setCurrentUserId(null);
      }
    }
    return true;
  },

  /* ==========================================================================
     EXPENSES & DIARY OPERATIONS (SCOPED PER USER)
     ========================================================================== */

  /**
   * Retrieve all expenses for active user (starts at 00 [] for new accounts)
   */
  getExpenses(userId = null) {
    try {
      const key = this._getExpenseKey(userId);
      const data = this._getItem(key);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error reading expenses from storage:', e);
      return [];
    }
  },

  /**
   * Save expenses array permanently to storage for active user
   */
  saveExpenses(expenses, userId = null) {
    try {
      const key = this._getExpenseKey(userId);
      const safeArray = Array.isArray(expenses) ? expenses : [];
      return this._setItem(key, JSON.stringify(safeArray));
    } catch (e) {
      console.error('Error saving expenses:', e);
      return false;
    }
  },

  /**
   * Add a single new expense and persist immediately for active user
   */
  addExpense(expense) {
    const expenses = this.getExpenses();
    const newExpense = {
      id: expense.id || 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      name: (expense.name || 'Untitled Expense').trim(),
      amount: Math.max(0, parseFloat(expense.amount) || 0),
      category: expense.category || 'Other',
      date: expense.date || new Date().toISOString().split('T')[0],
      paymentMethod: expense.paymentMethod || 'UPI / Online',
      description: (expense.description || '').trim(),
      createdAt: new Date().toISOString()
    };
    expenses.unshift(newExpense);
    this.saveExpenses(expenses);
    return newExpense;
  },

  /**
   * Update an existing expense by ID and persist immediately
   */
  updateExpense(updatedExpense) {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => e.id === updatedExpense.id);
    if (index !== -1) {
      expenses[index] = {
        ...expenses[index],
        name: (updatedExpense.name !== undefined ? updatedExpense.name : expenses[index].name).trim(),
        amount: updatedExpense.amount !== undefined ? Math.max(0, parseFloat(updatedExpense.amount) || 0) : expenses[index].amount,
        category: updatedExpense.category || expenses[index].category,
        date: updatedExpense.date || expenses[index].date,
        paymentMethod: updatedExpense.paymentMethod || expenses[index].paymentMethod,
        description: (updatedExpense.description !== undefined ? updatedExpense.description : expenses[index].description || '').trim(),
        updatedAt: new Date().toISOString()
      };
      this.saveExpenses(expenses);
      return expenses[index];
    }
    return null;
  },

  /**
   * Delete an expense by ID and persist immediately
   */
  deleteExpense(id) {
    const expenses = this.getExpenses();
    const initialCount = expenses.length;
    const remaining = expenses.filter(e => e.id !== id);
    if (remaining.length !== initialCount) {
      this.saveExpenses(remaining);
      return true;
    }
    return false;
  },

  /**
   * Clear all recorded expenses for active user (persists clean 00 state)
   */
  clearAllExpenses() {
    this.saveExpenses([]);
    return true;
  },

  /* ==========================================================================
     BUDGET, CURRENCY, THEME & PERIOD PREFERENCES
     ========================================================================== */

  /**
   * Get User Budget Configuration
   */
  getBudget(userId = null) {
    try {
      const key = this._getBudgetKey(userId);
      const data = this._getItem(key);
      if (data) return JSON.parse(data);

      const user = this.getCurrentUser();
      const limit = user && user.budget ? user.budget : 12000;
      return {
        monthlyLimit: limit,
        alertsEnabled: true,
        categoryLimits: {
          Food: Math.round(limit * 0.35),
          Travel: Math.round(limit * 0.15),
          Education: Math.round(limit * 0.20),
          Entertainment: Math.round(limit * 0.10),
          Bills: Math.round(limit * 0.10),
          Shopping: Math.round(limit * 0.05),
          Health: Math.round(limit * 0.05)
        }
      };
    } catch (e) {
      return { monthlyLimit: 12000, alertsEnabled: true, categoryLimits: {} };
    }
  },

  /**
   * Save User Budget Configuration
   */
  saveBudget(budget, userId = null) {
    try {
      const key = this._getBudgetKey(userId);
      return this._setItem(key, JSON.stringify(budget));
    } catch (e) {
      return false;
    }
  },

  /**
   * Get Saved Currency Preference
   */
  getCurrency(userId = null) {
    try {
      const key = this._getCurrencyKey(userId);
      const code = this._getItem(key) || 'INR';
      return CURRENCIES[code] || CURRENCIES.INR;
    } catch (e) {
      return CURRENCIES.INR;
    }
  },

  /**
   * Save Currency Preference
   */
  saveCurrency(currencyCode, userId = null) {
    if (CURRENCIES[currencyCode]) {
      const key = this._getCurrencyKey(userId);
      this._setItem(key, currencyCode);
      return true;
    }
    return false;
  },

  /**
   * Get Theme Preference
   */
  getTheme() {
    return this._getItem(STORAGE_KEYS.THEME) || 'light';
  },

  /**
   * Save Theme Preference
   */
  saveTheme(theme) {
    this._setItem(STORAGE_KEYS.THEME, theme);
  },

  /**
   * Get Last Selected Period (Year & Month)
   */
  getSelectedPeriod() {
    try {
      const data = this._getItem(STORAGE_KEYS.PERIOD);
      if (data) {
        const parsed = JSON.parse(data);
        if (typeof parsed.year === 'number' && typeof parsed.month === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  },

  /**
   * Save Last Selected Period
   */
  saveSelectedPeriod(year, month) {
    try {
      this._setItem(STORAGE_KEYS.PERIOD, JSON.stringify({ year, month }));
      return true;
    } catch (e) {
      return false;
    }
  },

  /* ==========================================================================
     OPTIONAL SAMPLE DATA SEED & EXPORT/IMPORT
     ========================================================================== */

  /**
   * Optional manual sample data seeding (only when explicitly requested)
   */
  seedDemoStudentData() {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const day = today.getDate();

    const formatDate = (year, monthIndex, dayNum) => {
      const targetM = String(monthIndex + 1).padStart(2, '0');
      const targetD = String(Math.max(1, Math.min(28, dayNum))).padStart(2, '0');
      return `${year}-${targetM}-${targetD}`;
    };

    const sampleExpenses = [
      {
        id: 'exp_cur_1',
        name: 'Sharma Ji Canteen - Rajma Chawal Thali',
        amount: 120.00,
        category: 'Food',
        date: formatDate(y, m, Math.min(day, 26)),
        paymentMethod: 'UPI / Online',
        description: 'Lunch thali with extra butter roti at campus canteen',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_cur_2',
        name: 'Tapri Chai & Samosa after Lab',
        amount: 45.00,
        category: 'Food',
        date: formatDate(y, m, Math.min(day, 26)),
        paymentMethod: 'UPI / Online',
        description: 'Adrak cutting chai and 2 samosas',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_cur_3',
        name: 'Auto share to Metro Station',
        amount: 50.00,
        category: 'Travel',
        date: formatDate(y, m, Math.max(1, day - 1)),
        paymentMethod: 'UPI / Online',
        description: 'Shared auto from hostel gate to yellow line metro',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_cur_4',
        name: 'Monthly Metro Smart Card Recharge',
        amount: 600.00,
        category: 'Travel',
        date: formatDate(y, m, 5),
        paymentMethod: 'UPI / Online',
        description: 'Student daily transit card recharge',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_cur_5',
        name: 'Engineering Books & Xerox',
        amount: 950.00,
        category: 'Education',
        date: formatDate(y, m, 8),
        paymentMethod: 'Debit Card',
        description: 'Semester reference books and lab manual binding',
        createdAt: new Date().toISOString()
      }
    ];

    this.saveExpenses(sampleExpenses);
    return sampleExpenses;
  },

  /**
   * Export expenses as a CSV string URI
   */
  exportToCSV() {
    const expenses = this.getExpenses();
    if (!expenses.length) return null;

    const user = this.getCurrentUser();
    const headers = ['ID', 'Expense Name', 'Amount', 'Category', 'Date', 'Payment Method', 'Description'];
    const rows = expenses.map(e => [
      `"${e.id}"`,
      `"${(e.name || '').replace(/"/g, '""')}"`,
      e.amount,
      `"${e.category || 'Other'}"`,
      `"${e.date}"`,
      `"${e.paymentMethod || ''}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      `# User: ${user ? `${user.name} (ID: ${user.id})` : 'Student'}`,
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    return encodeURI(csvContent);
  },

  /**
   * Export full backup payload as JSON URI
   */
  exportToJSON() {
    const user = this.getCurrentUser();
    const payload = {
      app: 'CampusSpend',
      version: '3.0',
      exportedAt: new Date().toISOString(),
      user: user || null,
      currency: this.getCurrency().code,
      budget: this.getBudget(),
      expenses: this.getExpenses()
    };
    return 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
  },

  /**
   * Import data from JSON string and save permanently
   */
  importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.expenses)) {
        if (data.user && data.user.id) {
          const accounts = this.getAccounts();
          const exists = accounts.find(a => a.id.toLowerCase() === data.user.id.toLowerCase());
          if (!exists) {
            accounts.push(data.user);
            this.saveAccounts(accounts);
          }
          this.setCurrentUserId(data.user.id);
        }
        this.saveExpenses(data.expenses);
        if (data.budget) this.saveBudget(data.budget);
        if (data.currency && CURRENCIES[data.currency]) this.saveCurrency(data.currency);
        return { success: true, count: data.expenses.length };
      }
      return { success: false, error: 'Invalid file format: missing expenses array' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};

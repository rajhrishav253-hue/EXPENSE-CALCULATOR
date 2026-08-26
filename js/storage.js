/**
 * Storage & Data Management Module for Student Personal Expense Calculator
 * Direct, Reliable LocalStorage Persistence with Individual Account Profile Management
 */

const STORAGE_KEYS = {
  PROFILE: 'campusspend_user_profile_v1',
  EXPENSES: 'campusspend_user_expenses_v1',
  BUDGET: 'campusspend_user_budget_v1',
  CURRENCY: 'campusspend_user_currency_v1',
  THEME: 'campusspend_user_theme_v1',
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

// In-memory fallback
const _memoryStore = {};

const StorageService = {
  _getItem(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      console.warn(`LocalStorage read failed for "${key}":`, e);
    }
    return _memoryStore[key] !== undefined ? _memoryStore[key] : null;
  },

  _setItem(key, value) {
    _memoryStore[key] = value;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return true;
      }
    } catch (e) {
      console.warn(`LocalStorage write failed for "${key}":`, e);
    }
    return true;
  },

  _removeItem(key) {
    delete _memoryStore[key];
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return true;
      }
    } catch (e) {
      console.warn(`LocalStorage remove failed for "${key}":`, e);
    }
    return true;
  },

  /* ==========================================================================
     INDIVIDUAL USER PROFILE MANAGEMENT (Name, ID, Tag, Budget)
     ========================================================================== */

  /**
   * Get User Profile (Name, ID, Department, Budget)
   */
  getUserProfile() {
    try {
      const data = this._getItem(STORAGE_KEYS.PROFILE);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && parsed.name) return parsed;
      }
    } catch (e) {
      // ignore
    }

    // Default individual student profile if not customized yet
    return {
      name: 'Rishav Raj',
      id: 'STU-2026',
      tag: 'College Student',
      budget: 12000,
      avatarColor: '#6366f1',
      isDefault: true
    };
  },

  /**
   * Save User Profile (Name, ID, Tag, Budget, Avatar)
   */
  saveUserProfile(profile) {
    try {
      const current = this.getUserProfile();
      const updated = {
        ...current,
        name: (profile.name || current.name || 'Student').trim(),
        id: (profile.id || current.id || 'STU-2026').trim(),
        tag: (profile.tag || current.tag || 'College Student').trim(),
        budget: profile.budget !== undefined && !isNaN(profile.budget) ? Math.max(0, parseFloat(profile.budget)) : current.budget,
        avatarColor: profile.avatarColor || current.avatarColor || '#6366f1',
        isDefault: false,
        updatedAt: new Date().toISOString()
      };

      this._setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Error saving user profile:', e);
      return null;
    }
  },

  /* ==========================================================================
     EXPENSES MANAGEMENT (Clean 00 slate by default)
     ========================================================================== */

  /**
   * Get all expenses (returns [] on fresh start)
   */
  getExpenses() {
    try {
      const data = this._getItem(STORAGE_KEYS.EXPENSES);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error reading expenses from storage:', e);
      return [];
    }
  },

  /**
   * Save all expenses permanently
   */
  saveExpenses(expenses) {
    try {
      const safe = Array.isArray(expenses) ? expenses : [];
      return this._setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(safe));
    } catch (e) {
      console.error('Error saving expenses:', e);
      return false;
    }
  },

  /**
   * Add a new expense record
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
   * Update an existing expense record by ID
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
   * Delete an expense record by ID
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
   * Delete all expenses (reverts to clean 00 state)
   */
  clearAllExpenses() {
    this.saveExpenses([]);
    return true;
  },

  /* ==========================================================================
     BUDGET, CURRENCY, THEME & PERIOD
     ========================================================================== */

  /**
   * Get User Budget Limits
   */
  getBudget() {
    try {
      const data = this._getItem(STORAGE_KEYS.BUDGET);
      if (data) return JSON.parse(data);

      const profile = this.getUserProfile();
      const limit = profile && profile.budget ? profile.budget : 12000;
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
   * Save User Budget Limits
   */
  saveBudget(budget) {
    try {
      return this._setItem(STORAGE_KEYS.BUDGET, JSON.stringify(budget));
    } catch (e) {
      return false;
    }
  },

  /**
   * Get Currency Preference
   */
  getCurrency() {
    try {
      const code = this._getItem(STORAGE_KEYS.CURRENCY) || 'INR';
      return CURRENCIES[code] || CURRENCIES.INR;
    } catch (e) {
      return CURRENCIES.INR;
    }
  },

  /**
   * Save Currency Preference
   */
  saveCurrency(currencyCode) {
    if (CURRENCIES[currencyCode]) {
      this._setItem(STORAGE_KEYS.CURRENCY, currencyCode);
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
     OPTIONAL SAMPLE DATA & EXPORT/IMPORT
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
        id: 'exp_demo_1',
        name: 'Sharma Ji Canteen - Rajma Chawal Thali',
        amount: 120.00,
        category: 'Food',
        date: formatDate(y, m, Math.min(day, 26)),
        paymentMethod: 'UPI / Online',
        description: 'Lunch thali with extra butter roti at campus canteen',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_demo_2',
        name: 'Tapri Chai & Samosa after Lab',
        amount: 45.00,
        category: 'Food',
        date: formatDate(y, m, Math.min(day, 26)),
        paymentMethod: 'UPI / Online',
        description: 'Adrak cutting chai and 2 samosas',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_demo_3',
        name: 'Auto share to Metro Station',
        amount: 50.00,
        category: 'Travel',
        date: formatDate(y, m, Math.max(1, day - 1)),
        paymentMethod: 'UPI / Online',
        description: 'Shared auto from hostel gate to yellow line metro',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_demo_4',
        name: 'Monthly Metro Smart Card Recharge',
        amount: 600.00,
        category: 'Travel',
        date: formatDate(y, m, 5),
        paymentMethod: 'UPI / Online',
        description: 'Student daily transit card recharge',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_demo_5',
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

    const profile = this.getUserProfile();
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
      `# User: ${profile.name} (ID: ${profile.id})`,
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    return encodeURI(csvContent);
  },

  /**
   * Export full backup payload as JSON URI
   */
  exportToJSON() {
    const profile = this.getUserProfile();
    const payload = {
      app: 'CampusSpend',
      version: '3.1',
      exportedAt: new Date().toISOString(),
      user: profile,
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
        if (data.user && data.user.name) {
          this.saveUserProfile(data.user);
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

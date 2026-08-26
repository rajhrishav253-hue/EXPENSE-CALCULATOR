/**
 * Storage & Data Management Module for Student Personal Expense Calculator
 * Provides robust LocalStorage persistence with in-memory fallback,
 * ensuring user data is saved reliably and never accidentally reset or overwritten.
 */

const STORAGE_KEYS = {
  EXPENSES: 'student_expenses_user_v3',
  BUDGET: 'student_budget_v3',
  CURRENCY: 'student_currency_v3',
  THEME: 'student_theme_v3',
  INITIALIZED: 'student_expenses_initialized_v3',
  PERIOD: 'student_selected_period_v3'
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

// In-memory fallback in case browser storage is restricted or throws
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
      console.warn(`LocalStorage read failed for key "${key}", falling back to memory:`, e);
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
      console.warn(`LocalStorage write failed for key "${key}", saved to memory only:`, e);
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

  /**
   * Check if the application has completed first-time setup
   */
  isInitialized() {
    return this._getItem(STORAGE_KEYS.INITIALIZED) === 'true';
  },

  /**
   * Mark application setup as completed
   */
  setInitialized() {
    this._setItem(STORAGE_KEYS.INITIALIZED, 'true');
  },

  /**
   * Ensure storage is initialized cleanly with a 00 blank slate.
   * Does NOT add any demo data inside automatically.
   * Expenses only show when the user logs them.
   */
  ensureInitialized() {
    if (this.isInitialized()) {
      return false;
    }

    // Initialize with a clean 00 state (empty array)
    if (this._getItem(STORAGE_KEYS.EXPENSES) === null) {
      this.saveExpenses([]);
    }
    this.setInitialized();
    return true;
  },

  /**
   * Retrieve all expenses from storage
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
   * Save expenses array permanently to storage
   */
  saveExpenses(expenses) {
    try {
      const safeArray = Array.isArray(expenses) ? expenses : [];
      return this._setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(safeArray));
    } catch (e) {
      console.error('Error saving expenses:', e);
      return false;
    }
  },

  /**
   * Add a single new expense and persist immediately
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
    this.setInitialized();
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
   * Clear all recorded expenses and persist empty array (remains empty on reloads)
   */
  clearAllExpenses() {
    this.saveExpenses([]);
    this.setInitialized(); // Ensure it remains permanently initialized as empty
    return true;
  },

  /**
   * Get User Budget Configuration
   */
  getBudget() {
    try {
      const data = this._getItem(STORAGE_KEYS.BUDGET);
      return data ? JSON.parse(data) : {
        monthlyLimit: 12000,
        alertsEnabled: true,
        categoryLimits: {
          Food: 4500,
          Travel: 1200,
          Education: 2000,
          Entertainment: 1200,
          Bills: 1000,
          Shopping: 1500,
          Health: 600
        }
      };
    } catch (e) {
      return {
        monthlyLimit: 12000,
        alertsEnabled: true,
        categoryLimits: {
          Food: 4500,
          Travel: 1200,
          Education: 2000,
          Entertainment: 1200,
          Bills: 1000,
          Shopping: 1500,
          Health: 600
        }
      };
    }
  },

  /**
   * Save User Budget Configuration
   */
  saveBudget(budget) {
    try {
      return this._setItem(STORAGE_KEYS.BUDGET, JSON.stringify(budget));
    } catch (e) {
      return false;
    }
  },

  /**
   * Get Saved Currency Preference
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

  /**
   * Seed curated sample student records with stable dates
   */
  seedDemoStudentData() {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth(); // 0-indexed
    const day = today.getDate();

    const formatDate = (year, monthIndex, dayNum) => {
      const targetM = String(monthIndex + 1).padStart(2, '0');
      const targetD = String(Math.max(1, Math.min(28, dayNum))).padStart(2, '0');
      return `${year}-${targetM}-${targetD}`;
    };

    const sampleExpenses = [
      // Current Month
      {
        id: 'exp_cur_1',
        name: 'Sharma Ji Canteen - Rajma Chawal Thali',
        amount: 120.00,
        category: 'Food',
        date: formatDate(y, m, Math.min(day, 26)),
        paymentMethod: 'UPI / Online',
        description: 'Lunch thali with extra butter roti and sweet lassi at campus canteen',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_cur_2',
        name: 'Tapri Chai & Samosa after Lab',
        amount: 45.00,
        category: 'Food',
        date: formatDate(y, m, Math.min(day, 26)),
        paymentMethod: 'UPI / Online',
        description: 'Adrak cutting chai and 2 hot samosas with classmates',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_cur_3',
        name: 'Auto share to Metro Station',
        amount: 50.00,
        category: 'Travel',
        date: formatDate(y, m, Math.max(1, day - 1)),
        paymentMethod: 'UPI / Online',
        description: '4-way shared e-rickshaw from hostel gate to metro',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_cur_4',
        name: 'Monthly Metro Smart Card Recharge',
        amount: 600.00,
        category: 'Travel',
        date: formatDate(y, m, 5),
        paymentMethod: 'UPI / Online',
        description: 'Student daily commute card top-up for the whole month',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_cur_5',
        name: 'Engineering Books & Lab Manual Xerox',
        amount: 950.00,
        category: 'Education',
        date: formatDate(y, m, 8),
        paymentMethod: 'Debit Card',
        description: 'Semester reference books and spiral binding for lab reports',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_cur_6',
        name: 'Room 304 WiFi Bill (4-way split)',
        amount: 499.00,
        category: 'Bills',
        date: formatDate(y, m, 10),
        paymentMethod: 'UPI / Online',
        description: 'My quarter share of unlimited fiber router connection',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_cur_7',
        name: 'Hostel Ration - Maggi, Milk & Peanut Butter',
        amount: 1450.00,
        category: 'Food',
        date: formatDate(y, m, 12),
        paymentMethod: 'UPI / Online',
        description: 'Oats, milk carton, 12-pack Maggi noodles, bread and coffee pouch',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_cur_8',
        name: 'Movie Night @ PVR with Roommates',
        amount: 350.00,
        category: 'Entertainment',
        date: formatDate(y, m, 15),
        paymentMethod: 'UPI / Online',
        description: 'Student concession movie ticket and salted popcorn split',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_cur_9',
        name: 'College Gym Monthly Fee',
        amount: 500.00,
        category: 'Health',
        date: formatDate(y, m, 3),
        paymentMethod: 'UPI / Online',
        description: 'Campus sports complex gym and badminton court pass',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_cur_10',
        name: 'Department Fest Hoodie',
        amount: 1299.00,
        category: 'Shopping',
        date: formatDate(y, m, 18),
        paymentMethod: 'Debit Card',
        description: 'Official department tech fest custom hoodie and lanyard',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_cur_11',
        name: 'Pharmacy - Cold Strips & Paracetamol',
        amount: 220.00,
        category: 'Health',
        date: formatDate(y, m, 20),
        paymentMethod: 'Cash',
        description: 'Medicines from campus medical store for viral cold',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_cur_12',
        name: 'Hostel Washing Machine Card Recharge',
        amount: 180.00,
        category: 'Other',
        date: formatDate(y, m, 22),
        paymentMethod: 'Student Wallet',
        description: 'Smartcard top-up for 6 laundry washing cycles',
        createdAt: new Date().toISOString()
      },

      // Past Month 1 (July)
      {
        id: 'exp_prev1_1',
        name: 'Semester College Registration & Exam Fee',
        amount: 2500.00,
        category: 'Education',
        date: formatDate(y, Math.max(0, m - 1), 4),
        paymentMethod: 'Debit Card',
        description: 'Online semester registration portal fee receipt',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_prev1_2',
        name: 'Hostel Mess Advance Deposit',
        amount: 3800.00,
        category: 'Food',
        date: formatDate(y, Math.max(0, m - 1), 2),
        paymentMethod: 'UPI / Online',
        description: 'Monthly unlimited breakfast, lunch, and dinner meal pass',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_prev1_3',
        name: 'Monsoon Big Umbrella & Raincoat',
        amount: 450.00,
        category: 'Shopping',
        date: formatDate(y, Math.max(0, m - 1), 7),
        paymentMethod: 'Cash',
        description: 'Windproof umbrella for walking between academic blocks',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_prev1_4',
        name: 'July Metro Pass Recharge',
        amount: 600.00,
        category: 'Travel',
        date: formatDate(y, Math.max(0, m - 1), 1),
        paymentMethod: 'UPI / Online',
        description: 'Monthly student transit card reload',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_prev1_5',
        name: 'Late Night Dominos Pizza Split',
        amount: 380.00,
        category: 'Food',
        date: formatDate(y, Math.max(0, m - 1), 16),
        paymentMethod: 'UPI / Online',
        description: 'Celebrated hackathon submission with wing mates',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_prev1_6',
        name: 'Notebooks, Pens & Stationery Pack',
        amount: 320.00,
        category: 'Education',
        date: formatDate(y, Math.max(0, m - 1), 12),
        paymentMethod: 'UPI / Online',
        description: '5 subject registers, sticky notes, and gel pens for new semester',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_prev1_7',
        name: 'Hostel WiFi Split',
        amount: 499.00,
        category: 'Bills',
        date: formatDate(y, Math.max(0, m - 1), 10),
        paymentMethod: 'UPI / Online',
        description: 'Monthly optical fiber bill contribution',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_prev1_8',
        name: 'Haircut & Grooming @ Campus Salon',
        amount: 150.00,
        category: 'Other',
        date: formatDate(y, Math.max(0, m - 1), 24),
        paymentMethod: 'UPI / Online',
        description: 'Haircut and head massage before semester interview',
        createdAt: new Date().toISOString()
      },

      // Past Month 2 (June)
      {
        id: 'exp_prev2_1',
        name: 'Summer Internship Travel Train & Cab',
        amount: 1200.00,
        category: 'Travel',
        date: formatDate(y, Math.max(0, m - 2), 2),
        paymentMethod: 'UPI / Online',
        description: 'Daily express bus and metro travel for tech internship',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_prev2_2',
        name: 'Laptop 65W Fast Type-C Charger',
        amount: 1150.00,
        category: 'Education',
        date: formatDate(y, Math.max(0, m - 2), 14),
        paymentMethod: 'Debit Card',
        description: 'Replaced frayed original laptop power brick',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_prev2_3',
        name: 'Street Momos & Cold Coffee with Gang',
        amount: 180.00,
        category: 'Food',
        date: formatDate(y, Math.max(0, m - 2), 18),
        paymentMethod: 'UPI / Online',
        description: 'Evening treat after internship project completion',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_prev2_4',
        name: 'Quarterly Mobile Recharge (84 Days)',
        amount: 719.00,
        category: 'Bills',
        date: formatDate(y, Math.max(0, m - 2), 8),
        paymentMethod: 'UPI / Online',
        description: 'Jio 2GB/day unlimited 5G student data plan',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_prev2_5',
        name: 'Cloud Developer Certification Voucher',
        amount: 899.00,
        category: 'Education',
        date: formatDate(y, Math.max(0, m - 2), 22),
        paymentMethod: 'Credit Card',
        description: 'Student discount exam voucher for AWS cloud badge',
        createdAt: new Date().toISOString()
      },

      // Past Month 3 (May)
      {
        id: 'exp_prev3_1',
        name: 'End-Semester Exam Photocopies',
        amount: 280.00,
        category: 'Education',
        date: formatDate(y, Math.max(0, m - 3), 10),
        paymentMethod: 'Cash',
        description: 'Previous 5 years question papers & solved answer bank',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_prev3_2',
        name: 'Farewell Dinner Buffet with Seniors',
        amount: 650.00,
        category: 'Food',
        date: formatDate(y, Math.max(0, m - 3), 25),
        paymentMethod: 'UPI / Online',
        description: 'Department annual farewell party banquet share',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_prev3_3',
        name: 'Train Ticket Home for Summer Vacation',
        amount: 850.00,
        category: 'Travel',
        date: formatDate(y, Math.max(0, m - 3), 28),
        paymentMethod: 'UPI / Online',
        description: 'IRCTC 3rd AC train ticket for summer holidays',
        createdAt: new Date().toISOString()
      }
    ];

    this.saveExpenses(sampleExpenses);
    this.saveBudget({
      monthlyLimit: 12000,
      alertsEnabled: true,
      categoryLimits: {
        Food: 4500,
        Travel: 1200,
        Education: 2000,
        Entertainment: 1200,
        Bills: 1000,
        Shopping: 1500,
        Health: 600
      }
    });
    this.setInitialized();

    return sampleExpenses;
  },

  /**
   * Export expenses as a CSV string URI
   */
  exportToCSV() {
    const expenses = this.getExpenses();
    if (!expenses.length) return null;

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

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return encodeURI(csvContent);
  },

  /**
   * Export full backup payload as JSON URI
   */
  exportToJSON() {
    const payload = {
      app: 'StudentPersonalExpenseCalculator',
      version: '2.0',
      exportedAt: new Date().toISOString(),
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
        this.saveExpenses(data.expenses);
        if (data.budget) this.saveBudget(data.budget);
        if (data.currency && CURRENCIES[data.currency]) this.saveCurrency(data.currency);
        this.setInitialized();
        return { success: true, count: data.expenses.length };
      }
      return { success: false, error: 'Invalid file format: missing expenses array' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};

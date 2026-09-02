/**
 * Storage & Data Management Module for Student Personal Expense Calculator
 * Triple-Layer Persistence: LocalStorage + IndexedDB + MongoDB Atlas Cloud
 * Features: Automatic Self-Healing, Cloud Sync, Offline Fallback, and Snapshots
 */

const STORAGE_KEYS = {
  PROFILE: 'campusspend_user_profile_v1',
  EXPENSES: 'campusspend_user_expenses_v1',
  BUDGET: 'campusspend_user_budget_v1',
  CURRENCY: 'campusspend_user_currency_v1',
  THEME: 'campusspend_user_theme_v1',
  PERIOD: 'campusspend_selected_period_v1',
  SNAPSHOT_BACKUP: 'campusspend_snapshot_backup_v1',
  STORAGE_HEALTH: 'campusspend_storage_health_v1'
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
  'UPI / Online',
  'Cash',
  'Debit Card',
  'Credit Card',
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

// In-memory store fallback
const _memoryStore = {};

/* ==========================================================================
   INDEXEDDB PERMANENT STORAGE ENGINE (CampusSpendDB)
   ========================================================================== */
const DB_NAME = 'CampusSpendPermanentDB';
const DB_VERSION = 1;
const DB_STORE = 'app_key_value';

let _idbInstance = null;
let _isPersisted = false;

function openIndexedDB() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    if (_idbInstance) {
      resolve(_idbInstance);
      return;
    }
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = (e) => {
        _idbInstance = e.target.result;
        resolve(_idbInstance);
      };
      req.onerror = (e) => {
        console.warn('IndexedDB open error:', e);
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB initialization failed:', err);
      resolve(null);
    }
  });
}

function idbSet(key, value) {
  return openIndexedDB().then((db) => {
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(DB_STORE, 'readwrite');
        const store = tx.objectStore(DB_STORE);
        store.put({ key, value, updatedAt: Date.now() });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  });
}

function idbGet(key) {
  return openIndexedDB().then((db) => {
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(DB_STORE, 'readonly');
        const store = tx.objectStore(DB_STORE);
        const req = store.get(key);
        req.onsuccess = () => {
          resolve(req.result ? req.result.value : null);
        };
        req.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
  });
}

function idbGetAll() {
  return openIndexedDB().then((db) => {
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(DB_STORE, 'readonly');
        const store = tx.objectStore(DB_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          resolve(req.result || []);
        };
        req.onerror = () => resolve([]);
      } catch (err) {
        resolve([]);
      }
    });
  });
}

const StorageService = {
  _isInitialized: false,

  /**
   * Initialize Storage Service:
   * 1. Request persistent storage from browser (prevents auto-eviction).
   * 2. Synchronize LocalStorage and IndexedDB.
   * 3. Auto-recover if one layer was cleared.
   */
  async init() {
    if (this._isInitialized) return;
    this._isInitialized = true;

    // 1. Request Browser Storage Persistence (StorageManager API)
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        _isPersisted = await navigator.storage.persist();
        if (_isPersisted) {
          console.info('CampusSpend: Browser storage persistence granted. Eviction protection active.');
        }
      } catch (e) {
        console.warn('Storage persist request warning:', e);
      }
    }

    // 2. Perform Self-Healing Sync between LocalStorage and IndexedDB
    await this.selfHealingSync();
  },

  /**
   * Checks if browser storage is permanent
   */
  async isPermanentStorageActive() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      try {
        return await navigator.storage.persisted();
      } catch (e) {
        return false;
      }
    }
    return false;
  },

  /**
   * Synchronizes LocalStorage and IndexedDB to ensure zero data loss.
   * If LocalStorage was wiped by browser cache clean, it recovers from IndexedDB.
   * If IndexedDB is fresh, it hydrates from LocalStorage.
   */
  async selfHealingSync() {
    try {
      const keysToSync = Object.values(STORAGE_KEYS);

      for (const key of keysToSync) {
        const lsVal = this._getItem(key);
        const idbVal = await idbGet(key);

        if (lsVal && !idbVal) {
          // Sync from LocalStorage to IndexedDB
          await idbSet(key, lsVal);
        } else if (!lsVal && idbVal) {
          // Auto-Recover from IndexedDB back into LocalStorage
          console.info(`CampusSpend: Recovered lost key "${key}" from IndexedDB!`);
          this._setItem(key, idbVal, false); // Don't re-trigger async loop
        }
      }

      // Also maintain a safety snapshot
      this.createSnapshotBackup();
    } catch (err) {
      console.warn('Self-healing sync exception:', err);
    }
  },

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

  _setItem(key, value, syncToIDB = true) {
    _memoryStore[key] = value;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`LocalStorage write failed for "${key}":`, e);
    }

    // Dual-Layer: Mirror write to IndexedDB asynchronously
    if (syncToIDB) {
      idbSet(key, value).catch(() => {});
    }
    return true;
  },

  _removeItem(key) {
    delete _memoryStore[key];
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`LocalStorage remove failed for "${key}":`, e);
    }
    // Also remove from IndexedDB
    idbSet(key, null).catch(() => {});
    return true;
  },

  /**
   * Internal Safety Snapshot Backup
   */
  createSnapshotBackup() {
    try {
      const profile = this.getUserProfile();
      const expenses = this.getExpenses();
      const budget = this.getBudget();
      const currency = this.getCurrency();

      if (expenses.length > 0) {
        const snapshot = {
          timestamp: new Date().toISOString(),
          count: expenses.length,
          profile,
          budget,
          currency: currency.code,
          expenses
        };
        const str = JSON.stringify(snapshot);
        this._setItem(STORAGE_KEYS.SNAPSHOT_BACKUP, str);
      }
    } catch (e) {
      // ignore
    }
  },

  /**
   * Get Snapshot Backup if needed for emergency restore
   */
  getSnapshotBackup() {
    try {
      const data = this._getItem(STORAGE_KEYS.SNAPSHOT_BACKUP);
      if (data) return JSON.parse(data);
    } catch (e) {
      return null;
    }
    return null;
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
     EXPENSES MANAGEMENT (Permanent Storage with Dual-Layer IDB + LS)
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
   * Save all expenses permanently (saves to LocalStorage + IndexedDB + Snapshot)
   */
  saveExpenses(expenses) {
    try {
      const safe = Array.isArray(expenses) ? expenses : [];
      const res = this._setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(safe));
      this.createSnapshotBackup();
      return res;
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
     SAMPLE DATA & EXPORT/IMPORT
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
      version: '3.2-permanent',
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

/* ==========================================================================
   CLOUD SYNC MODULE — MongoDB Atlas via Express Backend
   Non-blocking cloud persistence with offline fallback.
   ========================================================================== */

const CLOUD_API_BASE = 'http://localhost:3001/api';

const CloudSync = {
  _status: 'offline',   // 'connected', 'syncing', 'offline', 'error'
  _lastSync: null,
  _isSyncing: false,
  _serverAvailable: false,

  /**
   * Get current cloud status
   */
  getStatus() {
    return this._status;
  },

  /**
   * Get last sync timestamp
   */
  getLastSyncTime() {
    return this._lastSync;
  },

  /**
   * Set status and update UI
   */
  _setStatus(status) {
    this._status = status;
    this._updateUI();
  },

  /**
   * Check if the backend server is reachable
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${CLOUD_API_BASE}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        this._serverAvailable = data.status === 'ok' && data.database === 'connected';
        this._setStatus(this._serverAvailable ? 'connected' : 'error');
        return this._serverAvailable;
      }
      this._serverAvailable = false;
      this._setStatus('error');
      return false;
    } catch (err) {
      this._serverAvailable = false;
      this._setStatus('offline');
      return false;
    }
  },

  /**
   * Initialize cloud sync — check server health, then pull cloud data
   */
  async init() {
    const isAvailable = await this.checkHealth();
    if (isAvailable) {
      await this.syncFromCloud();
    }
    this._initUIControls();
  },

  /**
   * Full sync: push local data to cloud, then pull merged result
   */
  async fullSync() {
    if (this._isSyncing) return;
    this._isSyncing = true;
    this._setStatus('syncing');

    try {
      const isAvailable = await this.checkHealth();
      if (!isAvailable) {
        this._isSyncing = false;
        return;
      }

      // Collect all local data
      const localExpenses = StorageService.getExpenses();
      const localProfile = StorageService.getUserProfile();
      const localBudget = StorageService.getBudget();
      const localCurrency = StorageService.getCurrency();

      const res = await fetch(`${CLOUD_API_BASE}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenses: localExpenses,
          profile: localProfile,
          budget: localBudget,
          currency: localCurrency.code
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Update local storage with cloud-merged data
          if (data.expenses && Array.isArray(data.expenses)) {
            StorageService._setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(data.expenses));
          }
          if (data.userData) {
            if (data.userData.profile) {
              StorageService._setItem(STORAGE_KEYS.PROFILE, JSON.stringify(data.userData.profile));
            }
            if (data.userData.budget) {
              StorageService._setItem(STORAGE_KEYS.BUDGET, JSON.stringify(data.userData.budget));
            }
            if (data.userData.currency && CURRENCIES[data.userData.currency]) {
              StorageService._setItem(STORAGE_KEYS.CURRENCY, data.userData.currency);
            }
          }

          this._lastSync = new Date();
          this._setStatus('connected');

          console.info('☁️ Cloud sync complete:', data.stats);
        }
      } else {
        this._setStatus('error');
      }
    } catch (err) {
      console.warn('Cloud full sync failed:', err);
      this._setStatus('offline');
    }

    this._isSyncing = false;
  },

  /**
   * Pull data from cloud (on startup)
   */
  async syncFromCloud() {
    if (!this._serverAvailable) return;
    this._setStatus('syncing');

    try {
      // Fetch cloud expenses
      const expRes = await fetch(`${CLOUD_API_BASE}/expenses`);
      if (expRes.ok) {
        const expData = await expRes.json();
        if (expData.success && Array.isArray(expData.expenses) && expData.expenses.length > 0) {
          // Cloud has data — use it (cloud is source of truth)
          StorageService._setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expData.expenses));
          console.info(`☁️ Pulled ${expData.expenses.length} expenses from cloud.`);
        } else {
          // Cloud is empty — push local data up
          const localExpenses = StorageService.getExpenses();
          if (localExpenses.length > 0) {
            await this._pushAllExpenses(localExpenses);
            console.info(`☁️ Pushed ${localExpenses.length} local expenses to cloud.`);
          }
        }
      }

      // Fetch cloud user data
      const userRes = await fetch(`${CLOUD_API_BASE}/userdata`);
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.success && userData.data) {
          if (userData.data.profile && !userData.data.profile.isDefault) {
            StorageService._setItem(STORAGE_KEYS.PROFILE, JSON.stringify(userData.data.profile));
          }
          if (userData.data.budget) {
            StorageService._setItem(STORAGE_KEYS.BUDGET, JSON.stringify(userData.data.budget));
          }
          if (userData.data.currency && CURRENCIES[userData.data.currency]) {
            StorageService._setItem(STORAGE_KEYS.CURRENCY, userData.data.currency);
          }
        }
      }

      this._lastSync = new Date();
      this._setStatus('connected');
    } catch (err) {
      console.warn('Cloud pull failed:', err);
      this._setStatus('offline');
    }
  },

  /**
   * Push a single expense to cloud (called after addExpense)
   */
  async pushExpense(expense) {
    if (!this._serverAvailable) return;
    try {
      await fetch(`${CLOUD_API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
    } catch (err) {
      console.warn('Cloud push expense failed:', err);
    }
  },

  /**
   * Update an expense in cloud
   */
  async updateCloudExpense(expense) {
    if (!this._serverAvailable) return;
    try {
      await fetch(`${CLOUD_API_BASE}/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
    } catch (err) {
      console.warn('Cloud update expense failed:', err);
    }
  },

  /**
   * Delete an expense from cloud
   */
  async deleteCloudExpense(id) {
    if (!this._serverAvailable) return;
    try {
      await fetch(`${CLOUD_API_BASE}/expenses/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Cloud delete expense failed:', err);
    }
  },

  /**
   * Delete all expenses from cloud
   */
  async clearCloudExpenses() {
    if (!this._serverAvailable) return;
    try {
      await fetch(`${CLOUD_API_BASE}/expenses`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Cloud clear expenses failed:', err);
    }
  },

  /**
   * Push user data (profile, budget, currency) to cloud
   */
  async pushUserData() {
    if (!this._serverAvailable) return;
    try {
      const profile = StorageService.getUserProfile();
      const budget = StorageService.getBudget();
      const currency = StorageService.getCurrency();

      await fetch(`${CLOUD_API_BASE}/userdata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          budget,
          currency: currency.code
        })
      });
    } catch (err) {
      console.warn('Cloud push user data failed:', err);
    }
  },

  /**
   * Push all expenses to cloud (bulk upsert)
   */
  async _pushAllExpenses(expenses) {
    for (const exp of expenses) {
      try {
        await fetch(`${CLOUD_API_BASE}/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exp)
        });
      } catch (err) {
        // Continue with next
      }
    }
  },

  /**
   * Update the cloud sync UI elements
   */
  _updateUI() {
    // Header dot
    const headerDot = document.getElementById('cloudSyncDot');
    const headerBtn = document.getElementById('cloudSyncBtn');
    // Card elements
    const cardDot = document.getElementById('cloudStatusDot');
    const cardLabel = document.getElementById('cloudStatusLabel');
    const cardDesc = document.getElementById('cloudStatusDesc');
    const lastSyncEl = document.getElementById('lastSyncTime');
    const syncBtn = document.getElementById('syncNowBtn');

    const statusConfig = {
      connected: {
        dotClass: 'bg-emerald-500',
        label: 'MongoDB Cloud Sync — Connected',
        desc: 'Your data is synced with MongoDB Atlas. Changes are saved to the cloud automatically.',
        title: 'Cloud Sync: Connected ✓',
        animate: false
      },
      syncing: {
        dotClass: 'bg-amber-400',
        label: 'MongoDB Cloud Sync — Syncing...',
        desc: 'Syncing data with MongoDB Atlas...',
        title: 'Cloud Sync: Syncing...',
        animate: true
      },
      offline: {
        dotClass: 'bg-slate-400',
        label: 'MongoDB Cloud Sync — Offline',
        desc: 'Backend server not reachable. Data is saved locally. Start the server to enable cloud sync.',
        title: 'Cloud Sync: Offline — Start server with npm start',
        animate: false
      },
      error: {
        dotClass: 'bg-rose-500',
        label: 'MongoDB Cloud Sync — Error',
        desc: 'Connected to server but MongoDB is not responding. Check your .env configuration.',
        title: 'Cloud Sync: Database Error',
        animate: false
      }
    };

    const config = statusConfig[this._status] || statusConfig.offline;

    // Update header dot
    if (headerDot) {
      headerDot.className = `absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 transition-colors ${config.dotClass}`;
      if (config.animate) headerDot.classList.add('animate-pulse');
    }
    if (headerBtn) {
      headerBtn.title = config.title;
    }

    // Update card
    if (cardDot) {
      cardDot.className = `inline-block w-2.5 h-2.5 rounded-full transition-colors ${config.dotClass}`;
      if (config.animate) cardDot.classList.add('animate-pulse');
    }
    if (cardLabel) cardLabel.textContent = config.label;
    if (cardDesc) cardDesc.textContent = config.desc;

    // Update last sync time
    if (lastSyncEl && this._lastSync) {
      const timeStr = this._lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      lastSyncEl.textContent = `Last synced: ${timeStr}`;
    }

    // Update sync button
    if (syncBtn) {
      if (this._isSyncing) {
        syncBtn.disabled = true;
        syncBtn.classList.add('opacity-60', 'cursor-not-allowed');
      } else {
        syncBtn.disabled = false;
        syncBtn.classList.remove('opacity-60', 'cursor-not-allowed');
      }
    }

    // Re-render lucide icons if available
    if (window.lucide) {
      try { lucide.createIcons(); } catch (e) { /* ignore */ }
    }
  },

  /**
   * Initialize UI controls (Sync Now button, header cloud button)
   */
  _initUIControls() {
    const syncNowBtn = document.getElementById('syncNowBtn');
    if (syncNowBtn) {
      syncNowBtn.addEventListener('click', async () => {
        await this.fullSync();
        // Reload app state after sync
        if (typeof AppState !== 'undefined' && typeof renderApp === 'function') {
          AppState.expenses = StorageService.getExpenses();
          AppState.currency = StorageService.getCurrency();
          renderApp();
        }
        if (typeof showToast === 'function') {
          if (this._status === 'connected') {
            showToast('Cloud sync completed successfully! ☁️');
          } else if (this._status === 'offline') {
            showToast('Server offline — data saved locally only.', 'error');
          } else {
            showToast('Sync encountered an issue. Check server logs.', 'error');
          }
        }
      });
    }

    const headerCloudBtn = document.getElementById('cloudSyncBtn');
    if (headerCloudBtn) {
      headerCloudBtn.addEventListener('click', async () => {
        await this.fullSync();
        if (typeof AppState !== 'undefined' && typeof renderApp === 'function') {
          AppState.expenses = StorageService.getExpenses();
          AppState.currency = StorageService.getCurrency();
          renderApp();
        }
      });
    }
  }
};

/* ==========================================================================
   MONKEY-PATCH StorageService to auto-sync changes to cloud
   ========================================================================== */

// Store original methods
const _originalAddExpense = StorageService.addExpense.bind(StorageService);
const _originalUpdateExpense = StorageService.updateExpense.bind(StorageService);
const _originalDeleteExpense = StorageService.deleteExpense.bind(StorageService);
const _originalClearAllExpenses = StorageService.clearAllExpenses.bind(StorageService);
const _originalSaveUserProfile = StorageService.saveUserProfile.bind(StorageService);
const _originalSaveBudget = StorageService.saveBudget.bind(StorageService);
const _originalSaveCurrency = StorageService.saveCurrency.bind(StorageService);

// Override with cloud-syncing versions
StorageService.addExpense = function(expense) {
  const result = _originalAddExpense(expense);
  if (result) {
    CloudSync.pushExpense(result).catch(() => {});
  }
  return result;
};

StorageService.updateExpense = function(updatedExpense) {
  const result = _originalUpdateExpense(updatedExpense);
  if (result) {
    CloudSync.updateCloudExpense(result).catch(() => {});
  }
  return result;
};

StorageService.deleteExpense = function(id) {
  const result = _originalDeleteExpense(id);
  if (result) {
    CloudSync.deleteCloudExpense(id).catch(() => {});
  }
  return result;
};

StorageService.clearAllExpenses = function() {
  const result = _originalClearAllExpenses();
  CloudSync.clearCloudExpenses().catch(() => {});
  return result;
};

StorageService.saveUserProfile = function(profile) {
  const result = _originalSaveUserProfile(profile);
  CloudSync.pushUserData().catch(() => {});
  return result;
};

StorageService.saveBudget = function(budget) {
  const result = _originalSaveBudget(budget);
  CloudSync.pushUserData().catch(() => {});
  return result;
};

StorageService.saveCurrency = function(currencyCode) {
  const result = _originalSaveCurrency(currencyCode);
  CloudSync.pushUserData().catch(() => {});
  return result;
};

// Override init to include cloud sync
const _originalInit = StorageService.init.bind(StorageService);
StorageService.init = async function() {
  await _originalInit();
  await CloudSync.init();
};


/**
 * Storage & Data Management Module for Student Personal Expense Calculator
 */

const STORAGE_KEYS = {
  EXPENSES: 'student_expenses_v2',
  BUDGET: 'student_budget_v2',
  CURRENCY: 'student_currency_v2',
  THEME: 'student_theme_v2'
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

const StorageService = {
  getExpenses() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading expenses from storage:', e);
      return [];
    }
  },

  saveExpenses(expenses) {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
      return true;
    } catch (e) {
      console.error('Error saving expenses:', e);
      return false;
    }
  },

  addExpense(expense) {
    const expenses = this.getExpenses();
    const newExpense = {
      id: expense.id || 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
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

  updateExpense(updatedExpense) {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => e.id === updatedExpense.id);
    if (index !== -1) {
      expenses[index] = {
        ...expenses[index],
        name: (updatedExpense.name || expenses[index].name).trim(),
        amount: Math.max(0, parseFloat(updatedExpense.amount) || 0),
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

  deleteExpense(id) {
    let expenses = this.getExpenses();
    const initialCount = expenses.length;
    expenses = expenses.filter(e => e.id !== id);
    if (expenses.length !== initialCount) {
      this.saveExpenses(expenses);
      return true;
    }
    return false;
  },

  clearAllExpenses() {
    try {
      localStorage.removeItem(STORAGE_KEYS.EXPENSES);
      return true;
    } catch (e) {
      return false;
    }
  },

  getBudget() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BUDGET);
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

  saveBudget(budget) {
    try {
      localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify(budget));
      return true;
    } catch (e) {
      return false;
    }
  },

  getCurrency() {
    try {
      const code = localStorage.getItem(STORAGE_KEYS.CURRENCY) || 'INR';
      return CURRENCIES[code] || CURRENCIES.INR;
    } catch (e) {
      return CURRENCIES.INR;
    }
  },

  saveCurrency(currencyCode) {
    if (CURRENCIES[currencyCode]) {
      localStorage.setItem(STORAGE_KEYS.CURRENCY, currencyCode);
      return true;
    }
    return false;
  },

  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  },

  saveTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  seedDemoStudentData() {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth(); // 0-indexed (7 for August)
    const day = today.getDate();

    // Helper to format specific date
    const formatDate = (year, monthIndex, dayNum) => {
      const targetM = String(monthIndex + 1).padStart(2, '0');
      const targetD = String(dayNum).padStart(2, '0');
      return `${year}-${targetM}-${targetD}`;
    };

    const sampleExpenses = [
      // ----------------------------------------------------
      // AUGUST 2026 (Current Month)
      // ----------------------------------------------------
      {
        id: 'exp_aug_1',
        name: 'Sharma Ji Canteen - Rajma Chawal Thali',
        amount: 120.00,
        category: 'Food',
        date: formatDate(y, m, Math.min(day, 26)),
        paymentMethod: 'UPI / Online',
        description: 'Lunch thali with extra butter roti and sweet lassi at campus canteen',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_aug_2',
        name: 'Tapri Chai & Samosa after Lab',
        amount: 45.00,
        category: 'Food',
        date: formatDate(y, m, Math.min(day, 26)),
        paymentMethod: 'UPI / Online',
        description: 'Adrak cutting chai and 2 hot samosas with classmates',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_aug_3',
        name: 'Auto share to Metro Station',
        amount: 50.00,
        category: 'Travel',
        date: formatDate(y, m, Math.max(1, day - 1)),
        paymentMethod: 'UPI / Online',
        description: '4-way shared e-rickshaw from hostel gate to yellow line metro',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_aug_4',
        name: 'Monthly Metro Smart Card Recharge',
        amount: 600.00,
        category: 'Travel',
        date: formatDate(y, m, 5),
        paymentMethod: 'UPI / Online',
        description: 'Student daily commute card top-up for the whole month',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_aug_5',
        name: 'Engineering Books & Lab Manual Xerox',
        amount: 950.00,
        category: 'Education',
        date: formatDate(y, m, 8),
        paymentMethod: 'Debit Card',
        description: 'Semester 5 reference book and spiral binding for lab reports',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_aug_6',
        name: 'Room 304 WiFi Bill (4-way split)',
        amount: 499.00,
        category: 'Bills',
        date: formatDate(y, m, 10),
        paymentMethod: 'UPI / Online',
        description: 'My quarter share of 200Mbps unlimited fiber router connection',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_aug_7',
        name: 'Hostel Ration - Maggi, Milk & Peanut Butter',
        amount: 1450.00,
        category: 'Food',
        date: formatDate(y, m, 12),
        paymentMethod: 'UPI / Online',
        description: 'Oats, milk carton, 12-pack Maggi noodles, bread and coffee pouch',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_aug_8',
        name: 'Movie Night @ PVR with Roommates',
        amount: 350.00,
        category: 'Entertainment',
        date: formatDate(y, m, 15),
        paymentMethod: 'UPI / Online',
        description: 'Student concession movie ticket and salted popcorn split',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_aug_9',
        name: 'College Gym Monthly Fee',
        amount: 500.00,
        category: 'Health',
        date: formatDate(y, m, 3),
        paymentMethod: 'UPI / Online',
        description: 'Campus sports complex gym and badminton court pass',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_aug_10',
        name: 'Department Fest Hoodie',
        amount: 1299.00,
        category: 'Shopping',
        date: formatDate(y, m, 18),
        paymentMethod: 'Debit Card',
        description: 'Official department tech fest custom hoodie and lanyard',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_aug_11',
        name: 'Pharmacy - Cold Strips & Paracetamol',
        amount: 220.00,
        category: 'Health',
        date: formatDate(y, m, 20),
        paymentMethod: 'Cash',
        description: 'Medicines from campus medical store for viral cold',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_aug_12',
        name: 'Hostel Washing Machine Card Recharge',
        amount: 180.00,
        category: 'Other',
        date: formatDate(y, m, 22),
        paymentMethod: 'Student Wallet',
        description: 'Smartcard top-up for 6 laundry washing cycles',
        createdAt: new Date().toISOString()
      },

      // ----------------------------------------------------
      // JULY 2026
      // ----------------------------------------------------
      {
        id: 'exp_jul_1',
        name: 'Semester College Registration & Exam Fee',
        amount: 2500.00,
        category: 'Education',
        date: formatDate(y, 6, 4), // July 4
        paymentMethod: 'Debit Card',
        description: 'Online semester registration portal fee receipt',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_jul_2',
        name: 'Hostel Mess Advance Deposit',
        amount: 3800.00,
        category: 'Food',
        date: formatDate(y, 6, 2), // July 2
        paymentMethod: 'UPI / Online',
        description: 'Monthly unlimited breakfast, lunch, and dinner meal pass',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_jul_3',
        name: 'Monsoon Big Umbrella & Raincoat',
        amount: 450.00,
        category: 'Shopping',
        date: formatDate(y, 6, 7), // July 7
        paymentMethod: 'Cash',
        description: 'Windproof umbrella for walking between academic blocks',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_jul_4',
        name: 'July Metro Pass Recharge',
        amount: 600.00,
        category: 'Travel',
        date: formatDate(y, 6, 1), // July 1
        paymentMethod: 'UPI / Online',
        description: 'Monthly student transit card reload',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_jul_5',
        name: 'Late Night Dominos Pizza Split',
        amount: 380.00,
        category: 'Food',
        date: formatDate(y, 6, 16), // July 16
        paymentMethod: 'UPI / Online',
        description: 'Celebrated hackathon submission with wing mates',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_jul_6',
        name: 'Notebooks, Pens & Stationery Pack',
        amount: 320.00,
        category: 'Education',
        date: formatDate(y, 6, 12), // July 12
        paymentMethod: 'UPI / Online',
        description: '5 subject registers, sticky notes, and gel pens for new semester',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_jul_7',
        name: 'Hostel WiFi Split (July)',
        amount: 499.00,
        category: 'Bills',
        date: formatDate(y, 6, 10), // July 10
        paymentMethod: 'UPI / Online',
        description: 'Monthly optical fiber bill contribution',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_jul_8',
        name: 'Haircut & Grooming @ Campus Salon',
        amount: 150.00,
        category: 'Other',
        date: formatDate(y, 6, 24), // July 24
        paymentMethod: 'UPI / Online',
        description: 'Haircut and head massage before semester interview',
        createdAt: new Date().toISOString()
      },

      // ----------------------------------------------------
      // JUNE 2026
      // ----------------------------------------------------
      {
        id: 'exp_jun_1',
        name: 'Summer Internship Travel Train & Cab',
        amount: 1200.00,
        category: 'Travel',
        date: formatDate(y, 5, 2), // June 2
        paymentMethod: 'UPI / Online',
        description: 'Daily express bus and metro travel for tech internship',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_jun_2',
        name: 'Laptop 65W Fast Type-C Charger',
        amount: 1150.00,
        category: 'Education',
        date: formatDate(y, 5, 14), // June 14
        paymentMethod: 'Debit Card',
        description: 'Replaced frayed original laptop power brick',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_jun_3',
        name: 'Street Momos & Cold Coffee with Gang',
        amount: 180.00,
        category: 'Food',
        date: formatDate(y, 5, 18), // June 18
        paymentMethod: 'UPI / Online',
        description: 'Evening treat after internship project completion',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_jun_4',
        name: 'Quarterly Mobile Recharge (84 Days)',
        amount: 719.00,
        category: 'Bills',
        date: formatDate(y, 5, 8), // June 8
        paymentMethod: 'UPI / Online',
        description: 'Jio 2GB/day unlimited 5G student data plan',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_jun_5',
        name: 'Cloud Developer Certification Voucher',
        amount: 899.00,
        category: 'Education',
        date: formatDate(y, 5, 22), // June 22
        paymentMethod: 'Credit Card',
        description: 'Student discount exam voucher for AWS cloud badge',
        createdAt: new Date().toISOString()
      },

      // ----------------------------------------------------
      // MAY 2026
      // ----------------------------------------------------
      {
        id: 'exp_may_1',
        name: 'End-Semester Exam Photocopies',
        amount: 280.00,
        category: 'Education',
        date: formatDate(y, 4, 10), // May 10
        paymentMethod: 'Cash',
        description: 'Previous 5 years question papers & solved answer bank',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_may_2',
        name: 'Farewell Dinner Buffet with Seniors',
        amount: 650.00,
        category: 'Food',
        date: formatDate(y, 4, 25), // May 25
        paymentMethod: 'UPI / Online',
        description: 'Department annual farewell party banquet share',
        createdAt: new Date().toISOString()
      },
      {
        id: 'exp_may_3',
        name: 'Train Ticket Home for Summer Vacation',
        amount: 850.00,
        category: 'Travel',
        date: formatDate(y, 4, 28), // May 28
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

    return sampleExpenses;
  },

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

  importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.expenses)) {
        this.saveExpenses(data.expenses);
        if (data.budget) this.saveBudget(data.budget);
        if (data.currency && CURRENCIES[data.currency]) this.saveCurrency(data.currency);
        return { success: true, count: data.expenses.length };
      }
      return { success: false, error: 'Invalid file: missing expenses array' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};

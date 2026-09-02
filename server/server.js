/**
 * CampusSpend Backend Server
 * Express + Mongoose → MongoDB Atlas (Free M0 Tier)
 * Proxies all database operations, keeping credentials secure server-side.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const Expense = require('./models/Expense');
const UserData = require('./models/UserData');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Serve the frontend static files from the parent directory
app.use(express.static(path.join(__dirname, '..')));

// ── MongoDB Connection ───────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env file!');
  console.error('   Copy .env.example to .env and add your MongoDB Atlas connection string.');
  process.exit(1);
}

// Support separate credentials to avoid URI-encoding issues with special chars
const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASS = process.env.MONGO_PASS;
const MONGO_HOST = process.env.MONGO_HOST;

let connectUri = MONGODB_URI;
let connectOpts = {};

// If separate credentials are provided, build the URI cleanly
if (MONGO_USER && MONGO_PASS && MONGO_HOST) {
  connectUri = `mongodb+srv://${MONGO_HOST}/campusspend?retryWrites=true&w=majority&appName=Cluster0`;
  connectOpts = {
    user: MONGO_USER,
    pass: MONGO_PASS
  };
}

mongoose.connect(connectUri, connectOpts)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully!');
  })
  .catch((err) => {
    console.error('⚠️  MongoDB connection failed:', err.message);
    console.error('   The app will work with local storage. Fix your .env to enable cloud sync.');
  });

// Log connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
});
mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected!');
});

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    
    res.json({
      status: state === 1 ? 'ok' : 'error',
      database: states[state] || 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  EXPENSE ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/expenses — Fetch all expenses (sorted by date descending)
 */
app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await Expense.find({}).sort({ date: -1, createdAt: -1 }).lean();
    
    // Map MongoDB documents to the frontend format
    const mapped = expenses.map(e => ({
      id: e.expenseId,
      name: e.name,
      amount: e.amount,
      category: e.category,
      date: e.date,
      paymentMethod: e.paymentMethod,
      description: e.description,
      createdAt: e.createdAt
    }));
    
    res.json({ success: true, expenses: mapped, count: mapped.length });
  } catch (err) {
    console.error('GET /api/expenses error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/expenses — Add a new expense
 */
app.post('/api/expenses', async (req, res) => {
  try {
    const { id, name, amount, category, date, paymentMethod, description, createdAt } = req.body;
    
    if (!name || amount === undefined) {
      return res.status(400).json({ success: false, error: 'Name and amount are required.' });
    }
    
    const expenseId = id || 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    
    // Upsert: if expense with this ID already exists, update it; otherwise create
    const expense = await Expense.findOneAndUpdate(
      { expenseId },
      {
        expenseId,
        name: (name || 'Untitled Expense').trim(),
        amount: Math.max(0, parseFloat(amount) || 0),
        category: category || 'Other',
        date: date || new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod || 'UPI / Online',
        description: (description || '').trim(),
        createdAt: createdAt ? new Date(createdAt) : new Date(),
        updatedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    res.json({
      success: true,
      expense: {
        id: expense.expenseId,
        name: expense.name,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        paymentMethod: expense.paymentMethod,
        description: expense.description,
        createdAt: expense.createdAt
      }
    });
  } catch (err) {
    console.error('POST /api/expenses error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/expenses/:id — Update an existing expense
 */
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const expense = await Expense.findOneAndUpdate(
      { expenseId: id },
      {
        ...updates,
        name: updates.name ? updates.name.trim() : undefined,
        amount: updates.amount !== undefined ? Math.max(0, parseFloat(updates.amount) || 0) : undefined,
        description: updates.description !== undefined ? updates.description.trim() : undefined,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }
    
    res.json({
      success: true,
      expense: {
        id: expense.expenseId,
        name: expense.name,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        paymentMethod: expense.paymentMethod,
        description: expense.description,
        createdAt: expense.createdAt
      }
    });
  } catch (err) {
    console.error('PUT /api/expenses/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/expenses/:id — Delete a single expense
 */
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Expense.findOneAndDelete({ expenseId: id });
    
    if (!result) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }
    
    res.json({ success: true, deleted: id });
  } catch (err) {
    console.error('DELETE /api/expenses/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/expenses — Delete ALL expenses
 */
app.delete('/api/expenses', async (req, res) => {
  try {
    const result = await Expense.deleteMany({});
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('DELETE /api/expenses error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  USER DATA ENDPOINTS (Profile, Budget, Currency)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/userdata — Fetch user profile, budget, and currency
 */
app.get('/api/userdata', async (req, res) => {
  try {
    let userData = await UserData.findOne({ userId: 'default' }).lean();
    
    if (!userData) {
      // Return defaults if no user data exists yet
      return res.json({
        success: true,
        data: {
          profile: {
            name: 'Rishav Raj',
            id: 'STU-2026',
            tag: 'College Student',
            budget: 12000,
            avatarColor: '#6366f1',
            isDefault: true
          },
          budget: {
            monthlyLimit: 12000,
            alertsEnabled: true,
            categoryLimits: {}
          },
          currency: 'INR'
        }
      });
    }
    
    // Convert Map to plain object for categoryLimits
    const budgetObj = userData.budget ? {
      monthlyLimit: userData.budget.monthlyLimit,
      alertsEnabled: userData.budget.alertsEnabled,
      categoryLimits: userData.budget.categoryLimits instanceof Map
        ? Object.fromEntries(userData.budget.categoryLimits)
        : (userData.budget.categoryLimits || {})
    } : { monthlyLimit: 12000, alertsEnabled: true, categoryLimits: {} };
    
    res.json({
      success: true,
      data: {
        profile: userData.profile || {},
        budget: budgetObj,
        currency: userData.currency || 'INR'
      }
    });
  } catch (err) {
    console.error('GET /api/userdata error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/userdata — Save user profile, budget, and currency
 */
app.put('/api/userdata', async (req, res) => {
  try {
    const { profile, budget, currency } = req.body;
    
    const updateData = { updatedAt: new Date() };
    if (profile) updateData.profile = profile;
    if (budget) updateData.budget = budget;
    if (currency) updateData.currency = currency;
    
    const userData = await UserData.findOneAndUpdate(
      { userId: 'default' },
      updateData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    res.json({ success: true, data: userData });
  } catch (err) {
    console.error('PUT /api/userdata error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  FULL SYNC ENDPOINT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/sync — Full sync: receive all local data, merge with cloud
 * Strategy: Cloud is source of truth for conflicts, but new local items are added.
 */
app.post('/api/sync', async (req, res) => {
  try {
    const { expenses: localExpenses, profile, budget, currency } = req.body;
    
    let syncedExpenses = [];
    let newCount = 0;
    let updatedCount = 0;
    
    // Sync expenses
    if (Array.isArray(localExpenses)) {
      // Get all existing cloud expense IDs
      const cloudExpenses = await Expense.find({}).lean();
      const cloudExpenseMap = new Map(cloudExpenses.map(e => [e.expenseId, e]));
      
      for (const localExp of localExpenses) {
        const expId = localExp.id || localExp.expenseId;
        if (!expId) continue;
        
        const existing = cloudExpenseMap.get(expId);
        
        if (!existing) {
          // New expense — add to cloud
          try {
            await Expense.create({
              expenseId: expId,
              name: (localExp.name || 'Untitled').trim(),
              amount: Math.max(0, parseFloat(localExp.amount) || 0),
              category: localExp.category || 'Other',
              date: localExp.date || new Date().toISOString().split('T')[0],
              paymentMethod: localExp.paymentMethod || 'UPI / Online',
              description: (localExp.description || '').trim(),
              createdAt: localExp.createdAt ? new Date(localExp.createdAt) : new Date()
            });
            newCount++;
          } catch (dupErr) {
            // Duplicate key error — skip
            if (dupErr.code !== 11000) console.warn('Sync create warning:', dupErr.message);
          }
        }
        // If it exists in cloud, cloud version wins (source of truth)
      }
      
      // Fetch final state from cloud
      const allExpenses = await Expense.find({}).sort({ date: -1, createdAt: -1 }).lean();
      syncedExpenses = allExpenses.map(e => ({
        id: e.expenseId,
        name: e.name,
        amount: e.amount,
        category: e.category,
        date: e.date,
        paymentMethod: e.paymentMethod,
        description: e.description,
        createdAt: e.createdAt
      }));
    }
    
    // Sync user data (profile, budget, currency)
    if (profile || budget || currency) {
      const existingUser = await UserData.findOne({ userId: 'default' }).lean();
      
      if (!existingUser) {
        // No cloud data — push local data to cloud
        await UserData.create({
          userId: 'default',
          profile: profile || {},
          budget: budget || { monthlyLimit: 12000, alertsEnabled: true, categoryLimits: {} },
          currency: currency || 'INR'
        });
      }
      // If cloud data exists, it stays (cloud is source of truth)
    }
    
    // Fetch final user data
    let userData = await UserData.findOne({ userId: 'default' }).lean();
    let budgetObj = {};
    if (userData && userData.budget) {
      budgetObj = {
        monthlyLimit: userData.budget.monthlyLimit,
        alertsEnabled: userData.budget.alertsEnabled,
        categoryLimits: userData.budget.categoryLimits instanceof Map
          ? Object.fromEntries(userData.budget.categoryLimits)
          : (userData.budget.categoryLimits || {})
      };
    }
    
    res.json({
      success: true,
      expenses: syncedExpenses,
      userData: userData ? {
        profile: userData.profile,
        budget: budgetObj,
        currency: userData.currency
      } : null,
      stats: {
        totalExpenses: syncedExpenses.length,
        newFromLocal: newCount,
        updatedFromLocal: updatedCount
      }
    });
  } catch (err) {
    console.error('POST /api/sync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Fallback: serve index.html for root ──────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  🎓 CampusSpend Server Running!');
  console.log(`  🌐 http://localhost:${PORT}`);
  console.log(`  📡 API: http://localhost:${PORT}/api/health`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
});

// charts.js - Charts page logic

import { SAMPLE_DATA } from '../example/example.js';

let data = {
  transactions: [],
  categories: { income: [], expense: [] },
  paymentMethods: [],
  banks: [],
  goals: [],
  recurringRules: []
};

function loadData() {
  const stored = localStorage.getItem('talousData');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      data.transactions = parsed.transactions || [];
      data.categories = parsed.categories || { income: [], expense: [] };
      data.paymentMethods = parsed.paymentMethods || [];
      data.banks = parsed.banks || [];
      data.goals = parsed.goals || [];
      data.recurringRules = parsed.recurringRules || [];
    } catch (e) {
      console.error('Error loading data, falling back to sample:', e);
      const fallback = JSON.parse(JSON.stringify(SAMPLE_DATA));
      data.transactions = fallback.transactions || [];
      data.categories = fallback.categories || { income: [], expense: [] };
      data.paymentMethods = fallback.paymentMethods || [];
      data.banks = fallback.banks || [];
      data.goals = fallback.goals || [];
      data.recurringRules = fallback.recurringRules || [];
      localStorage.setItem('talousData', JSON.stringify(fallback));
    }
  } else {
    const fallback = JSON.parse(JSON.stringify(SAMPLE_DATA));
    data.transactions = fallback.transactions || [];
    data.categories = fallback.categories || { income: [], expense: [] };
    data.paymentMethods = fallback.paymentMethods || [];
    data.banks = fallback.banks || [];
    data.goals = fallback.goals || [];
    data.recurringRules = fallback.recurringRules || [];
    localStorage.setItem('talousData', JSON.stringify(fallback));
  }
  renderCharts();
}

function nextMonthlyDate(fromDate, day){
  const cur = new Date(fromDate);
  cur.setMonth(cur.getMonth()+1);
  const max = new Date(cur.getFullYear(), cur.getMonth()+1, 0).getDate();
  cur.setDate(Math.min(day, max));
  return cur.toISOString().split('T')[0];
}

// Recurring application disabled in current version (logic moved to Tools manual execution)
function applyRecurringDue(){ /* intentionally empty */ }

// Get chart colours based on theme
function getChartColours() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text: isDark ? '#ffffff' : '#000000',
    grid: isDark ? '#333333' : '#e0e0e0',
    positive: '#00d084',
    negative: '#ff0000',
    crypto: '#ffd700'
  };
}

// Generate random colours for pie charts
function generateColours(count) {
  const colours = [
    '#2E86DE', '#27AE60', '#E74C3C', '#F39C12', '#9B59B6',
    '#1ABC9C', '#34495E', '#E67E22', '#3498DB', '#95A5A6'
  ];
  return colours.slice(0, count);
}

// Build quick lookup maps
function buildIndexes() {
  const catsIncome = Object.fromEntries((data.categories.income||[]).map(c => [c.id, c]));
  const catsExpense = Object.fromEntries((data.categories.expense||[]).map(c => [c.id, c]));
  const methods = Object.fromEntries((data.paymentMethods||[]).map(m => [m.id, m]));
  const accounts = Object.fromEntries((data.banks||[]).map(a => [a.id, a]));
  return { catsIncome, catsExpense, methods, accounts };
}

function categoryNameFor(txn, idx) {
  if (!txn) return 'Other';
  // Prefer ID-based lookup; fallback to legacy string name
  if (txn.categoryId) {
    if (txn.type === 'income') return idx.catsIncome[txn.categoryId]?.name || 'Other';
    if (txn.type === 'expense') return idx.catsExpense[txn.categoryId]?.name || 'Other';
  }
  if (txn.category) return txn.category;
  return 'Other';
}

function methodTypeFor(txn, idx) {
  if (!txn || !txn.methodId) return 'Other';
  const m = idx.methods[txn.methodId];
  const raw = m?.type || 'other';
  const map = { card: 'Card', cash: 'Cash', wallet: 'Wallet', crypto: 'Crypto', other: 'Other' };
  return map[raw] || (raw.charAt(0).toUpperCase() + raw.slice(1));
}

function aggregateByCategory(type) {
  const idx = buildIndexes();
  const list = data.transactions.filter(t => t.type === type);
  const result = {};
  list.forEach(txn => {
    const key = categoryNameFor(txn, idx);
    result[key] = (result[key] || 0) + txn.amount;
  });
  return result;
}

function aggregateByPaymentType(type) {
  const idx = buildIndexes();
  const list = data.transactions.filter(t => t.type === type);
  const result = {};
  list.forEach(txn => {
    const key = methodTypeFor(txn, idx);
    result[key] = (result[key] || 0) + txn.amount;
  });
  return result;
}

function computeHoldings() {
  const idx = buildIndexes();
  const byAccount = {};
  data.transactions.forEach(t => {
    if (t.type === 'income') {
      if (t.accountId) byAccount[t.accountId] = (byAccount[t.accountId] || 0) + t.amount;
    } else if (t.type === 'expense') {
      if (t.accountId) byAccount[t.accountId] = (byAccount[t.accountId] || 0) - t.amount;
    } else if (t.type === 'transfer') {
      if (t.toGoalId) return; // goal earmarks do not change holdings
      if (t.fromAccountId) byAccount[t.fromAccountId] = (byAccount[t.fromAccountId] || 0) - t.amount;
      if (t.toAccountId) byAccount[t.toAccountId] = (byAccount[t.toAccountId] || 0) + t.amount;
    }
  });

  const byType = {};
  const byCurrency = {};
  Object.entries(byAccount).forEach(([accId, amount]) => {
    const acc = idx.accounts[accId];
    const typeKey = acc?.type || 'other';
    const currencyKey = acc?.currency || 'EUR';
    byType[typeKey] = (byType[typeKey] || 0) + amount;
    byCurrency[currencyKey] = (byCurrency[currencyKey] || 0) + amount;
  });

  // Map types to friendly labels
  const labelsMap = {
    bank: 'Bank',
    wallet_physical: 'Wallet (Physical)',
    wallet_online: 'Wallet (Online)',
    crypto: 'Crypto',
    piggy: 'Piggy',
    other: 'Other'
  };
  const byPlace = {};
  Object.entries(byType).forEach(([k, v]) => { byPlace[labelsMap[k] || k] = v; });

  return { byPlace, byCurrency };
}

// Create pie chart
function createPieChart(canvasId, data, title) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  
  const labels = Object.keys(data);
  const values = Object.values(data);
  const colours = generateColours(labels.length);
  const chartColours = getChartColours();
  
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colours,
        borderWidth: 2,
        borderColor: chartColours.text
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: chartColours.text,
            padding: 15
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(context.parsed);
              return `${label}: ${value}`;
            }
          }
        }
      }
    }
  });
}

// Create line chart for trend
function createTrendChart() {
  const ctx = document.getElementById('trend-chart');
  if (!ctx) return;
  
  // Sort transactions by date
  const sorted = [...data.transactions].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );
  
  // Calculate cumulative balance
  let balance = 0;
  const trendData = sorted.map(txn => {
    if (txn.type === 'income') balance += txn.amount;
    else if (txn.type === 'expense') balance -= txn.amount;
    return {
      date: txn.date,
      balance: balance
    };
  });
  
  const chartColours = getChartColours();
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: trendData.map(d => new Date(d.date).toLocaleDateString('it-IT')),
      datasets: [{
        label: 'Balance',
        data: trendData.map(d => d.balance),
        borderColor: chartColours.positive,
        backgroundColor: chartColours.positive + '20',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(context.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: chartColours.text
          },
          grid: {
            color: chartColours.grid
          }
        },
        y: {
          ticks: {
            color: chartColours.text,
            callback: function(value) {
              return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
            }
          },
          grid: {
            color: chartColours.grid
          }
        }
      }
    }
  });
}

// Render all charts
function renderCharts() {
  // Income charts
  const incomeByCategory = aggregateByCategory('income');
  const incomeByPayment = aggregateByPaymentType('income');
  createPieChart('income-category-chart', incomeByCategory, 'Income by Category');
  createPieChart('income-payment-chart', incomeByPayment, 'Income by Payment Type');

  // Expense charts
  const expenseByCategory = aggregateByCategory('expense');
  const expenseByPayment = aggregateByPaymentType('expense');
  createPieChart('expense-category-chart', expenseByCategory, 'Expenses by Category');
  createPieChart('expense-payment-chart', expenseByPayment, 'Expenses by Payment Type');

  // Holdings charts from actual data
  const { byPlace, byCurrency } = computeHoldings();
  createPieChart('holdings-place-chart', byPlace, 'Holdings by Place');
  createPieChart('holdings-currency-chart', byCurrency, 'Holdings by Currency');

  // Trend chart
  createTrendChart();
}

// Theme toggle

// Theme toggle
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    themeToggle.innerHTML = next === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    renderCharts();
  });
}

// Load theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
if (themeToggle) {
  themeToggle.innerHTML = savedTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}

// Initialise
loadData();

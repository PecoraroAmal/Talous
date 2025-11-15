// index.js - Dashboard logic

import { MINIMAL_DATA } from './example/minimal.js';

// Data structure (new schema compatible)
let data = {
  transactions: [],
  categories: { income: [], expense: [] },
  paymentMethods: [],
  banks: [],
  balance: 0,
  recurringRules: []
};

// Load data from localStorage
function loadData() {
  const stored = localStorage.getItem('talousData');
  if (stored) {
    try {
      data = JSON.parse(stored);
    } catch (e) {
      console.error('Error loading data:', e);
    }
  } else {
    // Initialize with minimal data if no data exists
    data = JSON.parse(JSON.stringify(MINIMAL_DATA)); // Deep copy
    saveData();
  }
  applyRecurringDue();
  updateBalance();
  renderRecentTransactions();
}

// Save data to localStorage
function saveData() {
  localStorage.setItem('talousData', JSON.stringify(data));
}

function nextMonthlyDate(fromDate, day){
  const cur = new Date(fromDate);
  cur.setMonth(cur.getMonth()+1);
  const max = new Date(cur.getFullYear(), cur.getMonth()+1, 0).getDate();
  cur.setDate(Math.min(day, max));
  return cur.toISOString().split('T')[0];
}

function applyRecurringDue(){
  if (!Array.isArray(data.recurringRules) || data.recurringRules.length===0) return;
  const today = new Date().toISOString().split('T')[0];
  let added = false;
  const balanceOn=(txs,acc,met)=>{
    let b=0; const a=(data.banks||[]).find(x=>x.id===acc); const shared=a?.sharedBalance;
    txs.forEach(t=>{ if (t.toGoalId) return; if(t.type==='income'&&t.accountId===acc&&(shared||(t.methodId||'')===met)) b+=t.amount; if(t.type==='expense'&&t.accountId===acc&&(shared||(t.methodId||'')===met)) b-=t.amount; if(t.type==='transfer'){ if(t.fromAccountId===acc&&(shared||(t.fromMethodId||'')===met)) b-=t.amount; if(t.toAccountId===acc&&(shared||(t.toMethodId||'')===met)) b+=t.amount; } }); return b; };
  const accountBalanceOn=(txs,acc)=>{ let b=0; txs.forEach(t=>{ if (t.toGoalId) return; if(t.type==='income'&&t.accountId===acc) b+=t.amount; if(t.type==='expense'&&t.accountId===acc) b-=t.amount; if(t.type==='transfer'){ if(t.fromAccountId===acc) b-=t.amount; if(t.toAccountId===acc) b+=t.amount; } }); return b; };
  data.recurringRules.forEach(rule=>{
    let last = rule.lastApplied || rule.startDate;
    if (!last) return;
    let next = last;
    while (next <= today){
      if (rule.frequency==='monthly'){
        next = nextMonthlyDate(next, parseInt(rule.day||'1',10)||1);
      } else if (rule.frequency==='weekly'){
        const dt = new Date(next); dt.setDate(dt.getDate()+7); next = dt.toISOString().split('T')[0];
      } else if (rule.frequency==='yearly'){
        const dt = new Date(next); dt.setFullYear(dt.getFullYear()+1); next = dt.toISOString().split('T')[0];
      } else { break; }
      if (next>today) break;
      const pending = data.transactions.slice();
      if (rule.type==='income'){
        data.transactions.push({ id: Date.now().toString(36)+Math.random().toString(36).substr(2), type: 'income', amount: rule.amount, date: next, accountId: rule.accountId, methodId: rule.methodId||'', category: rule.category||'', note: rule.note||'', source: rule.source||'' });
        added = true; rule.lastApplied = next;
      } else if (rule.type==='expense'){
        if (balanceOn(pending, rule.accountId, rule.methodId||'') >= rule.amount){
          data.transactions.push({ id: Date.now().toString(36)+Math.random().toString(36).substr(2), type: 'expense', amount: rule.amount, date: next, accountId: rule.accountId, methodId: rule.methodId||'', category: rule.category||'', note: rule.note||'' });
          added = true; rule.lastApplied = next;
        } else { break; }
      } else if (rule.type==='transfer'){
        if (balanceOn(pending, rule.fromAccountId, rule.fromMethodId||'') < rule.amount) { break; }
        if (rule.toGoalId){
          const goals = data.goals||[]; const g = goals.find(x=>x.id===rule.toGoalId);
          if (!g || g.accountId!==rule.toAccountId) { break; }
          const destAvail = accountBalanceOn(pending, rule.toAccountId);
          if ((g.current||0) + rule.amount > destAvail) { break; }
          data.transactions.push({ id: Date.now().toString(36)+Math.random().toString(36).substr(2), type: 'transfer', amount: rule.amount, date: next, note: rule.note||'', category: '', fromAccountId: rule.fromAccountId, fromMethodId: rule.fromMethodId||'', toAccountId: rule.toAccountId, toMethodId: rule.toMethodId||'', toGoalId: rule.toGoalId });
          if (g) g.current = (g.current||0) + rule.amount;
          added = true; rule.lastApplied = next;
        } else {
          data.transactions.push({ id: Date.now().toString(36)+Math.random().toString(36).substr(2), type: 'transfer', amount: rule.amount, date: next, note: rule.note||'', category: '', fromAccountId: rule.fromAccountId, fromMethodId: rule.fromMethodId||'', toAccountId: rule.toAccountId, toMethodId: rule.toMethodId||'' });
          added = true; rule.lastApplied = next;
        }
      }
    }
  });
  if (added) saveData();
}

// Calculate balance
function updateBalance() {
  data.balance = data.transactions.reduce((sum, txn) => {
    if (txn.type === 'income') return sum + txn.amount;
    if (txn.type === 'expense') return sum - txn.amount;
    return sum;
  }, 0);
  
  const balanceEl = document.getElementById('current-balance');
  balanceEl.textContent = formatNumber(data.balance);
  balanceEl.className = 'balance ' + (data.balance >= 0 ? 'positive' : 'negative');
}

// Format currency
function formatNumber(amount) {
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

// Format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

// Parse amounts written as 1.234,56 or 1234.106 safely
function parseAmountEU(value){
  if (typeof value === 'number') return value;
  let s=(value||'').toString().trim();
  s=s.replace(/\./g,'').replace(',', '.');
  const n=parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Render recent transactions (last 5 of each type)
function renderRecentTransactions() {
  const income = data.transactions
    .filter(t => t.type === 'income')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  
  const expenses = data.transactions
    .filter(t => t.type === 'expense')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  
  renderTransactionList('recent-income', income);
  renderTransactionList('recent-expenses', expenses);
}

// Render transaction list
function renderTransactionList(elementId, transactions) {
  const list = document.getElementById(elementId);
  if (!list) return;
  const idx = buildIndexes();
  
  if (transactions.length === 0) {
    list.innerHTML = '<li class="transaction-item">No transactions</li>';
    return;
  }
  
  list.innerHTML = transactions.map(txn => `
    <li class="transaction-item">
      <div>
        <div>${categoryNameFor(txn, idx) || 'Uncategorised'}</div>
        <div class="transaction-date">${formatDate(txn.date)}</div>
      </div>
      <div class="transaction-amount ${txn.type}">${formatNumber(txn.amount)}</div>
    </li>
  `).join('');
}

// Helpers to resolve names by ID
function buildIndexes() {
  const catsIncome = Object.fromEntries((data.categories.income||[]).map(c => [c.id, c]));
  const catsExpense = Object.fromEntries((data.categories.expense||[]).map(c => [c.id, c]));
  return { catsIncome, catsExpense };
}

function categoryNameFor(txn, idx) {
  if (!txn) return '';
  if (txn.categoryId) {
    if (txn.type === 'income') return idx.catsIncome[txn.categoryId]?.name || '';
    if (txn.type === 'expense') return idx.catsExpense[txn.categoryId]?.name || '';
  }
  // Fallback to legacy string category if present
  return txn.category || '';
}

// Transaction form logic
let editingTransaction = null;

function showTransactionModal(transaction = null) {
  editingTransaction = transaction;
  const modal = document.getElementById('transaction-modal');
  const form = document.getElementById('transaction-form');
  const title = document.getElementById('form-title');
  
  title.textContent = transaction ? 'Edit Transaction' : 'Add Transaction';
  
  // Populate form
  if (transaction) {
    document.getElementById('txn-type').value = transaction.type;
    document.getElementById('txn-amount').value = transaction.amount;
    document.getElementById('txn-date').value = transaction.date;
    document.getElementById('txn-note').value = transaction.note || '';
  } else {
    form.reset();
    document.getElementById('txn-date').value = new Date().toISOString().split('T')[0];
  }
  
  // Update category dropdown based on type
  updateCategoryOptions();
  
  if (transaction) {
    document.getElementById('txn-category').value = transaction.category;
    document.getElementById('txn-method').value = transaction.paymentMethod || '';
  }
  
  modal.classList.remove('hidden');
}

function hideTransactionModal() {
  document.getElementById('transaction-modal').classList.add('hidden');
  editingTransaction = null;
}

function updateCategoryOptions() {
  const type = document.getElementById('txn-type').value;
  const categorySelect = document.getElementById('txn-category');
  const methodSelect = document.getElementById('txn-method');
  
  // Update categories
  const categories = type === 'transfer' ? [] : data.categories[type] || [];
  categorySelect.innerHTML = categories.map(cat => 
    `<option value="${cat}">${cat}</option>`
  ).join('');
  
  // Update payment methods
  methodSelect.innerHTML = '<option value="">Select method</option>' + 
    data.paymentMethods.map(method => 
      `<option value="${method}">${method}</option>`
    ).join('');
  
  // Hide category for transfers
  categorySelect.parentElement.style.display = type === 'transfer' ? 'none' : 'block';
}

function saveTransaction(e) {
  e.preventDefault();
  
  const transaction = {
    id: editingTransaction?.id || Date.now().toString(),
    type: document.getElementById('txn-type').value,
    amount: parseAmountEU(document.getElementById('txn-amount').value),
    category: document.getElementById('txn-category').value,
    paymentMethod: document.getElementById('txn-method').value,
    date: document.getElementById('txn-date').value,
    note: document.getElementById('txn-note').value
  };
  
  if (editingTransaction) {
    const index = data.transactions.findIndex(t => t.id === editingTransaction.id);
    data.transactions[index] = transaction;
  } else {
    data.transactions.push(transaction);
  }
  
  saveData();
  updateBalance();
  renderRecentTransactions();
  hideTransactionModal();
}

// Theme toggle
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  const themeBtn = document.getElementById('theme-toggle');
  themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// Event listeners
document.getElementById('add-transaction-btn')?.addEventListener('click', () => {
  window.location.href = '/transactions/transactions.html?add=1';
});
document.getElementById('cancel-btn')?.addEventListener('click', hideTransactionModal);
document.getElementById('transaction-form')?.addEventListener('submit', saveTransaction);
document.getElementById('txn-type')?.addEventListener('change', updateCategoryOptions);
document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

// Menu toggle
// sidebar removed

// Theme toggle
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    themeToggle.innerHTML = next === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
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

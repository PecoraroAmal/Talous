// index.js - Dashboard logic

// Data structure (new schema compatible)
let data = {
  transactions: [],
  categories: { income: [], expense: [] },
  paymentMethods: [],
  banks: [],
  balance: 0
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
  }
  updateBalance();
  renderRecentTransactions();
}

// Save data to localStorage
function saveData() {
  localStorage.setItem('talousData', JSON.stringify(data));
}

// Calculate balance
function updateBalance() {
  data.balance = data.transactions.reduce((sum, txn) => {
    if (txn.type === 'income') return sum + txn.amount;
    if (txn.type === 'expense') return sum - txn.amount;
    return sum;
  }, 0);
  
  const balanceEl = document.getElementById('current-balance');
  balanceEl.textContent = formatCurrency(data.balance);
  balanceEl.className = 'balance ' + (data.balance >= 0 ? 'positive' : 'negative');
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-GB', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(amount);
}

// Format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
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
      <div class="transaction-amount ${txn.type}">${formatCurrency(txn.amount)}</div>
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
    amount: parseFloat(document.getElementById('txn-amount').value),
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

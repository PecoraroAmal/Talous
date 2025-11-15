// tools.js - Tools page logic

import { SAMPLE_DATA } from '../example/example.js';

let data = {
  accounts: [],
  goals: [],
  categories: {
    income: [],
    expense: []
  },
  paymentMethods: [],
  recurringPayments: [],
  transactions: []
};

let pendingDelete = null; // { type: 'account'|'goal'|'category', item: object, callback: function }

function showConfirmModal(message, onConfirm) {
  pendingDelete = { callback: onConfirm };
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-modal').classList.remove('hidden');
}

function hideConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
  pendingDelete = null;
}

function confirmDelete() {
  if (pendingDelete && pendingDelete.callback) {
    pendingDelete.callback();
  }
  hideConfirmModal();
}

function loadData() {
  const stored = localStorage.getItem('talousData');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      data.accounts = parsed.banks || [];
      // Migration: old 'wallet' accounts become 'wallet_physical'
      data.accounts = data.accounts.map(a => {
        if (a.type === 'wallet') return { ...a, type: 'wallet_physical' };
        return a;
      });
      data.goals = parsed.goals || [];
      data.categories = parsed.categories || { income: [], expense: [] };
      data.paymentMethods = parsed.paymentMethods || [];
      data.recurringPayments = parsed.recurringPayments || [];
      data.transactions = parsed.transactions || [];
    } catch (e) {
      console.error('Error loading data:', e);
    }
  } else {
    // Initialize with sample data if no data exists
    const parsed = SAMPLE_DATA;
    data.accounts = parsed.banks || [];
    data.goals = parsed.goals || [];
    data.categories = parsed.categories || { income: [], expense: [] };
    data.paymentMethods = parsed.paymentMethods || [];
    data.recurringPayments = parsed.recurringPayments || [];
    data.transactions = parsed.transactions || [];
    saveData();
  }
  renderAll();
}

function saveData() {
  const stored = localStorage.getItem('talousData') || '{}';
  const fullData = JSON.parse(stored);
  fullData.banks = data.accounts;
  fullData.goals = data.goals;
  fullData.categories = data.categories;
  fullData.paymentMethods = data.paymentMethods;
  fullData.recurringPayments = data.recurringPayments;
  fullData.transactions = data.transactions;
  localStorage.setItem('talousData', JSON.stringify(fullData));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Render all sections
function renderAll() {
  renderAccounts();
  renderRecurringPayments();
  renderGoals();
  renderCategories();
}

function renderAccounts() {
  const list = document.getElementById('accounts-list');
  if (!data.accounts || data.accounts.length === 0) {
    list.innerHTML = '<p style="opacity: 0.6; text-align: center; padding: 40px; grid-column: 1 / -1;">No accounts yet. Click the + button above to add your first account.</p>';
    return;
  }
  const items = data.accounts.map(account => {
    const iconClass = getAccountIcon(account.type);
    const associatedMethods = data.paymentMethods.filter(method => method.accountId === account.id);
    const allowedTypes = getAllowedPaymentTypes(account.type);
    const balance = computeAccountBalance(account.id);
    const sharedIcon = account.sharedBalance
      ? '<i class="fa-solid fa-arrows-rotate" style="color:var(--color-positive);" title="Shared"></i>'
      : '<i class="fa-solid fa-ban" style="color:var(--color-negative);" title="Not Shared"></i>';
    const methodsHtml = associatedMethods.length > 0 
      ? `<div class="account-payment-methods">${associatedMethods.map(method => {
          const methodIcon = getPaymentMethodIcon(method.type);
          return `<div class=\"payment-method-mini\" onclick=\"editPaymentMethod('${method.id}')\">\n              <i class=\"${methodIcon}\" style=\"color: ${method.colour};\"></i>\n              <span>${method.name}</span>\n            </div>`;
        }).join('')}
          ${allowedTypes.length > 0 ? `<div class=\"add-payment-method\" onclick=\"showPaymentMethodModal(null, '${account.id}')\"><i class=\"fa-solid fa-plus\"></i></div>` : ''}
        </div>`
      : allowedTypes.length > 0 ? `<div class="account-payment-methods"><div class="add-payment-method" onclick="showPaymentMethodModal(null, '${account.id}')"><i class="fa-solid fa-plus"></i></div></div>`
      : '<div class="account-payment-methods"><p style="opacity: 0.6; font-size: 12px; margin: 8px 0;">No payment methods available</p></div>';
    return `
    <div class="account-item" style="border-left-color: ${account.colour}; position:relative;">
      <div class="account-header">
        <i class="${iconClass}" style="color: ${account.colour}; font-size: 32px;"></i>
        <div style="position:absolute; top:10px; right:10px;">${sharedIcon}</div>
      </div>
      <div style="margin: 10px 0;">
        <h4 style="margin: 0;">${account.name}</h4>
        <div style="font-size: 18px; font-weight: bold; margin-top: 5px;">${formatNumber(balance)} ${account.currency || 'EUR'}</div>
      </div>
      ${methodsHtml}
      <div class="item-actions">
        <button onclick="editAccount('${account.id}')"><i class="fa-solid fa-pen"></i></button>
      </div>
    </div>`;
  }).join('');
  list.innerHTML = items;
}

function computeAccountBalance(accId){
  let b=0;
  const acc=data.accounts.find(a=>a.id===accId);
  const shared=acc?.sharedBalance;
  (data.transactions||[]).forEach(t=>{
    if(t.toGoalId) return;
    if(t.type==='income'&&t.accountId===accId&&(shared||(t.methodId||'')===t.methodId)) b+=t.amount;
    if(t.type==='expense'&&t.accountId===accId&&(shared||(t.methodId||'')===t.methodId)) b-=t.amount;
    if(t.type==='transfer'){
      if(t.fromAccountId===accId) b-=t.amount;
      if(t.toAccountId===accId) b+=t.amount;
    }
  });
  return b;
}

function getAccountIcon(type) {
  switch(type) {
    case 'bank': return 'fa-solid fa-building-columns';
    case 'wallet_physical': return 'fa-solid fa-wallet';
    case 'wallet_online': return 'fa-solid fa-globe';
    case 'crypto': return 'fa-solid fa-coins';
    case 'piggy': return 'fa-solid fa-piggy-bank';
    default: return 'fa-solid fa-building-columns';
  }
}

function showAccountModal(account = null) {
  editingAccount = account;
  const modal = document.getElementById('account-modal');
  const form = document.getElementById('account-form');
  const title = document.getElementById('account-form-title');
  const deleteBtn = document.getElementById('delete-account-btn');
  
  title.textContent = account ? 'Edit Account' : 'Add Account';
  deleteBtn.style.display = account ? 'block' : 'none';
  
  if (account) {
    document.getElementById('account-type').value = account.type;
    document.getElementById('account-name').value = account.name;
    document.getElementById('account-currency').value = account.currency || 'EUR';
    document.getElementById('account-shared').value = account.sharedBalance ? 'yes' : 'no';
    document.getElementById('account-colour').value = account.colour;
  } else {
    form.reset();
    document.getElementById('account-currency').value = 'EUR';
    document.getElementById('account-shared').value = 'no';
    document.getElementById('account-colour').value = '#2E86DE';
  }
  
  modal.classList.remove('hidden');
}

function hideAccountModal() {
  document.getElementById('account-modal').classList.add('hidden');
  editingAccount = null;
}

function saveAccount(e) {
  e.preventDefault();
  
  const account = {
    id: editingAccount?.id || generateId(),
    type: document.getElementById('account-type').value,
    name: document.getElementById('account-name').value,
    currency: document.getElementById('account-currency').value,
    sharedBalance: document.getElementById('account-shared').value === 'yes',
    colour: document.getElementById('account-colour').value
  };
  
  if (editingAccount) {
    const index = data.accounts.findIndex(a => a.id === editingAccount.id);
    data.accounts[index] = account;
  } else {
    data.accounts.push(account);
  }
  
  saveData();
  renderAccounts();
  hideAccountModal();
}

function deleteAccount() {
  if (!editingAccount) return;
  showConfirmModal(`Delete account "${editingAccount.name}"?`, () => {
    // Also delete associated payment methods
    data.paymentMethods = data.paymentMethods.filter(m => m.accountId !== editingAccount.id);
    data.accounts = data.accounts.filter(a => a.id !== editingAccount.id);
    saveData();
    renderAccounts();
    hideAccountModal();
  });
}

window.editAccount = function(id) {
  const account = data.accounts.find(a => a.id === id);
  if (account) showAccountModal(account);
};

// RECURRING PAYMENTS
let editingRecurring = null;

function renderRecurringPayments() {
  const list = document.getElementById('recurring-list');
  
  if (!data.recurringPayments || data.recurringPayments.length === 0) {
    list.innerHTML = '<p style="opacity: 0.6; text-align: center; padding: 40px; grid-column: 1 / -1;">No recurring payments yet. Click the + button above to add your first recurring payment.</p>';
    return;
  }
  
  const items = data.recurringPayments.map(rec => {
    const account = data.accounts.find(a => a.id === (rec.accountId || rec.fromAccountId));
    const accountName = account ? account.name : 'Unknown';
    const currency = account?.currency || 'EUR';
    const typeLabel = rec.type.charAt(0).toUpperCase() + rec.type.slice(1);
    const iconColor = rec.type === 'income' ? 'var(--color-positive)' : (rec.type === 'expense' ? 'var(--color-negative)' : 'var(--fg-dim)');
    const borderColor = rec.type === 'income' ? 'var(--color-positive)' : (rec.type === 'expense' ? 'var(--color-negative)' : '#6b7280');
    return `
      <div class="recurring-item" style="border-left-color:${borderColor};">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <i class="fa-solid fa-sack-dollar" style="color:${iconColor};font-size:24px;"></i>
            <span style="font-weight:600;font-size:14px;">${typeLabel}</span>
          </div>
          <button onclick="executeRecurring('${rec.id}')" class="btn-primary" style="padding:4px 10px;font-size:12px;display:flex;align-items:center;gap:4px;">
            <i class="fa-solid fa-play"></i>
            <span>Execute</span>
          </button>
        </div>
        <div style="font-size:18px;font-weight:700;">${formatNumber(rec.amount)} ${currency}</div>
        <div style="font-size:12px;opacity:.7;margin-top:4px;">${accountName}</div>
        ${rec.category ? `<div style="font-size:11px;opacity:.65;margin-top:4px;">${rec.category}</div>` : ''}
        ${rec.note ? `<div style="font-size:11px;opacity:.55;margin-top:4px;">${rec.note}</div>` : ''}
      </div>`;
  }).join('');
  
  list.innerHTML = items;
}

function showRecurringModal(rec = null) {
  editingRecurring = rec;
  const modal = document.getElementById('recurring-modal');
  const form = document.getElementById('recurring-form');
  const title = document.getElementById('recurring-form-title');
  const deleteBtn = document.getElementById('rec-delete-btn');
  
  title.textContent = rec ? 'Edit Recurring Payment' : 'Add Recurring Payment';
  deleteBtn.style.display = rec ? 'block' : 'none';
  
  // Populate account selects
  const accountOptions = data.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  document.getElementById('rec-acc').innerHTML = '<option value="">Select Account</option>' + accountOptions;
  document.getElementById('rec-from-acc').innerHTML = '<option value="">Select Account</option>' + accountOptions;
  document.getElementById('rec-to-acc').innerHTML = '<option value="">Select Account</option>' + accountOptions;
  
  // Populate categories
  const allCats = [...data.categories.income, ...data.categories.expense];
  const catOptions = allCats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  document.getElementById('rec-cat').innerHTML = '<option value="">Select Category</option>' + catOptions;
  
  if (rec) {
    document.getElementById('rec-type').value = rec.type;
    document.getElementById('rec-amount').value = rec.amount;
    document.getElementById('rec-source').value = rec.source || '';
    document.getElementById('rec-note').value = rec.note || '';
    document.getElementById('rec-cat').value = rec.category || '';
    
    if (rec.type !== 'transfer') {
      document.getElementById('rec-acc').value = rec.accountId || '';
      fillRecMethods();
      document.getElementById('rec-method').value = rec.methodId || 'none';
    } else {
      document.getElementById('rec-from-acc').value = rec.fromAccountId || '';
      document.getElementById('rec-to-acc').value = rec.toAccountId || '';
      fillRecFromMethods();
      fillRecToMethods();
      document.getElementById('rec-from-method').value = rec.fromMethodId || 'none';
      document.getElementById('rec-to-method').value = rec.toMethodId || 'none';
      if (rec.toGoalId) {
        document.getElementById('rec-to-goal').checked = true;
        fillRecGoals();
        document.getElementById('rec-goal-select').value = rec.toGoalId;
      }
    }
  } else {
    form.reset();
  }
  
  updateRecurringUI();
  modal.classList.remove('hidden');
}

function hideRecurringModal() {
  document.getElementById('recurring-modal').classList.add('hidden');
  editingRecurring = null;
}

// Helper to toggle required only on visible controls to avoid
// browser validation error: "An invalid form control with name='' is not focusable.".
function setRequired(id,on){
  const el=document.getElementById(id);
  if(!el) return;
  if(on) el.setAttribute('required','required'); else el.removeAttribute('required');
}

function updateRecurringUI() {
  const type = document.getElementById('rec-type').value;
  const incomeFields = document.getElementById('rec-income-fields');
  const singleFields = document.getElementById('rec-single-fields');
  const transferFields = document.getElementById('rec-transfer-fields');
  incomeFields.style.display = type === 'income' ? 'block' : 'none';
  singleFields.classList.toggle('hidden', type === 'transfer');
  transferFields.classList.toggle('hidden', type !== 'transfer');

  const catSel = document.getElementById('rec-cat');
  catSel.style.display = type === 'transfer' ? 'none' : 'block';
  if (catSel.previousElementSibling) catSel.previousElementSibling.style.display = type === 'transfer' ? 'none' : 'block';

  if (type === 'transfer') {
    // Remove required from single account fields
    setRequired('rec-acc', false);
    setRequired('rec-method', false);
    // Add required to transfer fields
    setRequired('rec-from-acc', true);
    setRequired('rec-from-method', true);
    setRequired('rec-to-acc', true);
    setRequired('rec-to-method', true);
    // Category not required for transfer
    setRequired('rec-cat', false);
    const toGoal = document.getElementById('rec-to-goal').checked;
    const goalDest = document.getElementById('rec-goal-dest');
    goalDest.classList.toggle('hidden', !toGoal);
    if (toGoal) {
      fillRecGoals();
      setRequired('rec-goal-select', true);
    } else {
      setRequired('rec-goal-select', false);
    }
  } else {
    // Income / Expense
    setRequired('rec-acc', true);
    setRequired('rec-method', true);
    setRequired('rec-from-acc', false);
    setRequired('rec-from-method', false);
    setRequired('rec-to-acc', false);
    setRequired('rec-to-method', false);
    setRequired('rec-goal-select', false);
    setRequired('rec-cat', true);
  }
}

function fillRecMethods() {
  const accId = document.getElementById('rec-acc').value;
  const methods = data.paymentMethods.filter(m => m.accountId === accId);
  const html = '<option value="none">None</option>' + methods.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  document.getElementById('rec-method').innerHTML = html;
}

function fillRecFromMethods() {
  const accId = document.getElementById('rec-from-acc').value;
  const methods = data.paymentMethods.filter(m => m.accountId === accId);
  const html = '<option value="none">None</option>' + methods.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  document.getElementById('rec-from-method').innerHTML = html;
}

function fillRecToMethods() {
  const accId = document.getElementById('rec-to-acc').value;
  const methods = data.paymentMethods.filter(m => m.accountId === accId);
  const html = '<option value="none">None</option>' + methods.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  document.getElementById('rec-to-method').innerHTML = html;
}

function fillRecGoals() {
  const toAcc = document.getElementById('rec-to-acc').value;
  const goals = data.goals.filter(g => g.accountId === toAcc);
  const html = '<option value="">Select Goal</option>' + goals.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
  document.getElementById('rec-goal-select').innerHTML = html;
}

function saveRecurring(e) {
  e.preventDefault();
  
  const type = document.getElementById('rec-type').value;
  const recurring = {
    id: editingRecurring?.id || generateId(),
    type: type,
    amount: parseAmountEU(document.getElementById('rec-amount').value),
    category: document.getElementById('rec-cat').value,
    note: document.getElementById('rec-note').value
  };
  
  if (type === 'income') {
    recurring.source = document.getElementById('rec-source').value;
    recurring.accountId = document.getElementById('rec-acc').value;
    const methodVal = document.getElementById('rec-method').value;
    recurring.methodId = methodVal === 'none' ? '' : methodVal;
  } else if (type === 'expense') {
    recurring.accountId = document.getElementById('rec-acc').value;
    const methodVal = document.getElementById('rec-method').value;
    recurring.methodId = methodVal === 'none' ? '' : methodVal;
  } else if (type === 'transfer') {
    recurring.fromAccountId = document.getElementById('rec-from-acc').value;
    recurring.toAccountId = document.getElementById('rec-to-acc').value;
    const fromMethodVal = document.getElementById('rec-from-method').value;
    const toMethodVal = document.getElementById('rec-to-method').value;
    recurring.fromMethodId = fromMethodVal === 'none' ? '' : fromMethodVal;
    recurring.toMethodId = toMethodVal === 'none' ? '' : toMethodVal;
  }
  
  if (editingRecurring) {
    const index = data.recurringPayments.findIndex(r => r.id === editingRecurring.id);
    data.recurringPayments[index] = recurring;
  } else {
    data.recurringPayments.push(recurring);
  }
  
  saveData();
  renderRecurringPayments();
  hideRecurringModal();
}

function executeRecurring(id) {
  const rec = data.recurringPayments.find(r => r.id === id);
  if (!rec) return;
  
  // Create a transaction with current date
  const transaction = {
    id: generateId(),
    type: rec.type,
    amount: rec.amount,
    date: new Date().toISOString().split('T')[0],
    note: rec.note || '',
    category: rec.category || ''
  };
  
  if (rec.type === 'income') {
    transaction.source = rec.source || '';
    transaction.accountId = rec.accountId;
    transaction.methodId = rec.methodId || '';
  } else if (rec.type === 'expense') {
    transaction.accountId = rec.accountId;
    transaction.methodId = rec.methodId || '';
  } else if (rec.type === 'transfer') {
    transaction.fromAccountId = rec.fromAccountId;
    transaction.toAccountId = rec.toAccountId;
    transaction.fromMethodId = rec.fromMethodId || '';
    transaction.toMethodId = rec.toMethodId || '';
  }
  
  data.transactions.push(transaction);
  saveData();
  alert(`Transaction executed successfully! Date: ${transaction.date}`);
  renderRecurringPayments();
}

function deleteRecurring(id) {
  const rec = data.recurringPayments.find(r => r.id === id);
  if (!rec) return;
  
  showConfirmModal(`Delete recurring payment?`, () => {
    data.recurringPayments = data.recurringPayments.filter(r => r.id !== id);
    saveData();
    renderRecurringPayments();
  });
}

window.editRecurring = function(id) {
  const rec = data.recurringPayments.find(r => r.id === id);
  if (rec) showRecurringModal(rec);
};

window.executeRecurring = executeRecurring;
window.deleteRecurring = deleteRecurring;

// GOALS
let editingGoal = null;

function renderGoals() {
  const list = document.getElementById('goals-list');
  
  if (!data.goals || data.goals.length === 0) {
    list.innerHTML = '<p style="opacity: 0.6; text-align: center; padding: 40px; grid-column: 1 / -1;">No saving goals yet. Click the + button above to add your first goal.</p>';
    return;
  }
  
  const items = data.goals.map(goal => {
    const progress = (goal.current / goal.target) * 100;
    const percentage = Math.min(progress, 100).toFixed(1);
    const acc = data.accounts.find(a=>a.id===goal.accountId);
    const cur = acc?.currency || '';
    return `
      <div class="goal-item" style="border-top-color: ${goal.colour};">
        <h4>${goal.name}</h4>
        <div class="goal-amounts">
          <span>${formatNumber(goal.current)} ${cur}</span> / <span>${formatNumber(goal.target)} ${cur}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%; background: ${goal.colour};"></div>
        </div>
        <div class="progress-percentage">${percentage}%</div>
        <div class="goal-dates">
          <i class="fa-solid fa-calendar"></i> ${formatDate(goal.startDate)} → ${formatDate(goal.targetDate)}
        </div>
        <div class="item-actions">
          <button onclick="editGoal('${goal.id}')"><i class="fa-solid fa-pen"></i></button>
        </div>
      </div>
    `;
  }).join('');
  
  list.innerHTML = items;
}

function showGoalModal(goal = null) {
  editingGoal = goal;
  const modal = document.getElementById('goal-modal');
  const form = document.getElementById('goal-form');
  const title = document.getElementById('goal-form-title');
  const deleteBtn = document.getElementById('delete-goal-btn');
  // Populate account select
  const accSel = document.getElementById('goal-account');
  accSel.innerHTML = '<option value="">Select Account</option>' + (data.accounts||[]).map(a=>`<option value="${a.id}">${a.name}</option>`).join('');
  
  title.textContent = goal ? 'Edit Goal' : 'Add Goal';
  deleteBtn.style.display = goal ? 'block' : 'none';
  
  if (goal) {
    document.getElementById('goal-account').value = goal.accountId || '';
    document.getElementById('goal-name').value = goal.name;
    document.getElementById('goal-target').value = goal.target;
    document.getElementById('goal-current').value = goal.current;
    document.getElementById('goal-start').value = goal.startDate;
    document.getElementById('goal-end').value = goal.targetDate;
    document.getElementById('goal-colour').value = goal.colour;
  } else {
    form.reset();
    document.getElementById('goal-account').value = '';
    document.getElementById('goal-current').value = 0;
    document.getElementById('goal-colour').value = '#2E86DE';
    document.getElementById('goal-start').value = new Date().toISOString().split('T')[0];
  }
  
  modal.classList.remove('hidden');
}

function hideGoalModal() {
  document.getElementById('goal-modal').classList.add('hidden');
  editingGoal = null;
}

function saveGoal(e) {
  e.preventDefault();
  
  const goal = {
    id: editingGoal?.id || generateId(),
    accountId: document.getElementById('goal-account').value,
    name: document.getElementById('goal-name').value,
    target: parseAmountEU(document.getElementById('goal-target').value),
    current: parseAmountEU(document.getElementById('goal-current').value),
    startDate: document.getElementById('goal-start').value,
    targetDate: document.getElementById('goal-end').value,
    colour: document.getElementById('goal-colour').value
  };
  if (!goal.accountId){ alert('Please select an associated account for the goal.'); return; }
  
  if (editingGoal) {
    const index = data.goals.findIndex(g => g.id === editingGoal.id);
    data.goals[index] = goal;
  } else {
    data.goals.push(goal);
  }
  
  saveData();
  renderGoals();
  hideGoalModal();
}

function deleteGoal() {
  if (!editingGoal) return;
  showConfirmModal(`Delete goal "${editingGoal.name}"?`, () => {
    data.goals = data.goals.filter(g => g.id !== editingGoal.id);
    saveData();
    renderGoals();
    hideGoalModal();
  });
}

window.editGoal = function(id) {
  const goal = data.goals.find(g => g.id === id);
  if (goal) showGoalModal(goal);
};

// CATEGORIES
let editingCategory = null;

function renderCategories() {
  const incomeContainer = document.getElementById('income-categories');
  const expenseContainer = document.getElementById('expense-categories');
  
  const incomeItems = data.categories.income.length === 0 
    ? '<p style="opacity: 0.6; text-align: center; padding: 20px; grid-column: 1 / -1;">No income categories yet</p>'
    : data.categories.income.map(cat => `
        <div class="category-item" onclick="editCategory('income', '${cat.id}')">
          <i class="fa-solid fa-tag" style="color: ${cat.colour};"></i>
          <span>${cat.name}</span>
          <div class="item-actions">
            <button onclick="editCategory('income', '${cat.id}'); event.stopPropagation();"><i class="fa-solid fa-pen"></i></button>
          </div>
        </div>
      `).join('');
  
  const expenseItems = data.categories.expense.length === 0
    ? '<p style="opacity: 0.6; text-align: center; padding: 20px; grid-column: 1 / -1;">No expense categories yet</p>'
    : data.categories.expense.map(cat => `
        <div class="category-item" onclick="editCategory('expense', '${cat.id}')">
          <i class="fa-solid fa-tag" style="color: ${cat.colour};"></i>
          <span>${cat.name}</span>
          <div class="item-actions">
            <button onclick="editCategory('expense', '${cat.id}'); event.stopPropagation();"><i class="fa-solid fa-pen"></i></button>
          </div>
        </div>
      `).join('');
  
  incomeContainer.innerHTML = `<h3>Income Categories</h3><div class="category-items">${incomeItems}</div>`;
  expenseContainer.innerHTML = `<h3>Expense Categories</h3><div class="category-items">${expenseItems}</div>`;
}

function showCategoryModal(category = null, type = 'income') {
  editingCategory = category;
  const modal = document.getElementById('category-modal');
  const form = document.getElementById('category-form');
  const title = document.getElementById('category-form-title');
  const deleteBtn = document.getElementById('delete-category-btn');
  
  title.textContent = category ? 'Edit Category' : 'Add Category';
  deleteBtn.style.display = category ? 'block' : 'none';
  
  if (category) {
    document.getElementById('category-type').value = category.type;
    document.getElementById('category-name').value = category.name;
    document.getElementById('category-colour').value = category.colour;
  } else {
    form.reset();
    document.getElementById('category-type').value = type;
    document.getElementById('category-colour').value = '#2E86DE';
  }
  
  modal.classList.remove('hidden');
}

function hideCategoryModal() {
  document.getElementById('category-modal').classList.add('hidden');
  editingCategory = null;
}

function saveCategory(e) {
  e.preventDefault();
  
  const type = document.getElementById('category-type').value;
  const category = {
    id: editingCategory?.id || generateId(),
    name: document.getElementById('category-name').value,
    colour: document.getElementById('category-colour').value,
    type: type
  };
  
  if (editingCategory) {
    const oldType = editingCategory.type;
    data.categories[oldType] = data.categories[oldType].filter(c => c.id !== editingCategory.id);
  }
  
  if (!data.categories[type]) data.categories[type] = [];
  const exists = data.categories[type].find(c => c.id === category.id);
  if (exists) {
    const index = data.categories[type].findIndex(c => c.id === category.id);
    data.categories[type][index] = category;
  } else {
    data.categories[type].push(category);
  }
  
  saveData();
  renderCategories();
  hideCategoryModal();
}

function deleteCategory() {
  if (!editingCategory) return;
  showConfirmModal(`Delete category "${editingCategory.name}"?`, () => {
    const type = editingCategory.type;
    data.categories[type] = data.categories[type].filter(c => c.id !== editingCategory.id);
    saveData();
    renderCategories();
    hideCategoryModal();
  });
}

window.editCategory = function(type, id) {
  const category = data.categories[type].find(c => c.id === id);
  if (category) showCategoryModal({...category, type}, type);
};

// Render payment methods
function renderPaymentMethods() {
  const list = document.getElementById('payment-methods-list');
  
  if (!data.paymentMethods || data.paymentMethods.length === 0) {
    list.innerHTML = '<p style="opacity: 0.6; text-align: center; padding: 40px; grid-column: 1 / -1;">No payment methods yet. Click the + button above to add your first payment method.</p>';
    return;
  }
  
  const items = data.paymentMethods.map(method => {
    const iconClass = getPaymentMethodIcon(method.type);
    const account = data.accounts.find(a => a.id === method.accountId);
    const accountName = account ? account.name : 'Unknown Account';
    
    return `
    <div class="payment-method-item" style="border-left-color: ${method.colour};">
      <div class="payment-method-header">
        <i class="${iconClass}" style="color: ${method.colour}; font-size: 24px; margin-right: 10px;"></i>
        <div>
          <h4>${method.name}</h4>
          <span class="payment-method-account">${accountName}</span>
        </div>
      </div>
      <div class="item-actions">
        <button onclick="editPaymentMethod('${method.id}')"><i class="fa-solid fa-pen"></i></button>
      </div>
    </div>
  `}).join('');
  
  list.innerHTML = items;
}

// PAYMENT METHODS
let editingPaymentMethod = null;

function getPaymentMethodIcon(type) {
  switch(type) {
    case 'wallet': return 'fa-solid fa-wallet';
    case 'cash': return 'fa-solid fa-money-bills';
    case 'crypto': return 'fa-solid fa-coins';
    case 'card': return 'fa-solid fa-credit-card';
    default: return 'fa-solid fa-wallet';
  }
}

function showPaymentMethodModal(method = null, accountId = null) {
  editingPaymentMethod = method;
  const modal = document.getElementById('payment-method-modal');
  const form = document.getElementById('payment-method-form');
  const title = document.getElementById('payment-method-form-title');
  const deleteBtn = document.getElementById('delete-payment-method-btn');
  const accountSelect = document.getElementById('payment-method-account');
  const typeSelect = document.getElementById('payment-method-type');
  
  title.textContent = method ? 'Edit Payment Method' : 'Add Payment Method';
  deleteBtn.style.display = method ? 'block' : 'none';
  
  // Populate account select
  accountSelect.innerHTML = '<option value="">Select Account</option>';
  data.accounts.forEach(account => {
    const option = document.createElement('option');
    option.value = account.id;
    option.textContent = account.name;
    accountSelect.appendChild(option);
  });
  
  if (method) {
    document.getElementById('payment-method-type').value = method.type;
    document.getElementById('payment-method-name').value = method.name;
    document.getElementById('payment-method-account').value = method.accountId || '';
    document.getElementById('payment-method-colour').value = method.colour;
    
    // Filter type options based on selected account
    filterPaymentMethodTypes(method.accountId);
  } else {
    // If accountId is provided, set it and filter types
    if (accountId) {
      document.getElementById('payment-method-account').value = accountId;
      filterPaymentMethodTypes(accountId);
      
      // Set default color to account color
      const account = data.accounts.find(a => a.id === accountId);
      if (account) {
        document.getElementById('payment-method-colour').value = account.colour;
      }
    } else {
      // No account pre-selected, show all types
      resetPaymentMethodTypes();
    }
    
    form.reset();
    document.getElementById('payment-method-account').value = accountId || '';
    document.getElementById('payment-method-colour').value = accountId ? 
      (data.accounts.find(a => a.id === accountId)?.colour || '#2E86DE') : '#2E86DE';
  }
  
  modal.classList.remove('hidden');
}

function filterPaymentMethodTypes(accountId) {
  const typeSelect = document.getElementById('payment-method-type');
  const account = data.accounts.find(a => a.id === accountId);
  
  if (!account) {
    resetPaymentMethodTypes();
    return;
  }
  
  // Clear existing options
  typeSelect.innerHTML = '';
  
  // Add only allowed types based on account type
  const allowedTypes = getAllowedPaymentTypes(account.type);
  allowedTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type.value;
    option.textContent = type.label;
    typeSelect.appendChild(option);
  });
}

function resetPaymentMethodTypes() {
  const typeSelect = document.getElementById('payment-method-type');
  typeSelect.innerHTML = `
    <option value="wallet">Wallet</option>
    <option value="cash">Cash</option>
    <option value="crypto">Crypto</option>
    <option value="card">Card</option>
  `;
}

function getAllowedPaymentTypes(accountType) {
  switch(accountType) {
    case 'bank':
      return [{ value: 'card', label: 'Card' }];
    case 'wallet_physical':
      return [{ value: 'cash', label: 'Cash' }];
    case 'wallet_online':
      return [{ value: 'wallet', label: 'Wallet' }];
    case 'crypto':
      return [{ value: 'crypto', label: 'Crypto' }];
    case 'piggy':
      return []; // No payment methods allowed
    default:
      return [
        { value: 'wallet', label: 'Wallet' },
        { value: 'cash', label: 'Cash' },
        { value: 'crypto', label: 'Crypto' },
        { value: 'card', label: 'Card' }
      ];
  }
}

function hidePaymentMethodModal() {
  document.getElementById('payment-method-modal').classList.add('hidden');
  editingPaymentMethod = null;
}

function savePaymentMethod(e) {
  e.preventDefault();
  
  const type = document.getElementById('payment-method-type').value;
  const accountId = document.getElementById('payment-method-account').value;
  
  // Validate that account is selected for non-cash methods
  if (!accountId) {
    alert('Please select an account for this payment method.');
    return;
  }
  
  const method = {
    id: editingPaymentMethod?.id || generateId(),
    type: type,
    name: document.getElementById('payment-method-name').value,
    accountId: accountId,
    colour: document.getElementById('payment-method-colour').value
  };
  
  if (editingPaymentMethod) {
    const index = data.paymentMethods.findIndex(m => m.id === editingPaymentMethod.id);
    data.paymentMethods[index] = method;
  } else {
    data.paymentMethods.push(method);
  }
  
  saveData();
  renderAll(); // Re-render to show updated payment methods
  hidePaymentMethodModal();
}

function deletePaymentMethod() {
  if (!editingPaymentMethod) return;
  showConfirmModal(`Delete payment method "${editingPaymentMethod.name}"?`, () => {
    data.paymentMethods = data.paymentMethods.filter(m => m.id !== editingPaymentMethod.id);
    saveData();
    renderAll(); // Re-render to show updated payment methods
    hidePaymentMethodModal();
  });
}

window.editPaymentMethod = function(id) {
  const method = data.paymentMethods.find(m => m.id === id);
  if (method) showPaymentMethodModal(method);
};

// Helper functions
function formatNumber(amount) {
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Parse amounts written as 1.234,56 or 1234.106 safely
function parseAmountEU(value){
  if (typeof value === 'number') return value;
  let s=(value||'').toString().trim();
  s=s.replace(/\./g,'').replace(',', '.');
  const n=parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Event listeners
document.getElementById('cancel-account-btn')?.addEventListener('click', hideAccountModal);
document.getElementById('account-form')?.addEventListener('submit', saveAccount);
document.getElementById('delete-account-btn')?.addEventListener('click', deleteAccount);

document.getElementById('cancel-goal-btn')?.addEventListener('click', hideGoalModal);
document.getElementById('goal-form')?.addEventListener('submit', saveGoal);
document.getElementById('delete-goal-btn')?.addEventListener('click', deleteGoal);

document.getElementById('cancel-category-btn')?.addEventListener('click', hideCategoryModal);
document.getElementById('category-form')?.addEventListener('submit', saveCategory);
document.getElementById('delete-category-btn')?.addEventListener('click', deleteCategory);

document.getElementById('cancel-payment-method-btn')?.addEventListener('click', hidePaymentMethodModal);
document.getElementById('payment-method-form')?.addEventListener('submit', savePaymentMethod);
document.getElementById('delete-payment-method-btn')?.addEventListener('click', deletePaymentMethod);

// Recurring payment event listeners
document.getElementById('rec-type')?.addEventListener('change', updateRecurringUI);
document.getElementById('rec-acc')?.addEventListener('change', fillRecMethods);
document.getElementById('rec-from-acc')?.addEventListener('change', fillRecFromMethods);
document.getElementById('rec-to-acc')?.addEventListener('change', () => {
  fillRecToMethods();
  if (document.getElementById('rec-to-goal').checked) fillRecGoals();
});
document.getElementById('rec-to-goal')?.addEventListener('change', updateRecurringUI);
document.getElementById('recurring-form')?.addEventListener('submit', saveRecurring);
document.getElementById('rec-cancel-btn')?.addEventListener('click', hideRecurringModal);
document.getElementById('rec-delete-btn')?.addEventListener('click', () => {
  if (editingRecurring) {
    deleteRecurring(editingRecurring.id);
    hideRecurringModal();
  }
});

// Filter payment method types when account changes
document.getElementById('payment-method-account')?.addEventListener('change', (e) => {
  filterPaymentMethodTypes(e.target.value);
});

document.getElementById('confirm-yes')?.addEventListener('click', confirmDelete);
document.getElementById('confirm-no')?.addEventListener('click', hideConfirmModal);

// Close modals when clicking outside
document.querySelectorAll('.modal-overlay:not(#confirm-modal)').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
});

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
    themeToggle.innerHTML = next === 'dark' ? '<i class="fa-solid fa-sun"></i><span>Theme</span>' : '<i class="fa-solid fa-moon"></i><span>Theme</span>';
  });
}

// Load theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
if (themeToggle) {
  themeToggle.innerHTML = savedTheme === 'dark' ? '<i class="fa-solid fa-sun"></i><span>Theme</span>' : '<i class="fa-solid fa-moon"></i><span>Theme</span>';
}

// Make functions global for onclick handlers
window.showAccountModal = showAccountModal;
window.showGoalModal = showGoalModal;
window.showCategoryModal = showCategoryModal;
window.showPaymentMethodModal = showPaymentMethodModal;
window.showRecurringModal = showRecurringModal;
window.showConfirmModal = showConfirmModal;
window.hideConfirmModal = hideConfirmModal;
window.confirmDelete = confirmDelete;

// Initialise
loadData();

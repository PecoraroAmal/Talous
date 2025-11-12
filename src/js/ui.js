// ui.js - DOM utilities and renderers

import { formatCurrency, formatDate } from './utils.js';

export class UI {
  constructor(app) {
    this.app = app;
    this.toastContainer = document.getElementById('toast-container');
  }

  showToast(message, type = 'success', timeout = 2500) {
    const div = document.createElement('div');
    div.className = `toast ${type}`;
    div.textContent = message;
    this.toastContainer.appendChild(div);
    setTimeout(() => div.remove(), timeout);
  }

  // Modals
  openModal(id) {
    const dlg = document.getElementById(id);
    if (!dlg) return;
    dlg.showModal();
  }
  closeModal(id) {
    const dlg = document.getElementById(id);
    if (!dlg) return;
    dlg.close();
  }

  // Promise-based confirm dialog
  confirm(message, okText = 'Delete') {
    return new Promise(resolve => {
      const dlg = document.getElementById('confirm-modal');
      if (!dlg) {
        // Fallback if modal missing
        resolve(false);
        return;
      }
      const msgEl = document.getElementById('confirm-message');
      const okBtn = document.getElementById('confirm-ok');
      if (msgEl) msgEl.textContent = message;
      if (okBtn) okBtn.textContent = okText;

      const cancelBtn = dlg.querySelector('[data-cancel]');
      const form = dlg.querySelector('form');

      const cleanup = () => {
        cancelBtn?.removeEventListener('click', onCancel);
        okBtn?.removeEventListener('click', onOk);
        form?.removeEventListener('submit', onOk);
      };

      const onCancel = () => {
        cleanup();
        dlg.close();
        resolve(false);
      };
      const onOk = (e) => {
        e?.preventDefault?.();
        cleanup();
        dlg.close();
        resolve(true);
      };

      cancelBtn?.addEventListener('click', onCancel);
      okBtn?.addEventListener('click', onOk);
      form?.addEventListener('submit', onOk);

      dlg.showModal();
    });
  }

  wireModalCloseButtons() {
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dlg = btn.closest('dialog');
        if (dlg) dlg.close();
      });
    });
  }

  // Top-level render
  renderAll() {
    this.updateCategorySelects();
    this.updateMethodSelects();
    this.updateBankSelects();
    this.renderDashboard();
    this.renderTransactions();
    this.renderRecurring();
    this.renderSettings();
    this.wireModalCloseButtons();
  }

  // Selects
  updateCategorySelects() {
    const data = this.app.data;
    const txnCat = document.getElementById('txn-category');
    const recCat = document.getElementById('rec-category');
    const filterCat = document.getElementById('filter-category');
    const cats = [...data.categories.expense];
    [txnCat, recCat, filterCat].forEach(sel => {
      if (!sel) return;
      const keepFirst = sel.id === 'filter-category';
      sel.innerHTML = keepFirst ? '<option value="">All categories</option>' : '';
      cats.forEach(c => {
        const opt = document.createElement('option'); opt.value = c; opt.textContent = c; sel.appendChild(opt);
      });
    });
  }
  updateMethodSelects() {
    const data = this.app.data;
    const txnMet = document.getElementById('txn-method');
    const recMet = document.getElementById('rec-method');
    const filterMet = document.getElementById('filter-method');
    [txnMet, recMet, filterMet].forEach(sel => {
      if (!sel) return;
      const keepFirst = sel.id === 'filter-method';
      sel.innerHTML = keepFirst ? '<option value="">All methods</option>' : '';
      data.paymentMethods.forEach(m => {
        const opt = document.createElement('option'); opt.value = m; opt.textContent = m; sel.appendChild(opt);
      });
    });
  }

  updateBankSelects() {
    const data = this.app.data;
    const fromSel = document.getElementById('txn-from-bank');
    const toSel = document.getElementById('txn-to-bank');
    const bankSel = document.getElementById('txn-bank');
    [fromSel, toSel, bankSel].forEach(sel => {
      if (!sel) return;
      sel.innerHTML = '<option value="">Select bank</option>';
      data.banks.forEach(b => {
        const opt = document.createElement('option'); opt.value = b.name; opt.textContent = b.name; sel.appendChild(opt);
      });
    });
  }

  // Views
  renderDashboard() {
    const data = this.app.data;
    const totalIncome = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpense = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const balance = totalIncome - totalExpense;
    const el = document.getElementById('current-balance');
    if (el) {
      el.textContent = formatCurrency(balance);
      if (balance < 0) el.classList.add('negative'); else el.classList.remove('negative');
    }

    // Recent transactions: latest 10, split incomes and expenses
    const recent = document.getElementById('recent-transactions');
    if (recent) {
      recent.innerHTML = '';
      const last = data.transactions.slice(-10); // Newest at end
      if (!last.length) {
        recent.innerHTML = '<p class="muted">No transactions yet</p>';
      } else {
        const incomes = last.filter(t => t.type === 'income');
        const expenses = last.filter(t => t.type !== 'income');

        // Container for split layout
        const container = document.createElement('div');
        container.className = 'recent-container';

        // Incomes section
        const incomeSection = document.createElement('div');
        incomeSection.className = 'recent-section';
        const incomeHeader = document.createElement('h3');
        incomeHeader.textContent = 'Income';
        incomeHeader.style.color = 'var(--success)';
        incomeSection.appendChild(incomeHeader);
        this.renderRecentSection(incomeSection, incomes);
        container.appendChild(incomeSection);

        // Expenses section
        const expenseSection = document.createElement('div');
        expenseSection.className = 'recent-section';
        const expenseHeader = document.createElement('h3');
        expenseHeader.textContent = 'Expense';
        expenseHeader.style.color = 'var(--danger)';
        expenseSection.appendChild(expenseHeader);
        this.renderRecentSection(expenseSection, expenses);
        container.appendChild(expenseSection);

        recent.appendChild(container);
      }
    }
  }

  renderRecentSection(section, transactions) {
    if (!transactions.length) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Nessuna';
      section.appendChild(p);
      return;
    }
    // Group by ISO date
    const groups = transactions.reduce((acc, t) => {
      const key = t.date;
      (acc[key] ||= []).push(t);
      return acc;
    }, {});
    // Sort groups newest first
    Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(dayIso => {
      const header = document.createElement('h4');
      header.textContent = formatDate(dayIso);
      header.style.margin = '8px 0 4px';
      section.appendChild(header);
      groups[dayIso].forEach(t => {
        const div = document.createElement('div');
        const kind = t.type === 'income' ? 'income' : (t.type === 'transfer' ? 'transfer' : 'expense');
        div.className = 'recent-item';
        const sign = t.type === 'income' ? '+' : (t.type === 'transfer' ? '' : '-');
        div.innerHTML = `
          <div class="category">${t.category || ''}</div>
          <div class="amount ${kind}">${sign + formatCurrency(t.amount)}</div>
          <div class="method">${t.paymentMethod || ''}</div>
        `;
        section.appendChild(div);
      });
    });
  }

  renderTransactions() {
    const data = this.app.data;
    const container = document.getElementById('transactions-list');
    if (!container) return;

    const typeF = document.getElementById('filter-type')?.value || '';
    const catF = document.getElementById('filter-category')?.value || '';
    const metF = document.getElementById('filter-method')?.value || '';
    const monthF = document.getElementById('filter-month')?.value || '';

    // Apply filters
    let list = data.transactions.slice();
    if (typeF) list = list.filter(t => t.type === typeF);
    if (catF) list = list.filter(t => t.category === catF);
    if (metF) list = list.filter(t => t.paymentMethod === metF);
    if (monthF) list = list.filter(t => new Date(t.date).getMonth() + 1 === parseInt(monthF));

    container.innerHTML = '';
    if (!list.length) {
      container.innerHTML = '<p class="muted">No transactions</p>';
      return;
    }

    // Separate incomes and expenses/transfers
    const incomes = list.filter(t => t.type === 'income').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const expenses = list.filter(t => t.type !== 'income').sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Render incomes section
    if (incomes.length > 0) {
      const incomeHeader = document.createElement('h3');
      incomeHeader.textContent = 'Income';
      incomeHeader.style.margin = '16px 0 8px';
      incomeHeader.style.color = 'var(--success)';
      container.appendChild(incomeHeader);

      const incomeGroups = incomes.reduce((acc, t) => {
        const key = t.date;
        (acc[key] ||= []).push(t);
        return acc;
      }, {});
      Object.keys(incomeGroups).sort((a, b) => b.localeCompare(a)).forEach(dayIso => {
        const header = document.createElement('h4');
        header.textContent = formatDate(dayIso);
        header.style.margin = '12px 0 6px';
        container.appendChild(header);
        incomeGroups[dayIso].forEach(t => {
          const row = document.createElement('div');
          row.className = 'transaction-row';
          const amountText = '+' + formatCurrency(t.amount);
          row.innerHTML = `
            <div class="col-1"><strong>${t.category || ''}</strong></div>
            <div class="col-2"><span class="txn-amount income">${amountText}</span></div>
            <div class="col-2"><u>${t.paymentMethod || ''}</u></div>
            ${t.note || t.description ? `<div class="col-1"><small>${t.note || t.description || ''}</small></div>` : ''}
            <div class="txn-actions">
              <button class="btn-icon" data-edit title="Modifica"><i class="fa-solid fa-edit"></i></button>
            </div>
          `;
          row.querySelector('[data-edit]')?.addEventListener('click', () => this.app.openTransactionForEdit(t.id));
          container.appendChild(row);
        });
      });
    }

    // Render expenses section
    if (expenses.length > 0) {
      const expenseHeader = document.createElement('h3');
      expenseHeader.textContent = 'Expense';
      expenseHeader.style.margin = '16px 0 8px';
      expenseHeader.style.color = 'var(--danger)';
      container.appendChild(expenseHeader);

      const expenseGroups = expenses.reduce((acc, t) => {
        const key = t.date;
        (acc[key] ||= []).push(t);
        return acc;
      }, {});
      Object.keys(expenseGroups).sort((a, b) => b.localeCompare(a)).forEach(dayIso => {
        const header = document.createElement('h4');
        header.textContent = formatDate(dayIso);
        header.style.margin = '12px 0 6px';
        container.appendChild(header);
        expenseGroups[dayIso].forEach(t => {
          const row = document.createElement('div');
          row.className = 'transaction-row';
          let sign = '-';
          if (t.type === 'transfer') sign = '';
          const amountText = sign + formatCurrency(t.amount);
          const kindClass = t.type === 'transfer' ? 'transfer' : 'expense';
          row.innerHTML = `
            <div class="col-1"><strong>${t.category || ''}</strong></div>
            <div class="col-2"><span class="txn-amount ${kindClass}">${amountText}</span></div>
            <div class="col-2"><u>${t.paymentMethod || ''}</u></div>
            ${t.note || t.description ? `<div class="col-1"><small>${t.note || t.description || ''}</small></div>` : ''}
            <div class="txn-actions">
              <button class="btn-icon" data-edit title="Modifica"><i class="fa-solid fa-edit"></i></button>
            </div>
          `;
          row.querySelector('[data-edit]')?.addEventListener('click', () => this.app.openTransactionForEdit(t.id));
          container.appendChild(row);
        });
      });
    }
  }

  renderRecurring() {
    const data = this.app.data;
    const inc = document.getElementById('recurring-incomes');
    const exp = document.getElementById('recurring-expenses');
    if (!inc || !exp) return;
    inc.innerHTML = '';
    exp.innerHTML = '';

    data.recurring.incomes.forEach(item => {
      const card = document.createElement('div');
      card.className = 'recurring-card';
      const freq = item.frequency === 'annual' ? `${item.day}/${item.month}` : `Day ${item.day}`;
      card.innerHTML = `
        <div class="recurring-card-header">
          <div class="recurring-name">${item.name}</div>
          <button class="btn-icon" data-edit title="Edit"><i class="fa-solid fa-edit"></i></button>
        </div>
        <div class="recurring-amount income">${formatCurrency(item.amount)}</div>
        <div class="recurring-details">
          <span><i class="fa-solid fa-calendar-day"></i> ${freq}</span>
          <span><i class="fa-solid fa-tag"></i> ${item.category}</span>
        </div>
      `;
      card.querySelector('[data-edit]')?.addEventListener('click', () => this.app.openRecurringForEdit(item.id, 'income'));
      inc.appendChild(card);
    });
    
    data.recurring.expenses.forEach(item => {
      const card = document.createElement('div');
      card.className = 'recurring-card';
      const freq = item.frequency === 'annual' ? `${item.day}/${item.month}` : `Day ${item.day}`;
      card.innerHTML = `
        <div class="recurring-card-header">
          <div class="recurring-name">${item.name}</div>
          <button class="btn-icon" data-edit title="Edit"><i class="fa-solid fa-edit"></i></button>
        </div>
        <div class="recurring-amount expense">${formatCurrency(item.amount)}</div>
        <div class="recurring-details">
          <span><i class="fa-solid fa-calendar-day"></i> ${freq}</span>
          <span><i class="fa-solid fa-tag"></i> ${item.category}</span>
          ${item.paymentMethod ? `<span><i class="fa-solid fa-credit-card"></i> ${item.paymentMethod}</span>` : ''}
        </div>
      `;
      card.querySelector('[data-edit]')?.addEventListener('click', () => this.app.openRecurringForEdit(item.id, 'expense'));
      exp.appendChild(card);
    });
  }

  renderSettings() {
    const data = this.app.data;
    const incomeUL = document.getElementById('income-categories');
    const expenseUL = document.getElementById('expense-categories');
    const methodsUL = document.getElementById('payment-methods');
    if (!incomeUL || !expenseUL || !methodsUL) return;
    incomeUL.innerHTML = '';
    expenseUL.innerHTML = '';
    methodsUL.innerHTML = '';

    data.categories.income.forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `${c} <button class="btn-icon" data-edit><i class="fa-solid fa-edit"></i></button>`;
      li.querySelector('[data-edit]')?.addEventListener('click', () => this.app.editCategory('income', c));
      incomeUL.appendChild(li);
    });
    data.categories.expense.forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `${c} <button class="btn-icon" data-edit><i class="fa-solid fa-edit"></i></button>`;
      li.querySelector('[data-edit]')?.addEventListener('click', () => this.app.editCategory('expense', c));
      expenseUL.appendChild(li);
    });
    data.paymentMethods.forEach(m => {
      const li = document.createElement('li');
      li.innerHTML = `${m} <button class="btn-icon" data-edit><i class="fa-solid fa-edit"></i></button>`;
      li.querySelector('[data-edit]')?.addEventListener('click', () => this.app.editMethod(m));
      methodsUL.appendChild(li);
    });
  }

  // New views
  renderBanks() {
    const list = document.getElementById('banks-list');
    if (!list) return;
    list.innerHTML = '';
    this.app.data.banks.forEach(b => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <i class="fa-solid fa-building-columns" style="color:${b.colour};font-size:24px;"></i>
          <div style="flex:1;">
            <h4 style="margin:0;font-size:18px;">${b.name}</h4>
          </div>
          <button class="btn-icon" data-edit title="Modifica"><i class="fa-solid fa-edit"></i></button>
        </div>
      `;
      card.querySelector('[data-edit]')?.addEventListener('click', () => this.app.editBank(b.id));
      list.appendChild(card);
    });
  }

  renderGoals() {
    const list = document.getElementById('goals-list');
    if (!list) return;
    list.innerHTML = '';
    this.app.data.goals.forEach(g => {
      const card = document.createElement('div');
      card.className = 'card';
      const progress = g.target ? Math.min(100, Math.round((g.saved || 0) / g.target * 100)) : 0;
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <i class="fa-solid fa-coins" style="color:${g.colour || '#999'};font-size:24px;"></i>
          <div style="flex:1;">
            <h4 style="margin:0;font-size:18px;">${g.name}</h4>
            <div style="margin-top:8px;">
              <div style="display:flex;justify-content:space-between;font-size:14px;color:var(--muted);">
                <span>Saved: ${formatCurrency(g.saved || 0)}</span>
                <span>Target: ${formatCurrency(g.target || 0)}</span>
              </div>
              <div style="margin-top:4px;background:var(--border);height:8px;border-radius:4px;overflow:hidden;">
                <div style="background:${g.colour || '#999'};height:100%;width:${progress}%;transition:width 0.3s ease;"></div>
              </div>
              <div style="text-align:center;margin-top:4px;font-size:14px;font-weight:600;">${progress}%</div>
            </div>
          </div>
          <button class="btn-icon" data-edit title="Modifica"><i class="fa-solid fa-edit"></i></button>
        </div>
      `;
      card.querySelector('[data-edit]')?.addEventListener('click', () => this.app.editGoal(g.id));
      list.appendChild(card);
    });
  }
}

// app.js - main logic

import { Storage } from './storage.js';
import { UI } from './ui.js';
import { Charts } from './charts.js';
import { uuid, newBank, newGoal } from './utils.js';

class App {
	constructor() {
		this.storage = new Storage();
		this.ui = new UI(this);
		this.charts = new Charts();
		this.data = this.storage.getEmptyData();
		this.currentFileHandle = null;
		this.unsavedChanges = 0;
		this.init();
	}

	async init() {
		// Load and apply theme from localStorage before rendering
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme) {
			document.documentElement.setAttribute('data-theme', savedTheme);
		}

		// Auto-load from IndexedDB backup
		const auto = await this.storage.loadFromIndexedDB('auto');
		if (auto && this.storage.validateData(auto)) {
			this.data = auto;
			this.ui.showToast('Auto-loaded last session', 'success');
		}

		document.dispatchEvent(new Event('dataLoaded'));

		this.bindEvents();
		this.ui.renderAll();
		this.processRecurringTransactions();
		this.updateUnsavedBadge();
		this.setThemeIcon();

		// PWA install prompt capture
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			this.deferredPrompt = e;
		});
	}

	bindEvents() {
		// Navigation: SPA handling only if data-view present; otherwise let normal navigation proceed
		document.querySelectorAll('.nav-link').forEach(a => a.addEventListener('click', (e) => {
			const view = a.dataset.view;
			// Auto-close sidebar on any navigation (mobile)
			const sb = document.getElementById('sidebar');
			if (sb) sb.classList.remove('show');
			if (!view) return; // multi-page link, allow default navigation
			e.preventDefault();
			document.querySelectorAll('.nav-link').forEach(x => x.classList.remove('active'));
			document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
			a.classList.add('active');
			document.getElementById(view)?.classList.add('active');
			if (view === 'transactions') this.ui.renderTransactions();
			if (view === 'recurring') this.ui.renderRecurring();
			if (view === 'settings') this.ui.renderSettings();
			if (view === 'banks') this.ui.renderBanks();
			if (view === 'goals') this.ui.renderGoals();
		}));

		// Sidebar toggle
		document.getElementById('menu-toggle')?.addEventListener('click', () => {
			const sb = document.getElementById('sidebar');
			if (!sb) return;
			sb.classList.toggle('show');
		});

		// Theme
		document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggleTheme());

		// File actions
		document.getElementById('open-json')?.addEventListener('click', () => this.openJsonFile());
		document.getElementById('save-json')?.addEventListener('click', () => this.saveJsonFile());
		document.getElementById('unsaved-badge')?.addEventListener('click', () => this.downloadJSON());
		document.getElementById('file-input')?.addEventListener('change', (e) => this.handleFileInput(e));

		// Filters
		document.getElementById('filter-type')?.addEventListener('change', () => this.ui.renderTransactions());
		document.getElementById('filter-category')?.addEventListener('change', () => this.ui.renderTransactions());
		document.getElementById('filter-method')?.addEventListener('change', () => this.ui.renderTransactions());
		document.getElementById('filter-month')?.addEventListener('change', () => this.ui.renderTransactions());

		// Modals
		document.getElementById('btn-new-transaction')?.addEventListener('click', () => this.openNewTransactionModal());
		document.getElementById('btn-new-transaction-home')?.addEventListener('click', () => this.openNewTransactionModal());
		document.getElementById('btn-new-recurring')?.addEventListener('click', () => this.openNewRecurringModal());

		// Transaction form logic
		const txnTypeEl = document.getElementById('txn-type');
		const amountEl = document.getElementById('txn-amount');
		txnTypeEl?.addEventListener('change', () => this.updateTxnFormMode());
		document.getElementById('txn-method')?.addEventListener('change', () => this.updateTxnFormMode());
		document.getElementById('txn-is-crypto')?.addEventListener('change', (e) => {
			document.getElementById('crypto-fields').style.display = e.target.checked ? 'grid' : 'none';
		});
		document.getElementById('transaction-form')?.addEventListener('submit', (e) => this.handleTransactionSubmit(e));

		// Recurring form
		document.getElementById('recurring-form')?.addEventListener('submit', (e) => this.handleRecurringSubmit(e));
		document.getElementById('rec-type')?.addEventListener('change', () => {
			const isIncome = document.getElementById('rec-type').value === 'income';
			const grp = document.getElementById('rec-payment-group');
			if (grp) grp.style.display = isIncome ? 'none' : 'block';
		});

		// Recurring frequency toggle
		document.getElementById('rec-frequency')?.addEventListener('change', () => {
			const freq = document.getElementById('rec-frequency').value;
			const monthGroup = document.getElementById('rec-month-group');
			if (monthGroup) monthGroup.style.display = (freq === 'annual') ? 'block' : 'none';
		});

		// Set default dates to today
		this.setDefaultDates();

		// Settings buttons
		document.getElementById('btn-add-income-cat')?.addEventListener('click', () => this.addCategory('income'));
		document.getElementById('btn-add-expense-cat')?.addEventListener('click', () => this.addCategory('expense'));
		document.getElementById('btn-add-method')?.addEventListener('click', () => this.addMethod());
		document.getElementById('btn-download-sample')?.addEventListener('click', () => this.downloadSampleJson());
		document.getElementById('btn-install-pwa')?.addEventListener('click', () => this.installPWA());
		// Banks & Goals
		document.getElementById('btn-add-bank')?.addEventListener('click', () => this.addBank());
		document.getElementById('btn-add-goal')?.addEventListener('click', () => this.addGoal());
		document.getElementById('link-privacy')?.addEventListener('click', (e) => { e.preventDefault(); this.ui.openModal('modal-privacy'); });
		document.getElementById('link-how')?.addEventListener('click', (e) => { e.preventDefault(); this.ui.openModal('modal-how'); });
	}
	installPWA() {
		if (this.deferredPrompt) {
			this.deferredPrompt.prompt();
			this.deferredPrompt.userChoice.finally(() => { this.deferredPrompt = null; });
		} else {
			this.ui.showToast('Use your browser’s Install option to add the app', 'warning');
		}
	}

	// THEME
	setThemeIcon() {
		const icon = document.getElementById('theme-icon');
		const btn = document.getElementById('theme-toggle');
		if (!icon) return;
		const theme = document.documentElement.getAttribute('data-theme') || 'light';
		// Use FontAwesome classes instead of inline SVG
		icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
		if (btn) btn.title = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
	}
	toggleTheme() {
		const html = document.documentElement;
		const current = html.getAttribute('data-theme') || 'light';
		const next = current === 'light' ? 'dark' : 'light';
		html.setAttribute('data-theme', next);
		localStorage.setItem('theme', next);
		this.setThemeIcon();
	}

	// FILE IO
	async openJsonFile() {
		try {
			const [handle] = await window.showOpenFilePicker({
				types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
			});
			const file = await handle.getFile();
			await this.loadFromFile(file);
			this.currentFileHandle = handle;
		} catch (e) {
			if (e?.name !== 'AbortError') {
				// fallback
				document.getElementById('file-input').click();
			}
		}
	}

	async saveJsonFile() {
		const text = JSON.stringify(this.data, null, 2);
		const date = new Date().toISOString().split('T')[0];
		const blob = new Blob([text], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `talous-${date}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		this.unsavedChanges = 0;
		this.updateUnsavedBadge();
		this.ui.showToast('File downloaded', 'success');
	}

	async handleFileInput(e) {
		const file = e.target.files?.[0];
		e.target.value = '';
		if (!file) return;
		const sizeMb = file.size / (1024 * 1024);
		if (sizeMb > 5) {
			this.ui.showToast('JSON file exceeds 5MB limit', 'warning');
			return;
		}
		await this.loadFromFile(file);
	}

	async loadFromFile(file) {
		try {
			const text = await file.text();
			const json = JSON.parse(text);
			if (!this.storage.validateData(json)) throw new Error('Invalid JSON');
			this.data = json;
			await this.storage.saveToIndexedDB('auto', this.data);
			this.unsavedChanges = 0;
			this.ui.renderAll();
			this.updateUnsavedBadge();
			this.ui.showToast('File loaded', 'success');
		} catch (e) {
			this.ui.showToast('Invalid JSON', 'error');
		}
	}

	async downloadJSON() {
		const text = JSON.stringify(this.data, null, 2);
		try {
			await navigator.clipboard.writeText(text);
			this.ui.showToast('JSON copied to clipboard', 'success');
		} catch (e) {
			// Fallback: create a data URL and open in new tab
			const blob = new Blob([text], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			window.open(url, '_blank');
			URL.revokeObjectURL(url);
			this.ui.showToast('JSON opened in new tab', 'info');
		}
		// reset badge, but keep auto-backup updated
		this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
		this.unsavedChanges = 0;
		this.updateUnsavedBadge();
	}

	// DATA OPS
	updateTxnFormMode() {
		const type = document.getElementById('txn-type')?.value;
		const method = document.getElementById('txn-method')?.value;
		const paymentGroup = document.getElementById('payment-method-group');
		const catGroup = document.getElementById('txn-category-group');
		const cryptoFields = document.getElementById('crypto-fields');
		const transferFields = document.getElementById('transfer-fields');
		const amountEl = document.getElementById('txn-amount');
		if (!type) return;
		const isIncome = type === 'income';
		const isExpense = type === 'expense';
		const isTransfer = type === 'transfer';
		const isCrypto = method === 'Crypto' && isExpense;
		paymentGroup.style.display = (isIncome || isTransfer) ? 'none' : 'block';
		catGroup.style.display = 'block';
		cryptoFields.style.display = isCrypto ? 'grid' : 'none';
		transferFields.style.display = isTransfer ? 'grid' : 'none';
		amountEl.disabled = isCrypto; // amount auto-calculated
		if (isTransfer) {
			amountEl.disabled = false; // user defines transfer sum
		}
	}

	async handleTransactionSubmit(e) {
		e.preventDefault();
		const typeSel = document.getElementById('txn-type').value;
		const methodSel = document.getElementById('txn-method').value;
		const isCrypto = methodSel === 'Crypto' && typeSel === 'expense';
		const t = {
			id: uuid(),
			type: typeSel,
			amount: 0,
			currency: 'EUR',
			category: document.getElementById('txn-category').value,
			paymentMethod: methodSel || undefined,
			bank: document.getElementById('txn-bank')?.value || undefined,
			date: document.getElementById('txn-date').value || new Date().toISOString().split('T')[0],
			note: document.getElementById('txn-note').value || undefined,
		};
		if (isCrypto) {
			t.cryptoTicker = document.getElementById('txn-crypto-ticker').value || undefined;
			const eur = parseFloat(document.getElementById('txn-crypto-value').value) || 0;
			const qty = parseFloat(document.getElementById('txn-crypto-qty').value) || 0;
			t.cryptoEurValue = eur || undefined;
			t.cryptoQuantity = qty || undefined;
			// Amount = EUR value * quantity (expense)
			t.amount = eur * qty;
			if (!t.paymentMethod) t.paymentMethod = 'Crypto';
		}
		else {
			// Non-crypto amount comes from the field
			t.amount = parseFloat(document.getElementById('txn-amount').value) || 0;
		}

		// Bank transfer represented as expense with method 'Transfer' (neutral), optionally category 'Transfer'
		if (t.type === 'transfer') {
			// Use from/to banks when present
			const fromBank = document.getElementById('txn-from-bank')?.value;
			const toBank = document.getElementById('txn-to-bank')?.value;
			if (fromBank || toBank) t.note = `Transfer ${fromBank || ''}→${toBank || ''}`.trim();
		}

		// Edit vs Add: when editing, reuse id and replace existing
		const form = e.target;
		const editId = form?.dataset?.editId;
		if (editId) {
			const idx = this.data.transactions.findIndex(x => x.id === editId);
			if (idx !== -1) {
				// Replace preserving original id
				t.id = editId;
				this.data.transactions.splice(idx, 1, t);
			} 
			form.dataset.editId = '';
		} else {
			this.data.transactions.push(t);
		}
		await this.storage.saveToIndexedDB('auto', this.data);
		this.incrementUnsaved();
		this.ui.renderDashboard();
		this.ui.renderTransactions();
		this.ui.closeModal('transaction-modal');
		e.target.reset();
		this.updateTxnFormMode();
	}

	openTransactionForEdit(id) {
		const t = this.data.transactions.find(x => x.id === id);
		if (!t) return;
		const form = document.getElementById('transaction-form');
		if (!form) return;
		form.dataset.editId = id;
		document.getElementById('txn-type').value = t.type;
		document.getElementById('txn-amount').value = String(t.amount || 0);
		document.getElementById('txn-date').value = t.date || '';
		document.getElementById('txn-category').value = t.category || '';
		document.getElementById('txn-method').value = t.paymentMethod || '';
		const bankEl = document.getElementById('txn-bank');
		if (bankEl) bankEl.value = t.bank || '';
		document.getElementById('txn-note').value = t.note || '';
		const isCrypto = t.paymentMethod === 'Crypto' && t.type === 'expense';
		const cryptoFields = document.getElementById('crypto-fields');
		cryptoFields.style.display = isCrypto ? 'grid' : 'none';
		document.getElementById('txn-crypto-ticker').value = t.cryptoTicker || '';
		document.getElementById('txn-crypto-value').value = (t.cryptoEurValue ?? '')
		const qtyEl = document.getElementById('txn-crypto-qty'); if (qtyEl) qtyEl.value = (t.cryptoQuantity ?? 1);
		// Update modal title
		const modalTitle = document.getElementById('transaction-modal-title');
		if (modalTitle) modalTitle.textContent = 'Edit transaction';
		// Show delete button in edit mode
		const delBtn = document.getElementById('txn-delete-btn');
		if (delBtn) {
			delBtn.style.display = 'inline-flex';
			delBtn.onclick = async () => { await this.deleteTransaction(id); delBtn.onclick = null; };
		}
		this.updateTxnFormMode();
		this.ui.openModal('transaction-modal');
	}

	openNewTransactionModal() {
		const form = document.getElementById('transaction-form');
		if (!form) return;
		form.reset();
		form.dataset.editId = '';
		// Hide delete button in new mode
		const delBtn = document.getElementById('txn-delete-btn');
		if (delBtn) { delBtn.style.display = 'none'; delBtn.onclick = null; }
		// Update modal title
		const modalTitle = document.getElementById('transaction-modal-title');
		if (modalTitle) modalTitle.textContent = 'New transaction';
		this.setDefaultDates();
		this.updateTxnFormMode();
		this.ui.openModal('transaction-modal');
	}

	async handleRecurringSubmit(e) {
		e.preventDefault();
		const type = document.getElementById('rec-type').value;
		const form = e.target;
		const editId = form?.dataset?.editId;
		const editType = form?.dataset?.editType;
		const item = {
			id: editId || uuid(),
			name: document.getElementById('rec-name').value,
			amount: parseFloat(document.getElementById('rec-amount').value) || 0,
			day: parseInt(document.getElementById('rec-day').value, 10),
			category: document.getElementById('rec-category').value,
			frequency: document.getElementById('rec-frequency').value,
		};
		if (item.frequency === 'annual') {
			item.month = parseInt(document.getElementById('rec-month').value, 10);
		}
		if (type === 'expense') item.paymentMethod = document.getElementById('rec-method').value;
		if (editId) {
			// Remove from old list
			let oldList = this.data.recurring.incomes;
			let idx = oldList.findIndex(x => x.id === editId);
			if (idx === -1) {
				oldList = this.data.recurring.expenses;
				idx = oldList.findIndex(x => x.id === editId);
			}
			if (idx !== -1) oldList.splice(idx, 1);
			// Add to new list
			if (type === 'income') this.data.recurring.incomes.push(item); else this.data.recurring.expenses.push(item);
			// clear edit markers
			form.dataset.editId = '';
			form.dataset.editType = '';
		} else {
			if (type === 'income') this.data.recurring.incomes.push(item); else this.data.recurring.expenses.push(item);
		}
		await this.storage.saveToIndexedDB('auto', this.data);
		this.incrementUnsaved();
		this.ui.renderRecurring();
		this.ui.closeModal('recurring-modal');
		e.target.reset();
	}

	openRecurringForEdit(id, type) {
		const list = type === 'income' ? this.data.recurring.incomes : this.data.recurring.expenses;
		const item = list.find(x => x.id === id);
		if (!item) return;
		// Prefill form
		const form = document.getElementById('recurring-form');
		if (!form) return;
		form.dataset.editId = id;
		form.dataset.editType = type;
		document.getElementById('rec-type').value = type;
		document.getElementById('rec-frequency').value = item.frequency || 'monthly';
		document.getElementById('rec-name').value = item.name || '';
		document.getElementById('rec-amount').value = String(item.amount || 0);
		document.getElementById('rec-day').value = String(item.day || 1);
		const monthGroup = document.getElementById('rec-month-group');
		if (item.frequency === 'annual') {
			if (monthGroup) monthGroup.style.display = 'block';
			document.getElementById('rec-month').value = String(item.month || 1);
		} else {
			if (monthGroup) monthGroup.style.display = 'none';
		}
		document.getElementById('rec-category').value = item.category || '';
		const payGroup = document.getElementById('rec-payment-group');
		if (type === 'income') { if (payGroup) payGroup.style.display = 'none'; }
		else { if (payGroup) payGroup.style.display = 'block'; document.getElementById('rec-method').value = item.paymentMethod || ''; }
		const title = document.getElementById('modal-title-recurring'); if (title) title.textContent = 'Edit recurring';
		// Show delete button in edit mode
		const delBtn = document.getElementById('rec-delete-btn');
		if (delBtn) {
			delBtn.style.display = 'inline-flex';
			delBtn.onclick = async () => { await this.deleteRecurring(id, type); delBtn.onclick = null; };
		}
		this.ui.openModal('recurring-modal');
	}

	openNewRecurringModal() {
		const form = document.getElementById('recurring-form');
		if (!form) return;
		form.reset();
		form.dataset.editId = '';
		form.dataset.editType = '';
		// Hide delete button
		const delBtn = document.getElementById('rec-delete-btn');
		if (delBtn) { delBtn.style.display = 'none'; delBtn.onclick = null; }
		this.setDefaultDates();
		this.ui.openModal('recurring-modal');
	}

	async deleteTransaction(id) {
		const idx = this.data.transactions.findIndex(t => t.id === id);
		if (idx !== -1) {
			this.data.transactions.splice(idx, 1);
			this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
			this.incrementUnsaved();
			this.ui.renderDashboard();
			this.ui.renderTransactions();
			this.ui.closeModal('transaction-modal');
		}
	}
	async deleteRecurring(id, type) {
		const list = type === 'income' ? this.data.recurring.incomes : this.data.recurring.expenses;
		const idx = list.findIndex(x => x.id === id);
		if (idx !== -1) {
			list.splice(idx, 1);
			this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
			this.incrementUnsaved();
			this.ui.renderRecurring();
			this.ui.closeModal('recurring-modal');
		}
	}

	editCategory(type, name) {
		const input = document.getElementById('editor-input');
		const title = document.getElementById('editor-modal-title');
		const delBtn = document.getElementById('btn-delete-item');
		const colourRow = document.getElementById('editor-colour-row');
		const colourInput = document.getElementById('editor-colour');
		title.textContent = 'Edit Category';
		input.value = name;
		delBtn.style.display = 'block';
		colourRow.style.display = 'block';
		const map = this.data.categoryColours || (this.data.categoryColours = {});
		colourInput.value = map[name] || '#000000';
		this.ui.openModal('editor-modal');
		const form = document.getElementById('editor-form');
		const onDelete = () => {
			const arr = this.data.categories[type];
			const i = arr.indexOf(name); if (i !== -1) arr.splice(i, 1);
			if (map[name]) delete map[name];
			this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
			this.incrementUnsaved();
			this.ui.renderSettings();
			this.ui.closeModal('editor-modal');
			delBtn.onclick = null; form.onsubmit = null;
		};
		const onSubmit = (e) => {
			e.preventDefault();
			const arr = this.data.categories[type];
			const i = arr.indexOf(name); if (i !== -1) arr[i] = input.value.trim();
			map[input.value.trim()] = colourInput.value;
			if (input.value.trim() !== name && map[name]) delete map[name];
			this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
			this.incrementUnsaved();
			this.ui.renderSettings();
			this.ui.closeModal('editor-modal');
			delBtn.onclick = null; form.onsubmit = null;
		};
		delBtn.onclick = onDelete; form.onsubmit = onSubmit;
	}

	addCategory(type) {
		const input = document.getElementById('editor-input');
		const title = document.getElementById('editor-modal-title');
		const delBtn = document.getElementById('btn-delete-item');
		const colourRow = document.getElementById('editor-colour-row');
		const colourInput = document.getElementById('editor-colour');
		title.textContent = `Add ${type} category`;
		input.value = '';
		delBtn.style.display = 'none';
		colourRow.style.display = 'block';
		colourInput.value = '#000000';
		this.ui.openModal('editor-modal');
		const form = document.getElementById('editor-form');
		form.onsubmit = (e) => {
			e.preventDefault();
			const val = input.value.trim();
			if (!val) return;
			const arr = this.data.categories[type];
			if (!arr.includes(val)) arr.push(val);
			const map = this.data.categoryColours || (this.data.categoryColours = {});
			map[val] = colourInput.value;
			this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
			this.incrementUnsaved();
			this.ui.renderSettings();
			this.ui.closeModal('editor-modal');
			form.onsubmit = null;
		};
	}

	editMethod(name) {
		const input = document.getElementById('editor-input');
		const title = document.getElementById('editor-modal-title');
		const delBtn = document.getElementById('btn-delete-item');
		const colourRow = document.getElementById('editor-colour-row');
		const colourInput = document.getElementById('editor-colour');
		title.textContent = 'Edit Method';
		input.value = name;
		delBtn.style.display = 'block';
		colourRow.style.display = 'block';
		const map = this.data.methodColours || (this.data.methodColours = {});
		colourInput.value = map[name] || '#000000';
		this.ui.openModal('editor-modal');
		const form = document.getElementById('editor-form');
		delBtn.onclick = () => {
			const i = this.data.paymentMethods.indexOf(name);
			if (i !== -1) this.data.paymentMethods.splice(i, 1);
			if (map[name]) delete map[name];
			this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
			this.incrementUnsaved();
			this.ui.renderSettings();
			this.ui.closeModal('editor-modal');
			delBtn.onclick = null; form.onsubmit = null;
		};
		form.onsubmit = (e) => {
			e.preventDefault();
			const i = this.data.paymentMethods.indexOf(name);
			if (i !== -1) this.data.paymentMethods[i] = input.value.trim();
			map[input.value.trim()] = colourInput.value;
			if (input.value.trim() !== name && map[name]) delete map[name];
			this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
			this.incrementUnsaved();
			this.ui.renderSettings();
			this.ui.closeModal('editor-modal');
			delBtn.onclick = null; form.onsubmit = null;
		};
	}

	// BANKS CRUD
	addBank() {
		const input = document.getElementById('editor-input');
		const title = document.getElementById('editor-modal-title');
		const delBtn = document.getElementById('btn-delete-item');
		const colourRow = document.getElementById('editor-colour-row');
		const colourInput = document.getElementById('editor-colour');
		title.textContent = 'Add Bank';
		input.value = '';
		delBtn.style.display = 'none';
		colourRow.style.display = 'block';
		colourInput.value = '#2E86DE';
		// Hide goal extras if present
		const tgtRow = document.getElementById('editor-target-row'); if (tgtRow) tgtRow.style.display = 'none';
		const savedRow = document.getElementById('editor-saved-row'); if (savedRow) savedRow.style.display = 'none';
		this.ui.openModal('editor-modal');
		const form = document.getElementById('editor-form');
		form.onsubmit = (e) => {
			e.preventDefault();
			const name = input.value.trim(); if (!name) return;
			this.data.banks.push(newBank(name, colourInput.value || '#2E86DE'));
			this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
			this.incrementUnsaved();
			this.ui.updateBankSelects();
			this.ui.renderBanks();
			this.ui.closeModal('editor-modal');
			form.onsubmit = null;
		};
	}

	editBank(id) {
		const bank = this.data.banks.find(b => b.id === id);
		if (!bank) return;
		const input = document.getElementById('editor-input');
		const title = document.getElementById('editor-modal-title');
		const delBtn = document.getElementById('btn-delete-item');
		const colourRow = document.getElementById('editor-colour-row');
		const colourInput = document.getElementById('editor-colour');
		title.textContent = 'Edit Bank';
		input.value = bank.name;
		delBtn.style.display = 'block';
		colourRow.style.display = 'block';
		colourInput.value = bank.colour || '#2E86DE';
		// Hide goal extras if present
		const tgtRow = document.getElementById('editor-target-row'); if (tgtRow) tgtRow.style.display = 'none';
		const savedRow = document.getElementById('editor-saved-row'); if (savedRow) savedRow.style.display = 'none';
		this.ui.openModal('editor-modal');
		const form = document.getElementById('editor-form');
		delBtn.onclick = () => {
			this.deleteBank(id);
			form.onsubmit = null; delBtn.onclick = null;
		};
		form.onsubmit = (e) => {
			e.preventDefault();
			bank.name = input.value.trim();
			bank.colour = colourInput.value || bank.colour;
			this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
			this.incrementUnsaved();
			this.ui.updateBankSelects();
			this.ui.renderBanks();
			this.ui.closeModal('editor-modal');
			form.onsubmit = null; delBtn.onclick = null;
		};
	}

	async deleteBank(id) {
		const i = this.data.banks.findIndex(b => b.id === id);
		if (i !== -1) {
			this.data.banks.splice(i, 1);
			this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
			this.incrementUnsaved();
			this.ui.updateBankSelects();
			this.ui.renderBanks();
			this.ui.closeModal('editor-modal');
		}
	}

	// GOALS CRUD
	addGoal() {
		const input = document.getElementById('editor-input');
		const title = document.getElementById('editor-modal-title');
		const delBtn = document.getElementById('btn-delete-item');
		const colourRow = document.getElementById('editor-colour-row');
		const colourInput = document.getElementById('editor-colour');
		const tgtRow = document.getElementById('editor-target-row');
		const savedRow = document.getElementById('editor-saved-row');
		const tgtInput = document.getElementById('editor-target');
		const savedInput = document.getElementById('editor-saved');
		title.textContent = 'Add Goal';
		input.value = '';
		delBtn.style.display = 'none';
		colourRow.style.display = 'block';
		if (tgtRow) tgtRow.style.display = 'block'; if (savedRow) savedRow.style.display = 'block';
		colourInput.value = '#999999';
		if (tgtInput) tgtInput.value = '0'; if (savedInput) savedInput.value = '0';
		this.ui.openModal('editor-modal');
		const form = document.getElementById('editor-form');
		form.onsubmit = (e) => {
			e.preventDefault();
			const name = input.value.trim(); if (!name) return;
			const target = parseFloat(tgtInput?.value || '0') || 0;
			const saved = parseFloat(savedInput?.value || '0') || 0;
			this.data.goals.push(newGoal(name, target, saved, colourInput.value || '#999'));
			this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
			this.incrementUnsaved();
			this.ui.renderGoals();
			this.ui.closeModal('editor-modal');
			form.onsubmit = null;
		};
	}

	editGoal(id) {
		const goal = this.data.goals.find(g => g.id === id);
		if (!goal) return;
		const input = document.getElementById('editor-input');
		const title = document.getElementById('editor-modal-title');
		const delBtn = document.getElementById('btn-delete-item');
		const colourRow = document.getElementById('editor-colour-row');
		const colourInput = document.getElementById('editor-colour');
		const tgtRow = document.getElementById('editor-target-row');
		const savedRow = document.getElementById('editor-saved-row');
		const tgtInput = document.getElementById('editor-target');
		const savedInput = document.getElementById('editor-saved');
		title.textContent = 'Edit Goal';
		input.value = goal.name;
		delBtn.style.display = 'block';
		colourRow.style.display = 'block';
		if (tgtRow) tgtRow.style.display = 'block'; if (savedRow) savedRow.style.display = 'block';
		colourInput.value = goal.colour || '#999999';
		if (tgtInput) tgtInput.value = String(goal.target || 0);
		if (savedInput) savedInput.value = String(goal.saved || 0);
		this.ui.openModal('editor-modal');
		const form = document.getElementById('editor-form');
		delBtn.onclick = () => { this.deleteGoal(id); form.onsubmit = null; delBtn.onclick = null; };
		form.onsubmit = (e) => {
			e.preventDefault();
			goal.name = input.value.trim();
			goal.colour = colourInput.value || goal.colour;
			goal.target = parseFloat(tgtInput?.value || '0') || 0;
			goal.saved = parseFloat(savedInput?.value || '0') || 0;
			this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
			this.incrementUnsaved();
			this.ui.renderGoals();
			this.ui.closeModal('editor-modal');
			form.onsubmit = null; delBtn.onclick = null;
		};
	}

	async deleteGoal(id) {
		const i = this.data.goals.findIndex(g => g.id === id);
		if (i !== -1) {
			this.data.goals.splice(i, 1);
			this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
			this.incrementUnsaved();
			this.ui.renderGoals();
			this.ui.closeModal('editor-modal');
		}
	}

	addMethod() {
		const input = document.getElementById('editor-input');
		const title = document.getElementById('editor-modal-title');
		const delBtn = document.getElementById('btn-delete-item');
		const colourRow = document.getElementById('editor-colour-row');
		const colourInput = document.getElementById('editor-colour');
		title.textContent = 'Add Method';
		input.value = '';
		delBtn.style.display = 'none';
		colourRow.style.display = 'block';
		colourInput.value = '#000000';
		this.ui.openModal('editor-modal');
		const form = document.getElementById('editor-form');
		form.onsubmit = (e) => {
			e.preventDefault();
			const val = input.value.trim();
			if (!val) return;
			if (!this.data.paymentMethods.includes(val)) this.data.paymentMethods.push(val);
			const map = this.data.methodColours || (this.data.methodColours = {});
			map[val] = colourInput.value;
			this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
			this.incrementUnsaved();
			this.ui.renderSettings();
			this.ui.closeModal('editor-modal');
			form.onsubmit = null;
		};
	}

	// Badge + autosave
	incrementUnsaved() { this.unsavedChanges++; this.updateUnsavedBadge(); }
	updateUnsavedBadge() {
		const badge = document.getElementById('unsaved-badge');
		const count = document.getElementById('unsaved-count');
		if (this.unsavedChanges > 0) {
			badge.style.display = 'flex';
			count.textContent = String(this.unsavedChanges);
		} else {
			badge.style.display = 'none';
		}

		// Update balance colour (red if negative)
		const totalIncome = this.data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
		const totalExpense = this.data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
		const bal = totalIncome - totalExpense;
		const balanceEl = document.getElementById('current-balance');
		if (balanceEl) {
			if (bal < 0) balanceEl.classList.add('negative'); else balanceEl.classList.remove('negative');
		}
	}

	processRecurringTransactions() {
		const today = new Date();
		let totalAdded = 0;
		
		// Process incomes
		this.data.recurring.incomes.forEach(rec => {
			const count = this.generateMissingRecurringTransactions(rec, 'income', today);
			totalAdded += count;
		});

		// Process expenses
		this.data.recurring.expenses.forEach(rec => {
			const count = this.generateMissingRecurringTransactions(rec, 'expense', today);
			totalAdded += count;
		});

		if (totalAdded > 0) {
			this.ui.renderAll();
			this.ui.showToast(`Generated ${totalAdded} recurring transaction(s)`, 'success');
		}
	}

	generateMissingRecurringTransactions(rec, type, today) {
		// Find the oldest transaction to determine start date
		const existingDates = this.data.transactions
			.filter(t => t.recurringId === rec.id)
			.map(t => new Date(t.date));
		
		let startDate;
		if (existingDates.length > 0) {
			// Start from the last occurrence
			const lastDate = new Date(Math.max(...existingDates));
			startDate = new Date(lastDate);
			// Move to next occurrence
			if (rec.frequency === 'monthly') {
				startDate.setMonth(startDate.getMonth() + 1);
			} else if (rec.frequency === 'annual') {
				startDate.setFullYear(startDate.getFullYear() + 1);
			}
		} else {
			// No existing transactions, start from current month or year
			startDate = new Date(today);
			startDate.setDate(rec.day);
			
			if (rec.frequency === 'annual') {
				startDate.setMonth(rec.month - 1);
			}
			
			// If the date is in the future, move back one period
			if (startDate > today) {
				if (rec.frequency === 'monthly') {
					startDate.setMonth(startDate.getMonth() - 1);
				} else if (rec.frequency === 'annual') {
					startDate.setFullYear(startDate.getFullYear() - 1);
				}
			}
		}

		// Generate all missing transactions up to today
		const currentDate = new Date(startDate);
		let addedCount = 0;
		
		while (currentDate <= today && addedCount < 120) { // Safety limit
			const dateStr = currentDate.toISOString().split('T')[0];
			
			// Check if transaction already exists
			const exists = this.data.transactions.some(t => 
				t.recurringId === rec.id && t.date === dateStr
			);
			
			if (!exists) {
				// Add new transaction
				const transaction = {
					id: uuid(),
					type: type,
					amount: rec.amount,
					currency: this.data.baseCurrency,
					category: rec.category,
					date: dateStr,
					note: rec.name,
					recurringId: rec.id
				};
				
				if (rec.bank) {
					transaction.bank = rec.bank;
				}
				
				if (type === 'expense' && rec.paymentMethod) {
					transaction.paymentMethod = rec.paymentMethod;
				}
				
				this.data.transactions.push(transaction);
				addedCount++;
			}
			
			// Move to next occurrence
			if (rec.frequency === 'monthly') {
				currentDate.setMonth(currentDate.getMonth() + 1);
			} else if (rec.frequency === 'annual') {
				currentDate.setFullYear(currentDate.getFullYear() + 1);
			} else {
				break; // Unknown frequency
			}
		}

		if (addedCount > 0) {
			this.storage.saveToIndexedDB('auto', this.data).catch(() => {});
			this.incrementUnsaved();
			console.log(`Generated ${addedCount} recurring transactions for ${rec.name}`);
		}

		return addedCount;
	}

	downloadSampleJson() {
		// Generate one month of expenses sample
		const today = new Date();
		const start = new Date(today.getFullYear(), today.getMonth(), 1);
		const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
		const categories = ['Food', 'Rent', 'Transport', 'Entertainment', 'Groceries'];
		const methods = ['Cash', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Wallet'];
		const sample = {
			version: '1.0',
			baseCurrency: 'EUR',
			transactions: [],
			categories: { income: ['Salary'], expense: [...categories] },
			paymentMethods: [...methods],
			recurring: { incomes: [], expenses: [] }
		};
		for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
			// 0-2 expenses per day
			const count = Math.floor(Math.random() * 3);
			for (let i = 0; i < count; i++) {
				sample.transactions.push({
					id: uuid(),
					type: 'expense',
					amount: parseFloat((Math.random() * 50 + 5).toFixed(2)),
					currency: 'EUR',
					category: categories[Math.floor(Math.random() * categories.length)],
					paymentMethod: methods[Math.floor(Math.random() * methods.length)],
					date: new Date(d).toISOString().split('T')[0],
					note: undefined
				});
			}
		}
		const json = JSON.stringify(sample, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const a = document.createElement('a');
		const fname = `talous-sample-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}.json`;
		const url = URL.createObjectURL(blob);
		a.href = url; a.download = fname; a.click();
		URL.revokeObjectURL(url);
	}

	setDefaultDates() {
		const today = new Date();
		const todayStr = today.toISOString().split('T')[0];
		const txn = document.getElementById('txn-date'); if (txn && !txn.value) txn.value = todayStr;
		const recDay = document.getElementById('rec-day'); if (recDay && !recDay.value) recDay.value = String(Math.min(28, today.getDate()));
		const recMonth = document.getElementById('rec-month'); if (recMonth && !recMonth.value) recMonth.value = String(today.getMonth() + 1);
	}
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
	window.app = new App();
});
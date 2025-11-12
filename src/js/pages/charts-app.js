// Simplified app.js for charts page
import { Storage } from '../storage.js';
import { UI } from '../ui.js';

class ChartsApp {
	constructor() {
		this.storage = new Storage();
		this.ui = new UI(this);
		this.data = this.storage.getEmptyData();
		this.init();
	}

	async init() {
		console.log('ChartsApp.init() started');
		
		// Load and apply theme from localStorage before rendering
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme) {
			document.documentElement.setAttribute('data-theme', savedTheme);
		}

		// Auto-load from IndexedDB backup
		const auto = await this.storage.loadFromIndexedDB('auto');
		if (auto && this.storage.validateData(auto)) {
			this.data = auto;
			console.log('Data loaded from IndexedDB:', this.data.transactions.length, 'transactions');
		} else {
			console.log('No data in IndexedDB');
		}

		// Dispatch dataLoaded event
		document.dispatchEvent(new Event('dataLoaded'));
		console.log('dataLoaded event dispatched');

		this.bindEvents();
		this.setThemeIcon();
	}

	bindEvents() {
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
		document.getElementById('file-input')?.addEventListener('change', (e) => this.handleFileInput(e));
	}

	toggleTheme() {
		const root = document.documentElement;
		const current = root.getAttribute('data-theme') || 'dark';
		const next = current === 'dark' ? 'light' : 'dark';
		root.setAttribute('data-theme', next);
		localStorage.setItem('theme', next);
		this.setThemeIcon();
	}

	setThemeIcon() {
		const icon = document.getElementById('theme-icon');
		if (!icon) return;
		const theme = document.documentElement.getAttribute('data-theme') || 'dark';
		icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
	}

	async openJsonFile() {
		try {
			const [handle] = await window.showOpenFilePicker({
				types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
				multiple: false
			});
			const file = await handle.getFile();
			const text = await file.text();
			const parsed = JSON.parse(text);
			if (this.storage.validateData(parsed)) {
				this.data = parsed;
				await this.storage.saveToIndexedDB('auto', this.data);
				this.ui.showToast('File loaded successfully', 'success');
				document.dispatchEvent(new Event('dataLoaded'));
			} else {
				this.ui.showToast('Invalid JSON format', 'error');
			}
		} catch (e) {
			if (e.name !== 'AbortError') {
				document.getElementById('file-input')?.click();
			}
		}
	}

	async saveJsonFile() {
		try {
			const handle = await window.showSaveFilePicker({
				suggestedName: 'talous-data.json',
				types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
			});
			const writable = await handle.createWritable();
			await writable.write(JSON.stringify(this.data, null, 2));
			await writable.close();
			this.ui.showToast('File saved', 'success');
		} catch (e) {
			if (e.name !== 'AbortError') {
				this.downloadJSON();
			}
		}
	}

	handleFileInput(e) {
		const file = e.target.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = async (ev) => {
			try {
				const parsed = JSON.parse(ev.target.result);
				if (this.storage.validateData(parsed)) {
					this.data = parsed;
					await this.storage.saveToIndexedDB('auto', this.data);
					this.ui.showToast('File loaded successfully', 'success');
					document.dispatchEvent(new Event('dataLoaded'));
				} else {
					this.ui.showToast('Invalid JSON format', 'error');
				}
			} catch (err) {
				this.ui.showToast('Error reading file', 'error');
			}
		};
		reader.readAsText(file);
		e.target.value = '';
	}

	downloadJSON() {
		const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'talous-data.json';
		a.click();
		URL.revokeObjectURL(url);
		this.ui.showToast('File downloaded', 'success');
	}
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
	console.log('ChartsApp DOMContentLoaded');
	window.app = new ChartsApp();
});

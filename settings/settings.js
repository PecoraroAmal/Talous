// settings.js - Settings page logic

import { SAMPLE_DATA } from '../example/example.js';

let data = {
  transactions: [],
  categories: {
    income: [],
    expense: []
  },
  paymentMethods: [],
  banks: [],
  goals: []
};

// PWA install prompt handling
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById('install-pwa-btn');
  if (btn) btn.style.display = 'inline-flex';
});

window.addEventListener('appinstalled', async () => {
  deferredInstallPrompt = null;
  const btn = document.getElementById('install-pwa-btn');
  if (btn) btn.style.display = 'none';
  try { await showMessage({ title: 'Installed', message: 'App installed successfully.', okText: 'OK' }); } catch {}
});

function loadData() {
  const stored = localStorage.getItem('talousData');
  if (stored) {
    try {
      data = JSON.parse(stored);
    } catch (e) {
      console.error('Error loading data:', e);
    }
  } else {
    // Initialize with sample data if no data exists
    data = JSON.parse(JSON.stringify(SAMPLE_DATA)); // Deep copy
    saveData();
  }
}

function saveData() {
  localStorage.setItem('talousData', JSON.stringify(data));
}

// Upload JSON
function uploadJSON() {
  const input = document.getElementById('upload-input');
  input.click();
}

function showConfirm({ title = 'Confirm', message = '', confirmText = 'Confirm', cancelText = 'Cancel', acceptClass } = {}) {
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');
  const acceptBtn = document.getElementById('confirm-accept-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');

  titleEl.textContent = title;
  msgEl.textContent = message;
  acceptBtn.textContent = confirmText;
  cancelBtn.textContent = cancelText;
  if (acceptClass) acceptBtn.classList.add(acceptClass);

  modal.classList.remove('hidden');

  return new Promise((resolve) => {
    const onAccept = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    const onOverlay = (ev) => { if (ev.target === modal) { cleanup(); resolve(false); } };

    acceptBtn.addEventListener('click', onAccept);
    cancelBtn.addEventListener('click', onCancel);
    modal.addEventListener('click', onOverlay);

    function cleanup() {
      modal.classList.add('hidden');
      if (acceptClass) acceptBtn.classList.remove(acceptClass);
      acceptBtn.removeEventListener('click', onAccept);
      cancelBtn.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onOverlay);
    }
  });
}

function showMessage({ title = 'Message', message = '', okText = 'OK' } = {}) {
  const modal = document.getElementById('message-modal');
  const titleEl = document.getElementById('message-title');
  const msgEl = document.getElementById('message-text');
  const okBtn = document.getElementById('message-ok-btn');

  titleEl.textContent = title;
  msgEl.textContent = message;
  okBtn.textContent = okText;

  modal.classList.remove('hidden');

  return new Promise((resolve) => {
    const onOk = () => { cleanup(); resolve(true); };
    const onOverlay = (ev) => { if (ev.target === modal) { cleanup(); resolve(true); } };

    okBtn.addEventListener('click', onOk);
    modal.addEventListener('click', onOverlay);

    function cleanup() {
      modal.classList.add('hidden');
      okBtn.removeEventListener('click', onOk);
      modal.removeEventListener('click', onOverlay);
    }
  });
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async function(event) {
    try {
      const imported = JSON.parse(event.target.result);
      const confirmed = await showConfirm({
        title: 'Import Data',
        message: 'This will replace all your current data. Continue?',
        confirmText: 'Import',
        cancelText: 'Cancel',
        acceptClass: 'positive'
      });
      if (confirmed) {
        data = imported;
        saveData();
        await showMessage({ title: 'Import Complete', message: 'Data imported successfully!', okText: 'OK' });
        location.reload();
      }
    } catch (err) {
      await showMessage({ title: 'Invalid File', message: 'Invalid JSON file', okText: 'OK' });
    }
  };
  reader.readAsText(file);
}

// Download JSON
function downloadJSON() {
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `talous-data-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download sample JSON
function downloadSampleJSON() {
  const dataStr = JSON.stringify(SAMPLE_DATA, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'talous-sample-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Clear all data
async function clearAllData() {
  const confirmed = await showConfirm({
    title: 'Clear All Data',
    message: 'This will delete ALL your data. This cannot be undone. Continue?',
    confirmText: 'Delete',
    cancelText: 'Cancel'
  });
  if (!confirmed) return;

  localStorage.removeItem('talousData');
  await showMessage({ title: 'Cleared', message: 'All data has been cleared', okText: 'OK' });
  location.reload();
}

// Theme toggle
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (theme === 'dark') {
    icon.className = 'fa-solid fa-moon';
  } else {
    icon.className = 'fa-solid fa-sun';
  }
}

// Modal controls
function showModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

// Event listeners
document.getElementById('upload-btn')?.addEventListener('click', uploadJSON);
document.getElementById('upload-input')?.addEventListener('change', handleFileUpload);
// Remove default download listener; we will attach unified logic below.
document.getElementById('download-sample-btn')?.addEventListener('click', downloadSampleJSON);
document.getElementById('clear-btn')?.addEventListener('click', clearAllData);
document.getElementById('toggle-theme-btn')?.addEventListener('click', toggleTheme);
document.getElementById('install-pwa-btn')?.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  try {
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome !== 'accepted') {
      await showMessage({ title: 'Install', message: 'Install was dismissed.', okText: 'OK' });
    }
  } catch (err) {
    await showMessage({ title: 'Install Error', message: 'Could not start install.', okText: 'OK' });
  } finally {
    deferredInstallPrompt = null;
    const btn = document.getElementById('install-pwa-btn');
    if (btn) btn.style.display = 'none';
  }
});

document.getElementById('privacy-card')?.addEventListener('click', () => {
  showModal('privacy-modal');
});

document.getElementById('how-card')?.addEventListener('click', () => {
  showModal('how-modal');
});

document.getElementById('close-privacy-btn')?.addEventListener('click', () => hideModal('privacy-modal'));
document.getElementById('close-how-btn')?.addEventListener('click', () => hideModal('how-modal'));

// Close modals when clicking outside
document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
});

// Menu toggle
// sidebar removed

// Load theme on page load
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

// Initialise
loadData();

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/Talous/sw.js?v=2.3')
    .then(reg => console.log('Settings SW registered', reg.scope))
    .catch(err => console.warn('Settings SW registration failed', err));
}

// If user wants the download button to install the PWA instead of exporting data:
const downloadBtn = document.getElementById('download-btn');
if (downloadBtn) {
  downloadBtn.addEventListener('click', async (ev) => {
    // If install prompt available, prefer install
    if (deferredInstallPrompt) {
      ev.preventDefault();
      try {
        await deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          await showMessage({ title: 'Installed', message: 'App installed successfully.', okText: 'OK' });
        } else {
          await showMessage({ title: 'Install', message: 'Install dismissed.', okText: 'OK' });
        }
      } catch (err) {
        await showMessage({ title: 'Install Error', message: 'Unable to start installation.', okText: 'OK' });
      } finally {
        deferredInstallPrompt = null;
        // Hide install button if present
        const btn = document.getElementById('install-pwa-btn');
        if (btn) btn.style.display = 'none';
      }
    } else {
      // Normal download behavior
      downloadJSON();
    }
  });
}

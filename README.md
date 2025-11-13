# Talous – Personal Finance Tracker (PWA)

Minimal, fast, and fully offline-capable web app to manage your personal finances: accounts, payment methods, goals, transactions, and charts.

- Live site: https://pecoraroamal.github.io/Talous/
- Works offline after first load (Progressive Web App)
- All data stays on your device (localStorage)

## Project Structure

```
Talous/
├─ index.html           # Dashboard
├─ index.css            # Dashboard styles
├─ index.js             # Dashboard logic
├─ style.css            # Global styles (light/dark)
├─ manifest.json        # Web App Manifest
├─ sw.js                # Service Worker (offline cache)
│
├─ transactions/
│  ├─ transactions.html
│  ├─ transactions.css
│  └─ transactions.js
│
├─ charts/
│  ├─ charts.html
│  ├─ charts.css
│  └─ charts.js
│
├─ tools/
│  ├─ tools.html
│  ├─ tools.css
│  └─ tools.js
│
├─ settings/
│  ├─ settings.html
│  ├─ settings.css
│  └─ settings.js
│
└─ example/
  ├─ minimal.js        # Minimal data loaded on first visit
  └─ example.js        # Rich sample data (download from Settings)
```

## Features

- Dashboard: current balance, recent income/expenses
- Transactions: add/edit/delete, search, filters, transfers with safeguards
- Charts: income/expense by category and method, holdings and trend
- Tools: manage accounts, methods, categories, and saving goals
- Settings: import/export JSON, sample data, theme toggle, PWA install

## Data & Privacy

- Storage: browser `localStorage` under key `talousData`
- No backend; no data leaves your device
- First visit seeds minimal data from `example/minimal.js` (Settings → Sample downloads `example/example.js`)

### Data model (simplified)
```
{
  transactions: [],
  categories: { income: [], expense: [] },
  paymentMethods: [],
  banks: [],
  goals: [],
  balance: 0
}
```

## PWA

- Manifest: `manifest.json` with scope `/Talous/`
- Service Worker: `sw.js` cache-first for app shell and offline fallback
- Install: Settings → Install App (or browser menu). The Download button also triggers install when available; otherwise it exports JSON.

Notes for GitHub Pages deployment:
- App is hosted under `/Talous/`; links and assets use absolute paths prefixed with `/Talous/`.
- After deploying updates, force-refresh or clear site data to update the service worker.

## Tech Stack

- HTML, CSS, JavaScript (ES modules)
- Chart.js for visualisation
- No frameworks or build tools required

## Getting Started (Local)

1) Serve the folder locally (for service workers). Example with PowerShell:
```
npm install -g http-server
http-server -c-1 -p 8080 .
```
2) Open http://localhost:8080/Talous/
3) Add transactions or import/export from Settings
4) Install the PWA from the browser

Tip: On plain file:// the service worker won’t register; use a local web server or open the deployed site.

## License

See repository for license information.

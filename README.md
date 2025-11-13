# Talous - Personal Finance Tracker

A minimalist offline Progressive Web App for managing personal finances.

## Project Structure

```
Talous/
├── index.html          # Dashboard page
├── index.css           # Dashboard styles
├── index.js            # Dashboard logic
├── style.css           # Global shared styles (light/dark theme)
├── manifest.json       # PWA manifest
├── sw.js              # Service worker
│
├── transactions/      # Transaction management
│   ├── transactions.html
│   ├── transactions.css
│   └── transactions.js
│
├── charts/           # Charts and analytics
│   ├── charts.html
│   ├── charts.css
│   └── charts.js
│
├── tools/            # Banks, wallets, goals, categories
│   ├── tools.html
│   ├── tools.css
│   └── tools.js
│
├── example/          # Sample data
│   └── example.js
│
├── settings/         # Settings and data management
│   ├── settings.html
│   ├── settings.css
│   └── settings.js
│
└── src/
    └── icons/        # App icons and assets
```

## Features

### Dashboard (index.html)
- Current balance display
- Last 5 incoming transactions (left column)
- Last 5 outgoing transactions (right column)
- Add transaction button

### Transactions
- Create, edit, and delete transactions
- Transaction types: Income (green), Expense (red), Transfer (theme-based)
- Search and filter functionality
- Form with cancel and save options

### Charts
- 6 pie charts:
  - Income by category
  - Income by payment type
  - Expenses by category
  - Expenses by payment type
  - Holdings by place
  - Holdings by currency
- Money trend chart (line chart)

### Tools
- Manage Banks, Wallets, Crypto Wallets, and Piggy Banks
  - Auto-generated IDs
  - User-selected colours
  - Currency selection
- Saving Goals
  - Name, target balance, current balance
  - Start date and target date
  - Progress bars
- Categories
  - Auto-generated IDs
  - User-selected colours

### Settings
- Upload JSON (import data)
- Download JSON (export data)
- Download sample JSON
- Theme toggle (persists across all pages)
- Footer with:
  - Cookie & Privacy policy
  - How it Works
  - GitHub link
  - PayPal donation button

## Theme Support

**Light Theme:**
- White background
- Black text
- Green for positive numbers
- Red for negative numbers
- Black for transfers
- Yellow for crypto

**Dark Theme:**
- Black background
- White text
- Green for positive numbers
- Red for negative numbers
- White for transfers
- Yellow for crypto

## Data Storage

All data is stored locally in `localStorage` under the key `talousData`. No data is sent to any server.

Data structure:
```json
{
  "transactions": [],
  "categories": {
    "income": [],
    "expense": []
  },
  "paymentMethods": [],
  "banks": [],
  "goals": [],
  "categoryColours": {},
  "balance": 0
}
```

## PWA Features

This app can be installed as a Progressive Web App and works completely offline.

## Technology Stack

- Pure HTML, CSS, and JavaScript (ES6 modules)
- Chart.js for data visualisation
- Workbox for service worker caching
- No external frameworks or build tools required

## Development

All code is written in English (UK). The codebase is intentionally minimal and simple.

## Getting Started

1. Open `index.html` in a web browser
2. The app will load with empty data
3. Add your first transaction or import sample data from Settings
4. Install as PWA for offline use

## License

See repository for license information.

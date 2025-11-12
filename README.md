#  Talous

**Talous** is a minimalist, privacy-first Progressive Web App (PWA) for personal finance tracking. Built with a clean design philosophy inspired by modern fintech apps, it operates completely offline with no backend, accounts, or tracking.

##  ✨ Features

###  📊 Core Functionality
- **Dashboard** - Clean, centered balance display with immediate financial overview
- **Transaction Management** - Comprehensive income/expense tracking with detailed categorization
- **Data Visualization** - Interactive charts powered by Chart.js:
    - Expense breakdown by category (pie chart)
    - Payment method distribution (pie chart) 
    - Balance trends over time (line chart)
- **Multi-Bank Support** - Track balances across multiple bank accounts
- **Goal Setting** - Create and monitor savings targets with visual progress tracking
- **Automated Recurring** - Set up monthly income/expenses (salary, subscriptions, bills)
- **Flexible Configuration** - Customize categories, payment methods, and color schemes

###  🔒 Privacy & Security
- **100% Offline** - All data remains exclusively on your device
- **Zero Backend** - No servers, databases, or external dependencies
- **No Tracking** - Complete absence of cookies, analytics, or data collection
- **User-Controlled Data** - Full ownership via exportable JSON files

###  💾 Data Management
- **File System Access API** - Direct Open/Save JSON files (Chromium browsers)
- **Fallback Support** - File input/download for Firefox/Safari
- **Auto-Backup** - IndexedDB backup auto-loads on refresh
- **Unsaved Changes Badge** - Red floating indicator shows pending changes
- **Quick Download** - Click badge to download `talous-YYYY-MM-DD.json`

###  User Experience
- **Dark/Light Theme** - System preference detection + manual toggle
- **Theme Persistence** - Saved in localStorage across all pages
- **Responsive Design** - Mobile-first, works on all screen sizes
- **Modal Dialogs** - Centered, consistent forms throughout
- **Toast Notifications** - Non-intrusive success/error messages

###  Transaction Features
- Multi-currency support (EUR base with crypto tracking)
- Categories: Income/Expense with custom colors
- Payment Methods: Cash, Debit Card, Credit Card, Crypto, Wallet, Voucher
- Optional crypto ticker + manual EUR value
- Bank assignment for transactions
- Notes and detailed tracking

###  Recurring Transactions
- Monthly salary (day, amount, category, bank)
- Monthly expenses/subscriptions (day, amount, category, payment method, bank)
- Auto-generation when date  today

##  Getting Started

### Requirements
- Modern web browser (Chrome, Edge, Brave recommended)
- For File System Access API: Chromium-based browsers
- For fallback mode: Any modern browser (Firefox, Safari)

### Installation
1. Clone or download this repository
2. Open `index.html` in your browser
3. *Optional*: Install as PWA via browser's "Install app" menu

### Usage
1. **First Time**
   - Start with empty data or click "Open JSON" to load existing file
   - Add transactions, configure categories in Settings
   
2. **Daily Use**
   - Dashboard shows current balance automatically
   - Click "+" button to add transactions
   - View charts for spending insights
   - Manage goals and recurring items

3. **Saving Data**
   - Red badge shows unsaved changes count
   - Click badge or "Save JSON" to download your data
   - Auto-backup in IndexedDB loads on refresh

##  Project Structure

Talous/
 index.html              # Dashboard page
 manifest.json           # PWA manifest
 sw.js                   # Service worker (Workbox)
 pages/
    banks.html          # Bank accounts management
    charts.html         # Data visualization
    cookies.html        # Privacy statement
    goals.html          # Savings goals
    recurring.html      # Recurring transactions
    settings.html       # App configuration
    transactions.html   # Transaction list
 src/
    css/
       style.css       # Global styles
       pages/          # Page-specific styles
    icons/              # PWA icons & favicon
    js/
        app.js          # Main application logic
        charts.js       # Chart.js integration
        storage.js      # IndexedDB & data validation
        ui.js           # UI rendering & updates
        utils.js        # Utility functions
        pages/          # Page-specific scripts
 README.md

##  Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript ES6+ modules
- **Charts**: Chart.js 4.4.0 + chartjs-adapter-luxon
- **Date/Time**: Luxon 3.4.4
- **Icons**: Font Awesome 6.5.1 (CDN)
- **Storage**: IndexedDB (native) + JSON file exports
- **PWA**: Service Worker (Workbox) for offline functionality

##  JSON Data Structure

See the complete JSON schema in the app's Settings page or check `src/js/utils.js` for the EMPTY_DATA structure.

Key fields:
- **version**: Data format version (currently "1.0")
- **baseCurrency**: EUR (fixed)
- **transactions**: Array of income/expense/transfer records
- **categories**: Income and expense category lists
- **categoryColours**: Custom colors for categories
- **paymentMethods**: Available payment methods
- **methodColours**: Custom colors for payment methods
- **banks**: Bank account list with balances
- **goals**: Savings goals with targets and deadlines
- **recurring**: Monthly recurring income and expenses

##  PWA Features

- **Installable** - Add to home screen on mobile/desktop
- **Offline-First** - Works without internet connection
- **Service Worker** - Caches assets for instant loading
- **Auto-Update** - New versions update seamlessly

##  Limitations

- **EUR Base Currency** - Designed for EUR-based finances only
- **File Size Warning** - Shows alert if JSON exceeds 5MB
- **Browser Compatibility** - File System Access API requires Chromium browsers for best experience
- **No Cloud Sync** - Data is local-only (backup your JSON file!)

##  Privacy Statement

Talous respects your privacy:
-  No cookies
-  No tracking scripts
-  No analytics
-  No external API calls (except CDN for Chart.js/Font Awesome)
-  All data stays on your device
-  You control your data file

##  License

This project is open source and available for personal use.

##  Contributing

Feel free to submit issues or pull requests for improvements!

---

**Made with  for privacy-conscious individuals who want simple, effective personal finance tracking.**

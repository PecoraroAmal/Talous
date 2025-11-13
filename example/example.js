// example.js - Sample reflecting requested scenario (accounts + flows)

export const SAMPLE_DATA = {
  // Accounts (banks)
  banks: [
    { id: 'acc_bank_main', name: 'Main Bank', type: 'bank', colour: '#2E86DE', currency: 'EUR' },
    { id: 'acc_wallet', name: 'Cash Wallet', type: 'wallet_physical', colour: '#F39C12', currency: 'EUR' },
    { id: 'acc_wallet_online', name: 'Online Wallet', type: 'wallet_online', colour: '#003087', currency: 'EUR' },
    { id: 'acc_crypto', name: 'Crypto Wallet', type: 'crypto', colour: '#F2A900', currency: 'BTC' },
    { id: 'acc_piggy', name: 'Piggy Bank', type: 'piggy', colour: '#A3A3A3', currency: 'EUR' }
  ],

  // Payment Methods (respect account-type constraints)
  paymentMethods: [
    { id: 'met_card_visa', type: 'card', name: 'Visa', accountId: 'acc_bank_main', colour: '#2E86DE' },
    { id: 'met_cash_wallet', type: 'cash', name: 'Cash', accountId: 'acc_wallet', colour: '#F39C12' },
    { id: 'met_wallet_paypal', type: 'wallet', name: 'PayPal', accountId: 'acc_wallet_online', colour: '#003087' },
    { id: 'met_crypto_btc', type: 'crypto', name: 'BTC', accountId: 'acc_crypto', colour: '#F2A900' }
  ],

  // Categories (kept simple and clear)
  categories: {
    income: [
      { id: 'cat_income_salary', name: 'Salary', colour: '#2ECC71' },
      { id: 'cat_income_topup', name: 'Top-up', colour: '#34D399' }
    ],
    expense: [
      { id: 'cat_exp_subscriptions', name: 'Subscriptions', colour: '#9CA3AF' }, // Netflix
      { id: 'cat_exp_services', name: 'Services', colour: '#60A5FA' },         // PEC
      { id: 'cat_exp_dining', name: 'Dining', colour: '#F97316' },             // Restaurant
      { id: 'cat_exp_transport', name: 'Transport', colour: '#F59E0B' }        // Taxi
    ]
  },

  // Transactions
  transactions: [
    // Opening balances (top-ups)
    { id: 't_open_bank', type: 'income', amount: 10000, date: '2025-11-01', accountId: 'acc_bank_main', methodId: 'met_card_visa', category: 'Top-up', note: 'Initial top-up' },
    { id: 't_open_cash', type: 'income', amount: 5000, date: '2025-11-01', accountId: 'acc_wallet', methodId: 'met_cash_wallet', category: 'Top-up', note: 'Initial cash' },
    { id: 't_open_online', type: 'income', amount: 1000, date: '2025-11-01', accountId: 'acc_wallet_online', methodId: 'met_wallet_paypal', category: 'Top-up', note: 'Initial wallet' },
    { id: 't_open_crypto', type: 'income', amount: 100, date: '2025-11-01', accountId: 'acc_crypto', methodId: 'met_crypto_btc', category: 'Top-up', note: 'Initial crypto' },
    { id: 't_open_piggy', type: 'income', amount: 100, date: '2025-11-01', accountId: 'acc_piggy', methodId: '', category: 'Top-up', note: 'Initial piggy' },

    // Entrate: 1000 al mese dal lavoro alla banca (example month)
    { id: 't_salary_nov', type: 'income', amount: 1000, date: '2025-11-03', accountId: 'acc_bank_main', methodId: 'met_card_visa', category: 'Salary', note: 'Monthly salary' },

    // Spostamento: 500 da banca a online wallet
    { id: 't_transfer_bank_to_online', type: 'transfer', amount: 500, date: '2025-11-04', fromAccountId: 'acc_bank_main', fromMethodId: 'met_card_visa', toAccountId: 'acc_wallet_online', toMethodId: 'met_wallet_paypal', category: '', note: 'Top up online wallet' },

    // Uscite
    // 10/mese Netflix da online wallet
    { id: 't_netflix_nov', type: 'expense', amount: 10, date: '2025-11-05', accountId: 'acc_wallet_online', methodId: 'met_wallet_paypal', category: 'Subscriptions', note: 'Netflix' },
    // 20/anno PEC dalla banca
    { id: 't_pec_year', type: 'expense', amount: 20, date: '2025-11-06', accountId: 'acc_bank_main', methodId: 'met_card_visa', category: 'Services', note: 'PEC annual fee' },
    // 100 ristorante da cash wallet
    { id: 't_restaurant', type: 'expense', amount: 100, date: '2025-11-07', accountId: 'acc_wallet', methodId: 'met_cash_wallet', category: 'Dining', note: 'Restaurant' },
    // 50 taxi da cash wallet
    { id: 't_taxi', type: 'expense', amount: 50, date: '2025-11-08', accountId: 'acc_wallet', methodId: 'met_cash_wallet', category: 'Transport', note: 'Taxi' }
  ],

  // Saving goals (unchanged, examples)
  goals: [
    { id: 'g1', name: 'Holiday Fund', target: 2000, current: 450, startDate: '2025-01-01', targetDate: '2025-12-31', colour: '#FF7F50' },
    { id: 'g2', name: 'Emergency Fund', target: 5000, current: 1200, startDate: '2025-01-01', targetDate: '2026-12-31', colour: '#2E86DE' }
  ]
};

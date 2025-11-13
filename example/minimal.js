// minimal.js - Minimal dataset loaded on first visit

export const MINIMAL_DATA = {
  banks: [
    { id: 'acc_bank_main', name: 'Main Bank', type: 'bank', colour: '#2E86DE', currency: 'EUR' },
    { id: 'acc_wallet', name: 'Cash Wallet', type: 'wallet_physical', colour: '#F39C12', currency: 'EUR' }
  ],
  paymentMethods: [
    { id: 'met_bank_bonifico', type: 'bank', name: 'Bonifico', accountId: 'acc_bank_main', colour: '#2E86DE' },
    { id: 'met_card_visa', type: 'card', name: 'Visa', accountId: 'acc_bank_main', colour: '#2E86DE' },
    { id: 'met_cash_wallet', type: 'cash', name: 'Cash', accountId: 'acc_wallet', colour: '#F39C12' }
  ],
  categories: {
    income: [
      { id: 'cat_income_topup', name: 'Top-up', colour: '#34D399' },
      { id: 'cat_income_salary', name: 'Salary', colour: '#2ECC71' }
    ],
    expense: [
      { id: 'cat_exp_car', name: 'Car', colour: '#EF4444' },
      { id: 'cat_exp_luxury', name: 'Luxury', colour: '#8B5CF6' },
      { id: 'cat_exp_electronics', name: 'Electronics', colour: '#3B82F6' }
    ]
  },
  transactions: [
    // Opening balances
    { id: 't_open_bank', type: 'income', amount: 500000, date: '2025-11-01', accountId: 'acc_bank_main', methodId: 'met_bank_bonifico', category: 'Top-up', note: 'Initial bank top-up' },
    { id: 't_open_cash', type: 'income', amount: 500000, date: '2025-11-01', accountId: 'acc_wallet', methodId: 'met_cash_wallet', category: 'Top-up', note: 'Initial wallet top-up' },

    // Expensive purchases
    { id: 't_car_deposit', type: 'expense', amount: 300000, date: '2025-11-03', accountId: 'acc_bank_main', methodId: 'met_bank_bonifico', category: 'Car', note: 'Car deposit' },
    { id: 't_lux_watch', type: 'expense', amount: 50000, date: '2025-11-04', accountId: 'acc_wallet', methodId: 'met_cash_wallet', category: 'Luxury', note: 'Luxury watch' },
    { id: 't_tv', type: 'expense', amount: 10000, date: '2025-11-05', accountId: 'acc_bank_main', methodId: 'met_card_visa', category: 'Electronics', note: 'High-end TV' }
  ],
  goals: [
    { id: 'g_new_car', name: 'New Car', target: 800000, current: 500000, startDate: '2025-01-01', targetDate: '2026-12-31', colour: '#FF7F50' }
  ]
};

// utils.js - small helpers

export function uuid() {
  // RFC4122-ish v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf) >> 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Factories for domain entities
export function newBank(name = 'Bank', colour = '#2E86DE') {
  return { id: uuid(), name, colour };
}

export function newGoal(name = 'Goal', target = 0, saved = 0, colour = '#999999') {
  return { id: uuid(), name, target, saved, colour };
}

export function formatCurrency(amount) {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  } catch {
    return `€ ${Number(amount || 0).toFixed(2)}`;
  }
}

export function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB');
  } catch {
    return iso;
  }
}

export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export const EMPTY_DATA = () => {
  const today = new Date();
  const toISO = (d) => new Date(d).toISOString().split('T')[0];
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const day = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return toISO(d);
  };

  const data = {
    version: '1.0',
    baseCurrency: 'EUR',
    transactions: [
      // Income
      { id: uuid(), type: 'income', amount: 2000, currency: 'EUR', category: 'Salary', bank: 'Main Bank', date: toISO(new Date(today.getFullYear(), today.getMonth(), 1)), note: 'Monthly salary' },
      // Expenses
      { id: uuid(), type: 'expense', amount: 20, currency: 'EUR', category: 'Groceries', paymentMethod: 'Cash', bank: 'Main Bank', date: day(-2), note: 'Fruit and vegetables' },
      { id: uuid(), type: 'expense', amount: 100, currency: 'EUR', category: 'Groceries', paymentMethod: 'Debit Card', bank: 'Main Bank', date: day(-5), note: 'Supermarket shopping' },
      { id: uuid(), type: 'expense', amount: 500, currency: 'EUR', category: 'Housing', paymentMethod: 'Bank Transfer', bank: 'Main Bank', date: toISO(startOfMonth), note: 'Monthly mortgage payment' }
    ],
    categories: {
      income: ['Salary'],
      expense: ['Groceries', 'Housing']
    },
    categoryColours: {
      'Salary': '#2ecc71',
      'Groceries': '#16a085',
      'Housing': '#8e44ad'
    },
    methodColours: {
      'Cash': '#7f8c8d',
      'Debit Card': '#2980b9',
      'Credit Card': '#8e44ad',
      'Bank Transfer': '#2c3e50',
      'Wallet': '#27ae60',
      'Crypto': '#f39c12'
    },
    paymentMethods: ['Cash', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Wallet', 'Crypto'],
    banks: [
      newBank('Main Bank', '#2E86DE'),
      newBank('Secondary Bank', '#27AE60')
    ],
    goals: [
      newGoal('Vacation', 1000, 0, '#FF7F50')
    ],
    recurring: {
      incomes: [
        { id: uuid(), name: 'Monthly Salary', amount: 2000, day: 1, category: 'Salary', bank: 'Main Bank', frequency: 'monthly' }
      ],
      expenses: [
        { id: uuid(), name: 'Mortgage', amount: 500, day: 1, category: 'Housing', paymentMethod: 'Bank Transfer', bank: 'Main Bank', frequency: 'monthly' }
      ]
    }
  };

  return data;
};

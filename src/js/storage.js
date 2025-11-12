// storage.js - data model + IndexedDB auto-backup

import { EMPTY_DATA } from './utils.js';

export class Storage {
  constructor() {
    this.data = EMPTY_DATA();
    this.dbName = 'talous-db';
    this.storeName = 'talous-store';
  }

  getData() { return this.data; }
  setData(newData) { this.data = newData; }
  getEmptyData() { return EMPTY_DATA(); }

  validateData(d) {
    return d && d.version === '1.0' && d.baseCurrency === 'EUR'
      && Array.isArray(d.transactions)
      && d.categories && Array.isArray(d.categories.income) && Array.isArray(d.categories.expense)
      && Array.isArray(d.paymentMethods)
      && d.recurring && Array.isArray(d.recurring.incomes) && Array.isArray(d.recurring.expenses);
  }

  // IndexedDB helpers (vanilla)
  async openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveToIndexedDB(key, value) {
    try {
      const db = await this.openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('IndexedDB save error', e);
    }
  }

  async loadFromIndexedDB(key) {
    try {
      const db = await this.openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IndexedDB load error', e);
      return null;
    }
  }
}

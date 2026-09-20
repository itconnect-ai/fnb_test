// IndexedDB Storage Adapter for Prep Cafe
import initialRawData from './initialData.json';

const DB_NAME = 'PrepCafeOperationsDB';
const DB_VERSION = 1;
const STORE_NAMES = [
  'suppliers',
  'materials',
  'menus',
  'recipes',
  'price_history',
  'calendar',
  'sales',
  'opening_inventory',
  'inventory_events',
  'monthly_expense_plan',
  'expenses'
];

class StorageService {
  constructor() {
    this.db = null;
    this.initPromise = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        STORE_NAMES.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            let keyPath = 'id';
            let autoIncrement = true;

            if (storeName === 'suppliers') keyPath = 'supplier_id';
            else if (storeName === 'materials') keyPath = 'material_id';
            else if (storeName === 'menus') keyPath = 'menu_id';
            else if (storeName === 'sales') keyPath = 'sale_id';
            else if (storeName === 'calendar') keyPath = 'date';
            else if (storeName === 'inventory_events') keyPath = 'event_id';
            else if (storeName === 'expenses') keyPath = 'expense_id';
            else {
              keyPath = undefined;
              autoIncrement = true;
            }

            if (keyPath) {
              db.createObjectStore(storeName, { keyPath });
            } else {
              db.createObjectStore(storeName, { autoIncrement: true });
            }
          }
        });
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        await this.checkAndLoadInitialData();
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB init error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async checkAndLoadInitialData() {
    const salesCount = await this.count('sales');
    if (salesCount === 0) {
      console.log('IndexedDB is empty. Loading 445 days initial dataset...');
      await this.loadInitialDataset(initialRawData);
      console.log('Initial dataset loaded successfully.');
    }
  }

  async loadInitialDataset(data) {
    const tx = this.db.transaction(STORE_NAMES, 'readwrite');
    for (const storeName of STORE_NAMES) {
      const items = data[storeName] || [];
      const store = tx.objectStore(storeName);
      items.forEach((item) => {
        store.put(item);
      });
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async count(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getAll(storeName) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async put(storeName, item) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async putMany(storeName, items) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      items.forEach((item) => store.put(item));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async delete(storeName, key) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async clearAll() {
    await this.initPromise;
    const tx = this.db.transaction(STORE_NAMES, 'readwrite');
    STORE_NAMES.forEach((name) => tx.objectStore(name).clear());
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async exportAll() {
    await this.initPromise;
    const result = {};
    for (const name of STORE_NAMES) {
      result[name] = await this.getAll(name);
    }
    return result;
  }

  async importAll(data) {
    await this.initPromise;
    const tx = this.db.transaction(STORE_NAMES, 'readwrite');
    for (const storeName of STORE_NAMES) {
      if (data[storeName] !== undefined && Array.isArray(data[storeName])) {
        const store = tx.objectStore(storeName);
        store.clear();
        data[storeName].forEach((item) => store.put(item));
      }
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const storage = new StorageService();

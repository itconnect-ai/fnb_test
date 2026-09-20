// Central Reactive State Store for Prep Cafe
import { storage } from '../data/storage.js';

class StateStore {
  constructor() {
    this.data = {
      suppliers: [],
      materials: [],
      menus: [],
      recipes: [],
      price_history: [],
      calendar: [],
      sales: [],
      opening_inventory: [],
      inventory_events: [],
      monthly_expense_plan: [],
      expenses: []
    };
    this.isLoaded = false;
    this.listeners = new Set();
  }

  async init(force = false) {
    if (this.isLoaded && !force) return;
    const exportData = await storage.exportAll();
    this.data = exportData;
    this.isLoaded = true;
    this.notify();
  }

  async reload() {
    return this.init(true);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this.data));
  }

  get(key) {
    return this.data[key] || [];
  }

  /**
   * Add a single sale or replace existing if same (date + menu_id + channel)
   */
  async addOrUpdateSale(saleItem) {
    if (!saleItem.sale_id) {
      // Auto-generate sale_id: S + 6 digits
      const maxId = this.data.sales.reduce((max, s) => {
        const num = parseInt(s.sale_id.replace(/\D/g, ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      saleItem.sale_id = `S${String(maxId + 1).padStart(6, '0')}`;
    }

    // Check if duplicate exists for (date + menu_id + channel)
    const existingIdx = this.data.sales.findIndex(
      (s) => s.date === saleItem.date && s.menu_id === saleItem.menu_id && s.channel === saleItem.channel
    );

    if (existingIdx >= 0) {
      this.data.sales[existingIdx] = saleItem;
    } else {
      this.data.sales.push(saleItem);
    }

    await storage.put('sales', saleItem);
    this.notify();
    return saleItem;
  }

  /**
   * Save a batch of daily sales from closing input form
   */
  async saveDailySalesBatch(items) {
    const updated = [];
    for (const item of items) {
      const saved = await this.addOrUpdateSale(item);
      updated.push(saved);
    }
    return updated;
  }

  /**
   * Delete a sale
   */
  async deleteSale(saleId) {
    this.data.sales = this.data.sales.filter((s) => s.sale_id !== saleId);
    await storage.delete('sales', saleId);
    this.notify();
  }

  /**
   * Get sales for a specific date
   */
  getSalesByDate(dateStr) {
    return this.data.sales.filter((s) => s.date === dateStr);
  }

  /**
   * Add or update an expense
   */
  async addOrUpdateExpense(expenseItem) {
    if (!expenseItem.expense_id) {
      const maxId = this.data.expenses.reduce((max, e) => {
        const idStr = e.expense_id || e.비용ID || '';
        const num = parseInt(idStr.replace(/\D/g, ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      expenseItem.expense_id = `X${String(maxId + 1).padStart(5, '0')}`;
    }

    const existingIdx = this.data.expenses.findIndex(
      (e) => (e.expense_id && e.expense_id === expenseItem.expense_id) ||
             ((e.date === expenseItem.date || e.귀속일자 === expenseItem.date) && (e.category === expenseItem.category || e.항목 === expenseItem.category))
    );

    if (existingIdx >= 0) {
      this.data.expenses[existingIdx] = expenseItem;
    } else {
      this.data.expenses.push(expenseItem);
    }

    await storage.put('expenses', expenseItem);
    this.notify();
    return expenseItem;
  }

  /**
   * Get expenses for a specific date
   */
  getExpensesByDate(dateStr) {
    return this.data.expenses.filter((e) => (e.date || e.귀속일자) === dateStr);
  }

  /**
   * Delete an expense
   */
  async deleteExpense(expenseId) {
    this.data.expenses = this.data.expenses.filter((e) => (e.expense_id || e.비용ID) !== expenseId);
    await storage.delete('expenses', expenseId);
    this.notify();
  }

  /**
   * Add or update an inventory event (입고, 폐기, 실사조정)
   */
  async addOrUpdateInventoryEvent(eventItem) {
    if (!eventItem.event_id) {
      const maxId = this.data.inventory_events.reduce((max, ev) => {
        const idStr = ev.event_id || ev.이벤트ID || '';
        const num = parseInt(idStr.replace(/\D/g, ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      eventItem.event_id = `E${String(maxId + 1).padStart(6, '0')}`;
    }

    const existingIdx = this.data.inventory_events.findIndex(
      (ev) => ev.event_id && ev.event_id === eventItem.event_id
    );

    if (existingIdx >= 0) {
      this.data.inventory_events[existingIdx] = eventItem;
    } else {
      this.data.inventory_events.push(eventItem);
    }

    await storage.put('inventory_events', eventItem);
    this.notify();
    return eventItem;
  }

  /**
   * Delete an inventory event
   */
  async deleteInventoryEvent(eventId) {
    this.data.inventory_events = this.data.inventory_events.filter(
      (ev) => (ev.event_id || ev.이벤트ID) !== eventId
    );
    await storage.delete('inventory_events', eventId);
    this.notify();
  }

  /**
   * Get inventory events for a specific date
   */
  getInventoryEventsByDate(dateStr) {
    return this.data.inventory_events.filter((ev) => (ev.date || ev.귀속일자) === dateStr);
  }

  /**
   * Add a price history record
   */
  async addPriceHistory(item) {
    this.data.price_history.push(item);
    await storage.put('price_history', item);
    this.notify();
    return item;
  }

  /**
   * Reset store to initial seed dataset
   */
  async resetToSeed(initialData) {
    await storage.clearAll();
    await storage.loadInitialDataset(initialData);
    this.data = await storage.exportAll();
    this.notify();
  }

  /**
   * Reset store to an empty clean store (FEAT-18)
   */
  async resetToEmptyStore() {
    await storage.clearAll();
    this.data = {
      suppliers: [],
      materials: [],
      menus: [],
      recipes: [],
      price_history: [],
      calendar: [],
      sales: [],
      opening_inventory: [],
      inventory_events: [],
      monthly_expense_plan: [],
      expenses: []
    };
    this.notify();
  }
}

export const store = new StateStore();


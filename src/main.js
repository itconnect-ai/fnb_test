// Main Application Entry Point
import './styles/design-tokens.css';
import './styles/components.css';

import { store } from './models/store.js';
import { renderClosingHomeView } from './views/closingHome.js';
import { renderClosingInputView } from './views/closingInput.js';
import { renderMenuProfitView } from './views/menuProfit.js';

import { renderExpectedPLView } from './views/expectedPL.js';
import { renderInventoryOrderView } from './views/inventoryOrder.js';

let currentView = 'closing-home';

const viewTitles = {
  'closing-home': '마감 홈',
  'closing-input': '마감 판매 입력',
  'menu-profitability': '메뉴 수익성',
  'expected-pl': '예상 손익',
  'inventory-order': '재고와 발주'
};

export function navigateTo(viewId) {
  currentView = viewId;

  // Sync Sidebar Active Class
  document.querySelectorAll('.sidebar .nav-item').forEach((item) => {
    const path = item.getAttribute('data-path');
    if (path === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Sync Top Header Title
  const titleEl = document.getElementById('current-header-title');
  if (titleEl && viewTitles[viewId]) {
    titleEl.textContent = viewTitles[viewId];
  }

  // Render View Container
  const container = document.getElementById('app-view-container');
  if (!container) return;
  container.innerHTML = '';

  if (viewId === 'closing-home') {
    renderClosingHomeView(container, { onNavigate: navigateTo });
  } else if (viewId === 'closing-input') {
    renderClosingInputView(container);
  } else if (viewId === 'menu-profitability') {
    renderMenuProfitView(container);
  } else if (viewId === 'expected-pl') {
    renderExpectedPLView(container);
  } else if (viewId === 'inventory-order') {
    renderInventoryOrderView(container);
  }
}

window.appNavigate = navigateTo;

// Global App Initialization
document.addEventListener('DOMContentLoaded', async () => {
  // Bind sidebar nav links
  document.querySelectorAll('.sidebar .nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const path = item.getAttribute('data-path');
      if (path) {
        navigateTo(path);
      }
    });
  });

  // Init Data Store
  const loadingIndicator = document.getElementById('global-loading');
  if (loadingIndicator) loadingIndicator.classList.remove('hidden');

  try {
    await store.init();
    console.log('Store initialized with data.');
  } catch (err) {
    console.error('Failed to initialize store:', err);
  } finally {
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
  }

  // Initial View: Closing Home as confirmed
  navigateTo('closing-home');
});

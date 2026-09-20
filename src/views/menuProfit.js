// Menu Profitability View (EPIC 1 with BCG Matrix & Top 5 Visuals)
import { store } from '../models/store.js';
import { aggregateMenuProfitability } from '../services/calculations.js';
import { createScatterMatrixChart, createHorizontalBarChart } from '../services/charts.js';

export function renderMenuProfitView(container) {
  let periodFilter = 'all';
  let channelFilter = 'all';
  let sortBy = 'contribution';

  function update() {
    const sales = store.get('sales');
    const menus = store.get('menus');
    const recipes = store.get('recipes');
    const priceHistory = store.get('price_history');
    const materials = store.get('materials');

    // Date range filtering
    let startDate = null;
    let endDate = null;

    // Default reference date is the latest date in sales or 2026-09-18
    const maxDate = sales.reduce((max, s) => (s.date > max ? s.date : max), '2026-09-18');

    if (periodFilter === 'day') {
      startDate = maxDate;
      endDate = maxDate;
    } else if (periodFilter === 'week') {
      const d = new Date(maxDate);
      d.setDate(d.getDate() - 6);
      startDate = d.toISOString().slice(0, 10);
      endDate = maxDate;
    } else if (periodFilter === 'month') {
      startDate = maxDate.slice(0, 7) + '-01';
      endDate = maxDate;
    } else if (periodFilter === 'quarter') {
      const year = maxDate.slice(0, 4);
      const month = parseInt(maxDate.slice(5, 7), 10);
      const qStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
      startDate = `${year}-${String(qStartMonth).padStart(2, '0')}-01`;
      endDate = maxDate;
    } else if (periodFilter === 'half') {
      const year = maxDate.slice(0, 4);
      const month = parseInt(maxDate.slice(5, 7), 10);
      const hStartMonth = month <= 6 ? '01' : '07';
      startDate = `${year}-${hStartMonth}-01`;
      endDate = maxDate;
    } else if (periodFilter === 'year') {
      startDate = maxDate.slice(0, 4) + '-01-01';
      endDate = maxDate;
    }

    const data = aggregateMenuProfitability(sales, {
      menus,
      recipes,
      priceHistory,
      materials,
      channelFilter,
      startDate,
      endDate,
      sortBy
    });

    const periodLabels = {
      all: '전체 누적',
      day: `당일 (${maxDate})`,
      week: `최근 7일 (${startDate} ~ ${endDate})`,
      month: `당월 (${maxDate.slice(0, 7)})`,
      quarter: `당분기 (${startDate} ~ ${endDate})`,
      half: `반기 (${startDate} ~ ${endDate})`,
      year: `연간 (${maxDate.slice(0, 4)}년)`
    };

    // Scatter and Top 5 data
    const top5Items = [...data.items]
      .sort((a, b) => b.totalContribution - a.totalContribution)
      .slice(0, 5)
      .map((m) => ({
        name: m.menuName,
        contribution: m.totalContribution
      }));

    const scatterPoints = data.items.map((m) => ({
      menuId: m.menuId,
      menuName: m.menuName,
      category: m.category,
      quantity: m.quantity,
      marginRate: m.marginRate,
      contribution: m.totalContribution,
      badge: m.badge,
      isNegative: m.isNegativeMargin
    }));

    container.innerHTML = `
      <div class="view-panel">
        <!-- Toolbar Strip -->
        <div class="card" style="padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-weight: 700; font-size: 15px;">메뉴 수익성 분석</span>
            <span style="color: var(--outline-variant);">|</span>
            
            <!-- Period Filter -->
            <div class="btn-group" id="period-filter-group">
              <button class="group-btn ${periodFilter === 'all' ? 'active' : ''}" data-period="all">전체</button>
              <button class="group-btn ${periodFilter === 'day' ? 'active' : ''}" data-period="day">일</button>
              <button class="group-btn ${periodFilter === 'week' ? 'active' : ''}" data-period="week">주</button>
              <button class="group-btn ${periodFilter === 'month' ? 'active' : ''}" data-period="month">월</button>
              <button class="group-btn ${periodFilter === 'quarter' ? 'active' : ''}" data-period="quarter">분기</button>
              <button class="group-btn ${periodFilter === 'half' ? 'active' : ''}" data-period="half">반기</button>
              <button class="group-btn ${periodFilter === 'year' ? 'active' : ''}" data-period="year">연간</button>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <!-- Channel Filter -->
            <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--on-surface-variant);">
              <span>채널:</span>
              <div class="btn-group" id="channel-filter-group">
                <button class="group-btn ${channelFilter === 'all' ? 'active' : ''}" data-channel="all">전체</button>
                <button class="group-btn ${channelFilter === '매장' ? 'active' : ''}" data-channel="매장">매장</button>
                <button class="group-btn ${channelFilter === '포장' ? 'active' : ''}" data-channel="포장">포장</button>
              </div>
            </div>

            <span style="color: var(--outline-variant);">|</span>

            <!-- Sort By -->
            <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--on-surface-variant);">
              <span>정렬:</span>
              <select class="form-select" id="sort-select" style="padding: 3px 8px; font-size: 12px; height: 28px;">
                <option value="contribution" ${sortBy === 'contribution' ? 'selected' : ''}>총 공헌이익순</option>
                <option value="marginRate" ${sortBy === 'marginRate' ? 'selected' : ''}>마진율순</option>
                <option value="quantity" ${sortBy === 'quantity' ? 'selected' : ''}>판매량순</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 4 Modern Enterprise KPI Cards -->
        <div class="grid-4">
          <div class="card">
            <div class="kpi-header">
              <span class="kpi-label">조회 메뉴 수</span>
              <div class="icon-bubble blue">
                <span class="material-symbols-outlined" style="font-size: 18px;">restaurant_menu</span>
              </div>
            </div>
            <div class="kpi-value tabular-nums">${data.menuCount} <span style="font-size: 14px; font-weight: 600; color: var(--outline);">개</span></div>
            <div class="kpi-sub">
              <span>기간: ${periodLabels[periodFilter]}</span>
            </div>
          </div>

          <div class="card">
            <div class="kpi-header">
              <span class="kpi-label">평균 실질 마진율</span>
              <div class="icon-bubble green">
                <span class="material-symbols-outlined" style="font-size: 18px;">percent</span>
              </div>
            </div>
            <div class="kpi-value tabular-nums" style="color: var(--primary);">
              ${data.avgMarginRate.toFixed(1)} <span style="font-size: 14px; font-weight: 600; color: var(--outline);">%</span>
            </div>
            <div class="kpi-sub">
              <span>총 공헌이익: ${Math.round(data.totalContrib).toLocaleString()}원</span>
            </div>
          </div>

          <div class="card">
            <div class="kpi-header">
              <span class="kpi-label">주력 효자 메뉴</span>
              <div class="icon-bubble amber">
                <span class="material-symbols-outlined" style="font-size: 18px;">star</span>
              </div>
            </div>
            <div class="kpi-value truncate" style="color: #059669; font-size: 20px;" title="${data.bestMenu?.menuName || '-'}">
              ${data.bestMenu?.menuName || '-'}
            </div>
            <div class="kpi-sub">
              <span>기여이익: ${Math.round(data.bestMenu?.totalContribution || 0).toLocaleString()}원</span>
              <span class="badge badge-star">1위</span>
            </div>
          </div>

          <div class="card">
            <div class="kpi-header">
              <span class="kpi-label">원가/역마진 주의 품목</span>
              <div class="icon-bubble ${data.warningCount > 0 ? 'rose' : 'green'}">
                <span class="material-symbols-outlined" style="font-size: 18px;">warning</span>
              </div>
            </div>
            <div class="kpi-value tabular-nums" style="color: ${data.warningCount > 0 ? 'var(--error)' : 'var(--success)'};">
              ${data.warningCount} <span style="font-size: 14px; font-weight: 600; color: var(--outline);">개</span>
            </div>
            <div class="kpi-sub">
              <span>${data.warningCount > 0 ? '마진 50% 미만/역마진' : '모든 메뉴 마진 양호'}</span>
            </div>
          </div>
        </div>

        <!-- 1. Primary: High Density Profitability Table (Prioritized Above Charts) -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 80px;">코드</th>
                <th class="col-sticky">메뉴명</th>
                <th style="width: 70px;">분류</th>
                <th class="text-right" style="width: 90px;">기준판매가</th>
                <th class="text-right" style="width: 80px;">식재료비</th>
                <th class="text-right" style="width: 70px;">포장비</th>
                <th class="text-right" style="width: 80px;">결제수수료</th>
                <th class="text-right" style="width: 90px; color: var(--primary);">개당 실질마진</th>
                <th class="text-right" style="width: 80px;">마진율</th>
                <th class="text-right" style="width: 80px;">판매량</th>
                <th class="text-right" style="width: 110px; font-weight: 700; color: var(--primary);">총 공헌이익</th>
                <th class="text-center" style="width: 100px;">진단 뱃지</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map((m) => {
                const badgeClass = m.badge === 'star' ? 'badge-star'
                  : m.badge === 'volume' ? 'badge-volume'
                  : m.badge === 'profit' ? 'badge-profit'
                  : m.badge === 'review' ? 'badge-review'
                  : '';
                
                return `
                  <tr id="menu-row-${m.menuId}" class="${m.isNegativeMargin ? 'warning-row' : ''}" style="transition: background-color 0.4s;">
                    <td class="tabular-nums" style="color: var(--outline);">${m.menuId}</td>
                    <td class="col-sticky" style="font-weight: 600; color: var(--on-surface);">
                      ${m.menuName}
                      ${m.isNegativeMargin ? '<span class="badge badge-danger" style="margin-left: 4px;">⚠️ 역마진 경고</span>' : ''}
                    </td>
                    <td><span class="badge" style="background: #f1f5f9; color: #475569;">${m.category}</span></td>
                    <td class="text-right tabular-nums">${Math.round(m.basePrice).toLocaleString()}원</td>
                    <td class="text-right tabular-nums" style="color: var(--outline);">${(m.totalFoodCost / (m.quantity || 1)).toFixed(1)}원</td>
                    <td class="text-right tabular-nums" style="color: var(--outline);">${(m.totalPackagingCost / (m.quantity || 1)).toFixed(1)}원</td>
                    <td class="text-right tabular-nums" style="color: var(--outline);">${(m.totalPaymentFee / (m.quantity || 1)).toFixed(1)}원</td>
                    <td class="text-right tabular-nums" style="font-weight: 700; color: ${m.unitNetMargin < 0 ? 'var(--error)' : 'var(--primary)'};">
                      ${m.unitNetMargin.toFixed(1)}원
                    </td>
                    <td class="text-right tabular-nums" style="font-weight: 600; color: ${m.marginRate < 50 ? 'var(--error)' : 'var(--on-surface)'};">
                      ${m.marginRate.toFixed(1)}%
                    </td>
                    <td class="text-right tabular-nums" style="font-weight: 600;">${m.quantity}잔</td>
                    <td class="text-right tabular-nums" style="font-weight: 700; color: ${m.totalContribution < 0 ? 'var(--error)' : '#059669'};">
                      ${Math.round(m.totalContribution).toLocaleString()}원
                    </td>
                    <td class="text-center">
                      <span class="badge ${badgeClass}">${m.badgeName || '일반'}</span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- 2. Secondary Insight: Compact BCG 4-Quadrant Scatter & Top 5 Margin Contribution Bars -->
        <div class="split-2-col-menu">
          <!-- Left: 4-Quadrant BCG Matrix Scatter -->
          <div class="chart-card">
            <div class="chart-header">
              <div class="chart-title">
                <span class="material-symbols-outlined" style="color: var(--primary); font-size: 18px;">grid_view</span>
                메뉴 포트폴리오 BCG 4분면 진단 (판매량 vs 실질마진율)
              </div>
              <span style="font-size: 11px; color: var(--outline);">버블 클릭 시 위 테이블로 포커스</span>
            </div>
            <div id="menu-scatter-chart-container"></div>
          </div>

          <!-- Right: Top 5 Contribution Margin Bars -->
          <div class="chart-card">
            <div class="chart-header">
              <div class="chart-title">
                <span class="material-symbols-outlined" style="color: #2563eb; font-size: 18px;">leaderboard</span>
                공헌이익 Top 5 기여 메뉴
              </div>
              <span class="badge badge-profit">전체 마진 점유율</span>
            </div>
            <div id="menu-top5-bar-container" style="padding: 4px 0;"></div>
          </div>
        </div>
      </div>
    `;

    // Render BCG Scatter Chart
    const scatterContainer = container.querySelector('#menu-scatter-chart-container');
    if (scatterContainer) {
      createScatterMatrixChart({
        container: scatterContainer,
        points: scatterPoints,
        onPointClick: (menuId) => {
          const targetRow = container.querySelector(`#menu-row-${menuId}`);
          if (targetRow) {
            targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetRow.style.backgroundColor = '#dbeafe';
            setTimeout(() => {
              targetRow.style.backgroundColor = '';
            }, 1800);
          }
        }
      });
    }

    // Render Top 5 Horizontal Bar Chart
    const barContainer = container.querySelector('#menu-top5-bar-container');
    if (barContainer) {
      createHorizontalBarChart({
        container: barContainer,
        items: top5Items,
        totalContrib: data.totalContrib
      });
    }

    // Attach Event Listeners
    container.querySelectorAll('#period-filter-group button').forEach((btn) => {
      btn.addEventListener('click', () => {
        periodFilter = btn.getAttribute('data-period');
        update();
      });
    });

    container.querySelectorAll('#channel-filter-group button').forEach((btn) => {
      btn.addEventListener('click', () => {
        channelFilter = btn.getAttribute('data-channel');
        update();
      });
    });

    const sortSelect = container.querySelector('#sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        sortBy = e.target.value;
        update();
      });
    }
  }

  // Subscribe to store updates
  store.subscribe(update);
  update();
}

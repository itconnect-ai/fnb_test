// Closing Home View (EPIC 1, 2, 3 Dashboard)
import { store } from '../models/store.js';
import {
  calculateRecipeUnitCost,
  calculateItemMargin,
  calculateInventoryLedger,
  calculateOrderRecommendations
} from '../services/calculations.js';
import { exportBackupToExcel, importBackupFromExcel } from '../services/excelService.js';

export function renderClosingHomeView(container, { onNavigate }) {
  function update() {
    const sales = store.get('sales');
    const menus = store.get('menus');
    const recipes = store.get('recipes');
    const priceHistory = store.get('price_history');
    const materials = store.get('materials');
    const openingInventory = store.get('opening_inventory');
    const inventoryEvents = store.get('inventory_events');
    const suppliers = store.get('suppliers');

    // Reference latest date
    const latestDate = sales.reduce((max, s) => (s.date > max ? s.date : max), '2026-09-18');
    const todaySales = sales.filter((s) => s.date === latestDate);

    // Calculate today's sales metrics
    let todayGrossSales = 0;
    let todayDiscount = 0;
    let todayNetSales = 0;
    let todayFoodCost = 0;
    let todayPackagingCost = 0;
    let todayFee = 0;
    let todayContrib = 0;
    let todayItemsCount = 0;

    for (const s of todaySales) {
      const qty = s.quantity;
      const disc = s.discount_amount || 0;
      const net = s.net_sales !== undefined ? s.net_sales : (s.unit_price * qty - disc);
      const fee = s.payment_fee !== undefined ? s.payment_fee : Math.round(net * 0.015);

      const { foodCost, packagingCost } = calculateRecipeUnitCost(
        s.recipe_version,
        s.menu_id,
        s.channel,
        s.date,
        recipes,
        priceHistory,
        materials
      );

      const fCost = foodCost * qty;
      const pCost = packagingCost * qty;
      const contrib = net - fCost - pCost - fee;

      todayGrossSales += s.unit_price * qty;
      todayDiscount += disc;
      todayNetSales += net;
      todayFoodCost += fCost;
      todayPackagingCost += pCost;
      todayFee += fee;
      todayContrib += contrib;
      todayItemsCount += qty;
    }

    const todayCostRate = todayNetSales > 0 ? ((todayFoodCost + todayPackagingCost) / todayNetSales) * 100 : 0;
    const todayMarginRate = todayNetSales > 0 ? (todayContrib / todayNetSales) * 100 : 0;

    // Calculate inventory ledger and order recommendations (FEAT-17: 100% synchronized)
    const ledger = calculateInventoryLedger({
      materials,
      openingInventory,
      inventoryEvents,
      sales,
      recipes,
      targetDate: latestDate
    });

    const orderData = calculateOrderRecommendations({
      materials,
      inventoryLedger: ledger,
      sales,
      recipes,
      suppliers,
      referenceDate: latestDate
    });

    container.innerHTML = `
      <div class="view-panel">
        <!-- Top 4 KPI Cards -->
        <div class="grid-4">
          <div class="card">
            <div class="kpi-label">오늘 순매출 (${latestDate})</div>
            <div class="kpi-value tabular-nums">${Math.round(todayNetSales).toLocaleString()} <span style="font-size: 13px; font-weight: 500; color: var(--outline);">원</span></div>
            <div class="kpi-sub">
              <span>총 판매 잔수: ${todayItemsCount}잔</span>
              <span>할인: -${todayDiscount.toLocaleString()}원</span>
            </div>
          </div>

          <div class="card">
            <div class="kpi-label">오늘 직접원가율</div>
            <div class="kpi-value tabular-nums" style="color: ${todayCostRate > 35 ? 'var(--error)' : 'var(--primary)'};">
              ${todayCostRate.toFixed(1)} <span style="font-size: 13px; font-weight: 500; color: var(--outline);">%</span>
            </div>
            <div class="kpi-sub">
              <span>재료비: ${Math.round(todayFoodCost + todayPackagingCost).toLocaleString()}원</span>
              <span>수수료: ${Math.round(todayFee).toLocaleString()}원</span>
            </div>
          </div>

          <!-- KPI 3: Live Order Recommendations (FEAT-17) -->
          <div class="card" id="card-kpi-inv" style="cursor: pointer;">
            <div class="kpi-label">재고 부족 / 발주 권장</div>
            <div class="kpi-value tabular-nums" style="color: ${orderData.urgentCount > 0 ? 'var(--error)' : '#166534'};">
              긴급 ${orderData.urgentCount} <span style="font-size: 13px; font-weight: 500; color: var(--outline);">개 품목</span>
            </div>
            <div class="kpi-sub">
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">
                ${orderData.urgentItems.map((i) => i.name).slice(0, 2).join(', ') || '전 품목 안전재고'}
              </span>
              <a href="#" id="link-goto-order" style="color: var(--primary); font-weight: 600; text-decoration: none;">발주 확인 →</a>
            </div>
          </div>

          <div class="card">
            <div class="kpi-label">오늘 실질 순수 마진(공헌이익)</div>
            <div class="kpi-value tabular-nums" style="color: #065f46;">
              ${Math.round(todayContrib).toLocaleString()} <span style="font-size: 13px; font-weight: 500; color: var(--outline);">원</span>
            </div>
            <div class="kpi-sub">
              <span>마진율: ${todayMarginRate.toFixed(1)}%</span>
              <span class="badge badge-success">흑자 운영</span>
            </div>
          </div>
        </div>

        <!-- Middle Section: Closing Checklist & Fast Navigation / Excel Backup -->
        <div style="display: grid; grid-template-columns: 1.8fr 1.2fr; gap: 12px;">
          <!-- Left: Closing Flow Checklist -->
          <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--outline-variant);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 15px; font-weight: 700;">일일 마감 업무 체크리스트</span>
                <span class="badge badge-profit">기준일: ${latestDate}</span>
              </div>
              <button class="btn btn-primary btn-sm" id="btn-goto-closing-input">
                <span class="material-symbols-outlined" style="font-size: 14px;">edit_calendar</span>
                오늘 마감 입력하러 가기
              </button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #f8fafc; border-radius: var(--radius-md); border-left: 3px solid var(--success);">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span class="material-symbols-outlined" style="color: var(--success); font-size: 20px;">check_circle</span>
                  <div>
                    <div style="font-weight: 600; font-size: 13px;">1. 당일 판매 및 재료 입출고 등록 완료</div>
                    <div style="font-size: 12px; color: var(--outline);">총 ${todayItemsCount}잔 판매, 순매출 ${Math.round(todayNetSales).toLocaleString()}원 집계 완료</div>
                  </div>
                </div>
                <span class="badge badge-review">완료</span>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #fffdf5; border-radius: var(--radius-md); border-left: 3px solid ${orderData.urgentCount > 0 ? 'var(--error)' : 'var(--success)'}; cursor: pointer;" id="item-checklist-order">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span class="material-symbols-outlined" style="color: ${orderData.urgentCount > 0 ? 'var(--error)' : 'var(--success)'}; font-size: 20px;">notification_important</span>
                  <div>
                    <div style="font-weight: 600; font-size: 13px;">2. 긴급 부족 재료 거래처 발주 확인</div>
                    <div style="font-size: 12px; color: var(--outline);">
                      ${orderData.urgentCount > 0 
                        ? `${orderData.urgentItems.map((i) => i.name).slice(0, 2).join(', ')} 등 ${orderData.urgentCount}개 품목이 발주점(ROP) 이하입니다. 카톡 발주서를 복사하세요.` 
                        : '현재 모든 원부자재가 안전 수준입니다.'}
                    </div>
                  </div>
                </div>
                <button class="btn btn-secondary btn-sm" id="btn-checklist-order">발주 확인 →</button>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #eff6ff; border-radius: var(--radius-md); border-left: 3px solid var(--primary);">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span class="material-symbols-outlined" style="color: var(--primary); font-size: 20px;">analytics</span>
                  <div>
                    <div style="font-weight: 600; font-size: 13px;">3. 오늘 손익 및 월말 예상 이익 확인 후 일일 마감 확정</div>
                    <div style="font-size: 12px; color: var(--outline);">오늘 영업이익 및 최근 4주 요일 패턴 기반 당월 마감 예상치 점검</div>
                  </div>
                </div>
                <button class="btn btn-secondary btn-sm" id="btn-goto-expected-pl">손익 분석 →</button>
              </div>
            </div>
          </div>

          <!-- Right: Data Backup & Excel Restore (FEAT-18 & Case 3.4) -->
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-size: 14px; font-weight: 700; color: var(--on-surface);">데이터 백업 및 복원</span>
                <span class="badge badge-star">11개 시트 엑셀</span>
              </div>
              
              <div style="font-size: 12px; color: var(--outline); margin-bottom: 12px;">
                서버 없이 브라우저에 안전 보존된 445일치 실적 전체를 11개 시트 엑셀 파일로 즉시 백업하고 100% 복원합니다.
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px;">
                <button class="btn btn-primary" id="btn-backup-excel" style="justify-content: center; width: 100%; padding: 8px;">
                  <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
                  데이터 백업 (11개 시트 엑셀 다운로드)
                </button>

                <label class="btn btn-secondary" style="justify-content: center; width: 100%; padding: 8px; cursor: pointer;">
                  <span class="material-symbols-outlined" style="font-size: 16px;">upload_file</span>
                  데이터 복원 (백업 엑셀 업로드)
                  <input type="file" id="input-restore-excel" accept=".xlsx, .xls" style="display: none;" />
                </label>
              </div>

              <!-- Reset to Empty or Reload Seed -->
              <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--outline-variant); display: flex; gap: 6px;">
                <button class="btn btn-secondary btn-sm" id="btn-reset-empty" style="flex: 1; font-size: 11px; color: var(--error);">
                  빈 매장 초기화
                </button>
                <button class="btn btn-secondary btn-sm" id="btn-reload-seed" style="flex: 1; font-size: 11px;">
                  샘플 445일 로드
                </button>
              </div>
            </div>

            <div id="home-alert-box" class="alert-box alert-info hidden" style="margin-top: 8px; font-size: 11px; padding: 6px 10px;"></div>
          </div>
        </div>
      </div>
    `;

    // Bind checklist and KPI navigation
    container.querySelector('#btn-goto-closing-input')?.addEventListener('click', () => onNavigate('closing-input'));
    container.querySelector('#link-goto-order')?.addEventListener('click', (e) => {
      e.preventDefault();
      onNavigate('inventory-order');
    });
    container.querySelector('#card-kpi-inv')?.addEventListener('click', () => onNavigate('inventory-order'));
    container.querySelector('#item-checklist-order')?.addEventListener('click', () => onNavigate('inventory-order'));
    container.querySelector('#btn-checklist-order')?.addEventListener('click', (e) => {
      e.stopPropagation();
      onNavigate('inventory-order');
    });
    container.querySelector('#btn-goto-expected-pl')?.addEventListener('click', () => onNavigate('expected-pl'));

    // Excel Backup button (FEAT-18 & Case 3.4)
    container.querySelector('#btn-backup-excel')?.addEventListener('click', async () => {
      const alertBox = container.querySelector('#home-alert-box');
      try {
        await exportBackupToExcel();
        alertBox.className = 'alert-box alert-info';
        alertBox.textContent = '✅ 11개 시트 엑셀 백업 파일이 성공적으로 다운로드되었습니다!';
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 4000);
      } catch (err) {
        alertBox.className = 'alert-box alert-danger';
        alertBox.textContent = `⚠️ 백업 중 오류: ${err.message}`;
        alertBox.classList.remove('hidden');
      }
    });

    // Excel Restore input (FEAT-18 & Case 3.4, 3.5)
    container.querySelector('#input-restore-excel')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const alertBox = container.querySelector('#home-alert-box');
      try {
        const result = await importBackupFromExcel(file);
        alertBox.className = 'alert-box alert-info';
        alertBox.textContent = `✅ 엑셀 복원 완료! 총 ${result.totalRecords.toLocaleString()}건의 데이터가 100% 복원되었습니다.`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 4000);
      } catch (err) {
        alertBox.className = 'alert-box alert-danger';
        alertBox.textContent = err.message || '유효하지 않은 엑셀 백업 파일입니다. 필수 시트(판매, 재고 등)를 확인해 주세요.';
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 5000);
      } finally {
        e.target.value = '';
      }
    });

    // Reset to Empty store button
    container.querySelector('#btn-reset-empty')?.addEventListener('click', async () => {
      if (confirm('정말로 모든 운영 데이터를 초기화하고 빈 매장 상태로 시작하시겠습니까?\n(기존 데이터 백업을 먼저 받아두시는 것을 권장합니다)')) {
        await store.resetToEmptyStore();
        const alertBox = container.querySelector('#home-alert-box');
        alertBox.className = 'alert-box alert-info';
        alertBox.textContent = '✅ 매장 운영 데이터가 빈 상태로 초기화되었습니다.';
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 3000);
      }
    });

    // Reload Seed dataset button
    container.querySelector('#btn-reload-seed')?.addEventListener('click', async () => {
      if (confirm('기존 445일치 샘플 실적 데이터를 다시 로드하시겠습니까?')) {
        const res = await fetch('/src/data/initialData.json');
        const seedData = await res.json();
        await store.resetToSeed(seedData);
        const alertBox = container.querySelector('#home-alert-box');
        alertBox.className = 'alert-box alert-info';
        alertBox.textContent = '✅ 445일치 실적 데이터가 성공적으로 다시 로드되었습니다!';
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 3000);
      }
    });
  }

  store.subscribe(update);
  update();
}

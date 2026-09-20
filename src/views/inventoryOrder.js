// Inventory & Order Management View (EPIC 3)
import { store } from '../models/store.js';
import {
  calculateInventoryLedger,
  calculateOrderRecommendations,
  generateOrderClipboardText
} from '../services/calculations.js';
import * as XLSX from 'xlsx';

export function renderInventoryOrderView(container) {
  let activeTab = 'orders'; // 'status' | 'orders'
  let targetDate = '2026-09-18';
  let onlyUrgent = true;

  function render() {
    const materials = store.get('materials');
    const openingInventory = store.get('opening_inventory');
    const inventoryEvents = store.get('inventory_events');
    const sales = store.get('sales');
    const recipes = store.get('recipes');
    const suppliers = store.get('suppliers');

    // 1. Calculate continuous inventory ledger up to targetDate
    const ledger = calculateInventoryLedger({
      materials,
      openingInventory,
      inventoryEvents,
      sales,
      recipes,
      targetDate
    });

    // 2. Calculate ROP and order recommendations
    const orderData = calculateOrderRecommendations({
      materials,
      inventoryLedger: ledger,
      sales,
      recipes,
      suppliers,
      referenceDate: targetDate
    });

    const displayItems = onlyUrgent ? orderData.urgentItems : orderData.items;
    const clipboardPreview = generateOrderClipboardText(orderData.urgentItems, targetDate);

    container.innerHTML = `
      <div class="view-panel">
        <!-- Top Stats Strip -->
        <div class="card" style="padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div>
              <span style="font-weight: 700; font-size: 16px; color: var(--on-surface);">재고 수불 및 규격 올림 발주</span>
              <div style="font-size: 11px; color: var(--outline);">기준일: ${targetDate} (11개 핵심 원부자재)</div>
            </div>
            <div class="divider-v"></div>
            <!-- Sub-tabs -->
            <div class="tab-group" id="inv-tabs">
              <button class="tab-btn ${activeTab === 'orders' ? 'active' : ''}" data-tab="orders">
                <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">shopping_cart</span>
                발주 추천 및 발주서 복사 (${orderData.urgentCount}건)
              </button>
              <button class="tab-btn ${activeTab === 'status' ? 'active' : ''}" data-tab="status">
                <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">inventory_2</span>
                11개 재료 수불부 및 실사
              </button>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <label for="inv-target-date" style="font-size: 11px; font-weight: 600; color: var(--outline);">조회일자:</label>
              <input type="date" id="inv-target-date" class="form-input" style="padding: 2px 6px; font-size: 11px; height: 28px;" value="${targetDate}" />
            </div>
          </div>
        </div>

        <!-- Notification Alert Box -->
        <div id="inv-alert-box" class="alert-box alert-info hidden"></div>

        ${activeTab === 'orders' ? `
          <!-- TAB 1: Order Recommendations & Clipboard Text Copy (FEAT-15, FEAT-16, Case 3.2) -->
          <div style="display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 14px; align-items: start;">
            
            <!-- Left: Recommendations Table -->
            <div class="card" style="padding: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid var(--outline-variant); padding-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 15px; font-weight: 700; color: var(--on-surface);">납기·안전재고 기반 규격 올림 발주 추천</span>
                  <span class="badge ${orderData.urgentCount > 0 ? 'badge-danger' : 'badge-profit'}">
                    긴급 발주 ${orderData.urgentCount}건
                  </span>
                </div>

                <div style="display: flex; align-items: center; gap: 6px;">
                  <label style="font-size: 12px; display: flex; align-items: center; gap: 4px; cursor: pointer;">
                    <input type="checkbox" id="chk-only-urgent" ${onlyUrgent ? 'checked' : ''} />
                    <span>발주 필요 품목만 보기</span>
                  </label>
                </div>
              </div>

              <!-- Recommendation Table -->
              <div class="table-container" style="box-shadow: none; border: 1px solid #e2e8f0;">
                <table class="data-table" style="font-size: 12px;">
                  <thead>
                    <tr style="background-color: #f8fafc;">
                      <th>품목명</th>
                      <th>거래처</th>
                      <th class="text-right">구매 규격</th>
                      <th class="text-right">현재고</th>
                      <th class="text-right">발주점(ROP)</th>
                      <th class="text-center" style="background-color: #eff6ff; color: #1e40af; font-weight: 700;">
                        권장 발주량
                      </th>
                      <th class="text-right">예상금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${displayItems.length === 0 ? `
                      <tr>
                        <td colspan="7" style="text-align: center; padding: 24px; color: var(--outline);">
                          🎉 현재 안전재고(ROP) 미달 품목이 없습니다. 모든 원부자재가 안전 수준입니다.
                        </td>
                      </tr>
                    ` : displayItems.map((item) => `
                      <tr style="${item.isUrgent ? 'background-color: #fffdf5;' : ''}">
                        <td style="font-weight: 600;">
                          ${item.name}
                          ${item.isUrgent ? '<span class="badge badge-danger" style="font-size: 10px; margin-left: 4px;">발주점 도달</span>' : ''}
                        </td>
                        <td style="color: var(--on-surface-variant);">${item.supplierName}</td>
                        <td class="text-right tabular-nums" style="color: var(--outline);">
                          ${item.packQuantity.toLocaleString()}${item.unit}/팩
                        </td>
                        <td class="text-right tabular-nums" style="font-weight: 600; color: ${item.isUrgent ? '#b91c1c' : 'inherit'};">
                          ${Math.round(item.currentStock).toLocaleString()}${item.unit}
                          <span style="font-size: 10px; color: var(--outline);">(${item.currentPacks}팩)</span>
                        </td>
                        <td class="text-right tabular-nums" style="color: var(--outline);">
                          ${Math.round(item.rop).toLocaleString()}${item.unit}
                          <span style="font-size: 10px;">(${item.ropPacks}팩)</span>
                        </td>
                        <td class="text-center tabular-nums" style="background-color: #eff6ff; font-weight: 700; font-size: 13px; color: #1e40af;">
                          ${item.orderPacks > 0 ? `<b>${item.orderPacks}박스/팩</b> <span style="font-size: 11px; font-weight: 500;">(${item.orderQuantity.toLocaleString()}${item.unit})</span>` : '-'}
                        </td>
                        <td class="text-right tabular-nums" style="font-weight: 600;">
                          ${item.estimatedCost > 0 ? `${item.estimatedCost.toLocaleString()}원` : '-'}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #f1f5f9; font-weight: 700;">
                      <td colspan="5" style="padding: 8px 12px;">발주 대상 합계 (${orderData.urgentCount}개 품목)</td>
                      <td class="text-center" style="color: #1e40af;">
                        ${orderData.urgentItems.reduce((acc, i) => acc + i.orderPacks, 0)}박스/팩
                      </td>
                      <td class="text-right tabular-nums" style="color: #065f46; font-size: 13px;">
                        ${orderData.totalEstimatedCost.toLocaleString()}원
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- Right: KakaoTalk/SMS Clipboard Preview & Actions (Case 3.2) -->
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div class="card" style="padding: 16px; border: 1.5px solid #2563eb; background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="material-symbols-outlined" style="color: #2563eb; font-size: 20px;">chat</span>
                    <span style="font-weight: 700; font-size: 14px; color: #1e3a8a;">발주서 문자 / 카톡 양식</span>
                  </div>
                  <span class="badge badge-volume">원클릭 복사</span>
                </div>

                <div style="font-size: 11px; color: var(--on-surface-variant); margin-bottom: 10px;">
                  거래처별 구매 규격(박스/팩)으로 올림 계산된 발주서입니다. 버튼을 누르면 거래처 카톡에 바로 붙여넣기 할 수 있습니다.
                </div>

                <!-- Textarea preview -->
                <textarea id="order-clipboard-textarea" readonly class="form-input" style="width: 100%; height: 210px; font-family: monospace; font-size: 12px; line-height: 1.5; background-color: #f8fafc; resize: none; margin-bottom: 12px;">${clipboardPreview}</textarea>

                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <button class="btn btn-primary" id="btn-copy-order-text" style="width: 100%; padding: 10px; font-size: 13px;">
                    <span class="material-symbols-outlined" style="font-size: 18px;">content_copy</span>
                    발주서 텍스트 복사 (카톡/문자용)
                  </button>
                  <button class="btn btn-secondary btn-sm" id="btn-export-order-excel" style="width: 100%;">
                    <span class="material-symbols-outlined" style="font-size: 14px;">download</span>
                    발주 목록 엑셀(.xlsx) 다운로드
                  </button>
                </div>
              </div>
            </div>

          </div>
        ` : `
          <!-- TAB 2: 11 Materials Continuous Inventory Ledger & Audit (FEAT-12, FEAT-13, Case 3.1) -->
          <div class="card" style="padding: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid var(--outline-variant); padding-bottom: 8px;">
              <div>
                <div style="font-size: 15px; font-weight: 700; color: var(--on-surface);">11개 핵심 원부자재 일별 수불부 및 실사조정</div>
                <div style="font-size: 11px; color: var(--outline);">
                  기초재고 + 입고 - 판매소모 - 폐기 ± 실사차이 = 당일 마감재고 (과거 수정 시 자동 연쇄 재계산)
                </div>
              </div>
            </div>

            <!-- Ledger Table -->
            <div class="table-container" style="box-shadow: none; border: 1px solid #e2e8f0;">
              <table class="data-table" style="font-size: 12px;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="width: 60px;">코드</th>
                    <th>품목명</th>
                    <th style="width: 50px;">단위</th>
                    <th class="text-right" style="width: 90px;">전일 마감</th>
                    <th class="text-right" style="width: 80px; color: #166534;">오늘 입고(+)</th>
                    <th class="text-right" style="width: 80px; color: #1e40af;">판매 소모(-)</th>
                    <th class="text-right" style="width: 80px; color: #991b1b;">오늘 폐기(-)</th>
                    <th class="text-right" style="width: 90px;">실사차이(±)</th>
                    <th class="text-right" style="width: 100px; background-color: #f1f5f9; font-weight: 700;">오늘 현재고</th>
                    <th class="text-center" style="width: 160px; background-color: #eff6ff;">오늘 실사 수량 등록</th>
                  </tr>
                </thead>
                <tbody>
                  ${ledger.items.map((it) => `
                    <tr data-mat-id="${it.materialId}">
                      <td class="tabular-nums" style="color: var(--outline);">${it.materialId}</td>
                      <td style="font-weight: 600;">${it.name}</td>
                      <td style="color: var(--outline);">${it.unit}</td>
                      <td class="text-right tabular-nums">${Math.round(it.yesterdayStock).toLocaleString()}</td>
                      <td class="text-right tabular-nums" style="color: #166534; font-weight: 600;">
                        ${it.todayInflow > 0 ? `+${Math.round(it.todayInflow).toLocaleString()}` : '0'}
                      </td>
                      <td class="text-right tabular-nums" style="color: #1e40af;">
                        ${it.todayUsage > 0 ? `-${Math.round(it.todayUsage).toLocaleString()}` : '0'}
                      </td>
                      <td class="text-right tabular-nums" style="color: #991b1b;">
                        ${it.todayWaste > 0 ? `-${Math.round(it.todayWaste).toLocaleString()}` : '0'}
                      </td>
                      <td class="text-right tabular-nums" style="color: ${it.todayAuditDiff !== 0 ? '#d97706' : 'var(--outline)'}; font-weight: 600;">
                        ${it.todayAuditDiff > 0 ? `+${Math.round(it.todayAuditDiff)}` : it.todayAuditDiff < 0 ? `${Math.round(it.todayAuditDiff)}` : '0'}
                      </td>
                      <td class="text-right tabular-nums" style="background-color: #f1f5f9; font-weight: 700; font-size: 13px;">
                        ${Math.round(it.currentStock).toLocaleString()}
                        <span style="font-size: 10px; font-weight: 400; color: var(--outline);">(${it.currentPacks.toFixed(1)}팩)</span>
                      </td>
                      <td class="text-center" style="background-color: #eff6ff;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                          <input type="number" min="0" class="form-input input-audit-stock tabular-nums" 
                                 style="width: 80px; height: 26px; padding: 2px 6px; font-size: 11px; text-align: right;" 
                                 placeholder="${Math.round(it.currentStock)}" />
                          <button class="btn btn-primary btn-sm btn-save-audit" data-mat-id="${it.materialId}" style="height: 26px; padding: 2px 6px;">
                            실사반영
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `}

      </div>
    `;

    // Event Listeners
    // Tab switching
    container.querySelectorAll('#inv-tabs .tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab');
        render();
      });
    });

    // Target date change
    const dateInput = container.querySelector('#inv-target-date');
    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        targetDate = e.target.value;
        render();
      });
    }

    // Only urgent checkbox
    const chkUrgent = container.querySelector('#chk-only-urgent');
    if (chkUrgent) {
      chkUrgent.addEventListener('change', (e) => {
        onlyUrgent = e.target.checked;
        render();
      });
    }

    // Copy order text button (Case 3.2)
    const btnCopy = container.querySelector('#btn-copy-order-text');
    if (btnCopy) {
      btnCopy.addEventListener('click', async () => {
        const text = clipboardPreview;
        try {
          await navigator.clipboard.writeText(text);
          const alertBox = container.querySelector('#inv-alert-box');
          alertBox.className = 'alert-box alert-info';
          alertBox.textContent = '✅ 발주서 텍스트가 클립보드에 복사되었습니다! 카카오톡이나 문자에 바로 붙여넣기 하세요.';
          alertBox.classList.remove('hidden');
          setTimeout(() => alertBox.classList.add('hidden'), 4000);
        } catch (err) {
          // Fallback selection
          const textarea = container.querySelector('#order-clipboard-textarea');
          if (textarea) {
            textarea.select();
            document.execCommand('copy');
            const alertBox = container.querySelector('#inv-alert-box');
            alertBox.className = 'alert-box alert-info';
            alertBox.textContent = '✅ 발주서 텍스트가 복사되었습니다!';
            alertBox.classList.remove('hidden');
            setTimeout(() => alertBox.classList.add('hidden'), 4000);
          }
        }
      });
    }

    // Export order to Excel
    const btnExportExcel = container.querySelector('#btn-export-order-excel');
    if (btnExportExcel) {
      btnExportExcel.addEventListener('click', () => {
        const wb = XLSX.utils.book_new();
        const exportRows = orderData.urgentItems.map((it) => ({
          '거래처': it.supplierName,
          '품목명': it.name,
          '규격단위': `${it.packQuantity}${it.unit}/팩`,
          '현재고': it.currentStock,
          '발주점(ROP)': Math.round(it.rop),
          '권장발주량(팩)': it.orderPacks,
          '발주수량(단위)': it.orderQuantity,
          '단위': it.unit,
          '예상금액': it.estimatedCost
        }));
        const ws = XLSX.utils.json_to_sheet(exportRows);
        XLSX.utils.book_append_sheet(wb, ws, '발주추천서');
        XLSX.writeFile(wb, `프렙카페_발주서_${targetDate}.xlsx`);
      });
    }

    // Stocktake adjustment button (FEAT-12, FEAT-19, Case 3.5)
    container.querySelectorAll('.btn-save-audit').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const mid = btn.getAttribute('data-mat-id');
        const tr = btn.closest('tr');
        const input = tr.querySelector('.input-audit-stock');
        const alertBox = container.querySelector('#inv-alert-box');

        const enteredValue = parseFloat(input.value);

        // Validation: Negative check (Case 3.5)
        if (isNaN(enteredValue) || enteredValue < 0) {
          alertBox.className = 'alert-box alert-danger';
          alertBox.textContent = '실사 수량은 0 이상이어야 합니다';
          alertBox.classList.remove('hidden');
          setTimeout(() => alertBox.classList.add('hidden'), 4000);
          return;
        }

        const targetMat = ledger.items.find((i) => i.materialId === mid);
        if (!targetMat) return;

        // Diff = enteredValue - currentStock
        const diff = enteredValue - targetMat.currentStock;

        await store.addOrUpdateInventoryEvent({
          date: targetDate,
          material_id: mid,
          event_type: '실사조정',
          quantity: diff,
          unit: targetMat.unit,
          reason: `정기 실사조정 (실사치: ${enteredValue}${targetMat.unit})`
        });

        alertBox.className = 'alert-box alert-info';
        alertBox.textContent = `✅ [${targetMat.name}] 실사 수량 ${enteredValue}${targetMat.unit}(차이: ${diff >= 0 ? '+' : ''}${diff})이 성공적으로 반영되었습니다!`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 3500);

        render();
      });
    });
  }

  render();
}

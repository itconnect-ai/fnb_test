// Daily Closing Sales, Expenses & Inventory Inflow/Waste View (EPIC 1, 2, 3)
import { store } from '../models/store.js';
import { calculateRecipeUnitCost, calculateItemMargin } from '../services/calculations.js';

export function renderClosingInputView(container) {
  let selectedDate = '2026-09-18'; // Default to reference date, editable to any day

  function render() {
    const menus = store.get('menus');
    const recipes = store.get('recipes');
    const priceHistory = store.get('price_history');
    const materials = store.get('materials');
    const existingSales = store.getSalesByDate(selectedDate);
    const existingExpenses = store.getExpensesByDate(selectedDate);
    const existingEvents = store.getInventoryEventsByDate(selectedDate);

    // Prepare draft input items for 8 menus
    const rowsData = menus.map((m) => {
      // Find existing record for 매장 & 포장
      const dineInSale = existingSales.find((s) => s.menu_id === m.menu_id && s.channel === '매장');
      const takeOutSale = existingSales.find((s) => s.menu_id === m.menu_id && s.channel === '포장');

      const dineInQty = dineInSale ? dineInSale.quantity : 0;
      const dineInDiscount = dineInSale ? dineInSale.discount_amount : 0;

      const takeOutQty = takeOutSale ? takeOutSale.quantity : 0;
      const takeOutDiscount = takeOutSale ? takeOutSale.discount_amount : 0;

      // Recipe costs
      const costDineIn = calculateRecipeUnitCost(m.recipe_version, m.menu_id, '매장', selectedDate, recipes, priceHistory, materials);
      const costTakeOut = calculateRecipeUnitCost(m.recipe_version, m.menu_id, '포장', selectedDate, recipes, priceHistory, materials);

      return {
        menuId: m.menu_id,
        menuName: m.name,
        category: m.category,
        basePrice: m.price,
        recipeVersion: m.recipe_version,
        foodCost: costDineIn.foodCost,
        packagingCost: costTakeOut.packagingCost,
        dineInQty,
        dineInDiscount,
        takeOutQty,
        takeOutDiscount
      };
    });

    const totalDayExpense = existingExpenses.reduce((sum, e) => sum + Number(e.amount || e.금액 || 0), 0);

    container.innerHTML = `
      <div class="view-panel">
        <!-- Header Strip -->
        <div class="card" style="padding: 12px 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 10px;">
            <span style="font-weight: 700; font-size: 16px; color: var(--on-surface);">일일 마감 판매·지출·입출고 입력</span>
            <div class="divider-v"></div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <label for="closing-date-input" style="font-size: 12px; font-weight: 600; color: var(--on-surface-variant);">마감 일자:</label>
              <input type="date" id="closing-date-input" class="form-input" style="padding: 3px 8px; font-size: 12px; height: 30px;" value="${selectedDate}" />
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-reset-inputs">
              <span class="material-symbols-outlined" style="font-size: 14px;">refresh</span>
              판매 입력 초기화
            </button>
            <button class="btn btn-primary" id="btn-save-sales">
              <span class="material-symbols-outlined" style="font-size: 16px;">save</span>
              오늘 마감 판매 저장
            </button>
          </div>
        </div>

        <!-- Alert Notification Box -->
        <div id="alert-container"></div>

        <!-- SECTION 1: Daily Menu Sales Input Table (FEAT-04 & FEAT-05) -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 70px;">코드</th>
                <th class="col-sticky">메뉴명</th>
                <th style="width: 80px;" class="text-right">기준단가</th>
                <th style="width: 70px;" class="text-right">식재료비</th>
                <th style="width: 60px;" class="text-right">포장비</th>
                
                <!-- Dine-in Input Columns -->
                <th style="width: 90px; background-color: #eff6ff;" class="text-center">매장 판매(잔)</th>
                <th style="width: 100px; background-color: #eff6ff;" class="text-right">매장 총할인(원)</th>
                <th style="width: 90px; background-color: #eff6ff; color: var(--primary);" class="text-right">매장 개당마진</th>

                <!-- Takeout Input Columns -->
                <th style="width: 90px; background-color: #fffbeb;" class="text-center">포장 판매(잔)</th>
                <th style="width: 100px; background-color: #fffbeb;" class="text-right">포장 총할인(원)</th>
                <th style="width: 90px; background-color: #fffbeb; color: #92400e;" class="text-right">포장 개당마진</th>

                <!-- Total Row Summary -->
                <th style="width: 110px;" class="text-right">금일 총공헌이익</th>
              </tr>
            </thead>
            <tbody id="closing-input-tbody">
              ${rowsData.map((row) => `
                <tr data-menu-id="${row.menuId}">
                  <td class="tabular-nums" style="color: var(--outline);">${row.menuId}</td>
                  <td class="col-sticky" style="font-weight: 600;">
                    ${row.menuName}
                    <div class="row-warning-text hidden" style="font-size: 11px; color: var(--error); font-weight: 700;"></div>
                  </td>
                  <td class="text-right tabular-nums">${row.basePrice.toLocaleString()}원</td>
                  <td class="text-right tabular-nums" style="color: var(--outline);">${row.foodCost.toFixed(0)}원</td>
                  <td class="text-right tabular-nums" style="color: var(--outline);">${row.packagingCost.toFixed(0)}원</td>

                  <!-- Dine-in Inputs -->
                  <td class="text-center" style="background-color: #f8fafc;">
                    <input type="number" min="0" class="form-input tabular-nums input-dinein-qty" 
                           style="width: 70px; text-align: right; padding: 2px 6px; height: 26px;" 
                           value="${row.dineInQty}" />
                  </td>
                  <td class="text-right" style="background-color: #f8fafc;">
                    <input type="number" min="0" step="100" class="form-input tabular-nums input-dinein-discount" 
                           style="width: 80px; text-align: right; padding: 2px 6px; height: 26px;" 
                           value="${row.dineInDiscount}" placeholder="0" />
                  </td>
                  <td class="text-right tabular-nums live-dinein-margin" style="background-color: #f8fafc; font-weight: 600; color: var(--primary);">
                    -
                  </td>

                  <!-- Takeout Inputs -->
                  <td class="text-center" style="background-color: #fffdf5;">
                    <input type="number" min="0" class="form-input tabular-nums input-takeout-qty" 
                           style="width: 70px; text-align: right; padding: 2px 6px; height: 26px;" 
                           value="${row.takeOutQty}" />
                  </td>
                  <td class="text-right" style="background-color: #fffdf5;">
                    <input type="number" min="0" step="100" class="form-input tabular-nums input-takeout-discount" 
                           style="width: 80px; text-align: right; padding: 2px 6px; height: 26px;" 
                           value="${row.takeOutDiscount}" placeholder="0" />
                  </td>
                  <td class="text-right tabular-nums live-takeout-margin" style="background-color: #fffdf5; font-weight: 600; color: #92400e;">
                    -
                  </td>

                  <!-- Total Contribution -->
                  <td class="text-right tabular-nums live-total-contrib" style="font-weight: 700; font-size: 13px; color: #065f46;">
                    0원
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background-color: #f1f5f9; font-weight: 700;">
                <td colspan="5" style="padding: 10px 12px;">판매 합계</td>
                <td class="text-center tabular-nums" id="total-dinein-qty">0잔</td>
                <td class="text-right tabular-nums" id="total-dinein-disc">0원</td>
                <td></td>
                <td class="text-center tabular-nums" id="total-takeout-qty">0잔</td>
                <td class="text-right tabular-nums" id="total-takeout-disc">0원</td>
                <td></td>
                <td class="text-right tabular-nums" style="color: #065f46; font-size: 14px;" id="grand-total-contrib">0원</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- SECTION 2: Daily Operating Expenses (FEAT-06 & FEAT-11) -->
        <div class="card" style="padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="material-symbols-outlined" style="color: var(--tertiary); font-size: 20px;">receipt_long</span>
              <span style="font-weight: 700; font-size: 15px; color: var(--on-surface);">
                일일 매장 운영비(지출) 등록 및 조회
              </span>
              <span style="font-size: 12px; color: var(--outline);">(${selectedDate} 기준)</span>
            </div>
            <div style="font-size: 13px; font-weight: 700; color: var(--on-surface);">
              금일 등록 지출 합계: <span class="tabular-nums" style="color: #b91c1c;">${totalDayExpense.toLocaleString()}원</span>
            </div>
          </div>

          <!-- Expense Input Form Row -->
          <div class="form-row-grid-4" style="background-color: #f8fafc; padding: 12px; border-radius: var(--radius-md); border: 1px solid #e2e8f0; margin-bottom: 12px;">
            <div>
              <label for="expense-category-select" style="font-size: 11px; font-weight: 600; color: var(--on-surface-variant); display: block; margin-bottom: 4px;">
                비용 항목
              </label>
              <select id="expense-category-select" class="form-input" style="height: 32px; font-size: 12px;">
                <option value="소모품·청소비">소모품·청소비</option>
                <option value="수도광열비">수도광열비</option>
                <option value="광고비">광고비</option>
                <option value="통신·소프트웨어">통신·소프트웨어</option>
                <option value="관리비">관리비</option>
                <option value="인건비">인건비</option>
                <option value="임차료">임차료</option>
                <option value="사업주 부담 보험료">사업주 부담 보험료</option>
                <option value="기타운영비">기타운영비</option>
              </select>
            </div>

            <div>
              <label for="expense-amount-input" style="font-size: 11px; font-weight: 600; color: var(--on-surface-variant); display: block; margin-bottom: 4px;">
                지출 금액 (원)
              </label>
              <input type="number" id="expense-amount-input" class="form-input tabular-nums" style="height: 32px; font-size: 12px;" placeholder="0" />
            </div>

            <div>
              <label for="expense-memo-input" style="font-size: 11px; font-weight: 600; color: var(--on-surface-variant); display: block; margin-bottom: 4px;">
                내용 / 사유
              </label>
              <input type="text" id="expense-memo-input" class="form-input" style="height: 32px; font-size: 12px;" placeholder="예: 매장 청소용품 및 냅킨 구매" />
            </div>

            <button class="btn btn-primary" id="btn-add-expense" style="height: 32px;">
              <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
              지출 등록
            </button>
          </div>

          <!-- Expense Items List -->
          <div class="table-container" style="box-shadow: none; border: 1px solid #e2e8f0;">
            <table class="data-table" style="font-size: 12px;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="width: 100px;">비용ID</th>
                  <th style="width: 140px;">비용 항목</th>
                  <th>내용 / 사유</th>
                  <th class="text-right" style="width: 120px;">금액 (원)</th>
                  <th class="text-center" style="width: 80px;">관리</th>
                </tr>
              </thead>
              <tbody id="expense-items-tbody">
                ${existingExpenses.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; color: var(--outline); padding: 16px;">
                      해당 일자에 직접 등록된 개별 지출이 없습니다. (손익계산서 조회 시 월비용 계획의 일할 배분액이 적용됩니다)
                    </td>
                  </tr>
                ` : existingExpenses.map((exp) => `
                  <tr>
                    <td class="tabular-nums" style="color: var(--outline);">${exp.expense_id || exp.비용ID || '-'}</td>
                    <td style="font-weight: 600;">${exp.category || exp.항목}</td>
                    <td style="color: var(--on-surface-variant);">${exp.recognition || exp.memo || exp.내용 || '-'}</td>
                    <td class="text-right tabular-nums" style="font-weight: 700; color: #b91c1c;">
                      ${Number(exp.amount || exp.금액 || 0).toLocaleString()}원
                    </td>
                    <td class="text-center">
                      <button class="btn btn-secondary btn-sm btn-delete-expense" data-id="${exp.expense_id || exp.비용ID}" style="padding: 2px 6px; color: var(--error);">
                        삭제
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- SECTION 3: Daily Materials Inflow & Waste Registration (FEAT-12 & Case 3.1, 3.3) -->
        <div class="card" style="padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="material-symbols-outlined" style="color: #166534; font-size: 20px;">move_to_inbox</span>
              <span style="font-weight: 700; font-size: 15px; color: var(--on-surface);">
                일일 원부자재 입고(+) 및 폐기(-) 등록
              </span>
              <span style="font-size: 12px; color: var(--outline);">(${selectedDate} 기준)</span>
            </div>
            <div style="font-size: 13px; color: var(--outline);">
              등록 시 11개 재료 수불부에 즉시 자동 연쇄 반영됩니다.
            </div>
          </div>

          <!-- Event Input Form Row -->
          <div class="form-row-grid-5" style="background-color: #f8fafc; padding: 12px; border-radius: var(--radius-md); border: 1px solid #e2e8f0; margin-bottom: 12px;">
            <div>
              <label for="inv-type-select" style="font-size: 11px; font-weight: 600; color: var(--on-surface-variant); display: block; margin-bottom: 4px;">
                구분
              </label>
              <select id="inv-type-select" class="form-input" style="height: 32px; font-size: 12px;">
                <option value="입고">입고 (+)</option>
                <option value="폐기">폐기 (-)</option>
              </select>
            </div>

            <div>
              <label for="inv-mat-select" style="font-size: 11px; font-weight: 600; color: var(--on-surface-variant); display: block; margin-bottom: 4px;">
                원부자재 품목
              </label>
              <select id="inv-mat-select" class="form-input" style="height: 32px; font-size: 12px;">
                ${materials.map((m) => `
                  <option value="${m.material_id}" data-unit="${m.unit}">
                    [${m.material_id}] ${m.name} (${m.unit})
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label for="inv-qty-input" style="font-size: 11px; font-weight: 600; color: var(--on-surface-variant); display: block; margin-bottom: 4px;">
                수량 (<span id="inv-unit-label">${materials[0]?.unit || 'g'}</span>)
              </label>
              <input type="number" id="inv-qty-input" min="0" class="form-input tabular-nums" style="height: 32px; font-size: 12px;" placeholder="0" />
            </div>

            <div>
              <label for="inv-reason-input" style="font-size: 11px; font-weight: 600; color: var(--on-surface-variant); display: block; margin-bottom: 4px;">
                사유 / 메모
              </label>
              <input type="text" id="inv-reason-input" class="form-input" style="height: 32px; font-size: 12px;" placeholder="예: 정기 거래처 입고 / 유통기한 경과 폐기" />
            </div>

            <button class="btn btn-primary" id="btn-add-inv-event" style="height: 32px;">
              <span class="material-symbols-outlined" style="font-size: 16px;">add_circle</span>
              입출고 등록
            </button>
          </div>

          <!-- Event Items List -->
          <div class="table-container" style="box-shadow: none; border: 1px solid #e2e8f0;">
            <table class="data-table" style="font-size: 12px;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="width: 90px;">이벤트ID</th>
                  <th style="width: 80px;" class="text-center">구분</th>
                  <th style="width: 140px;">품목명</th>
                  <th class="text-right" style="width: 100px;">수량</th>
                  <th>사유 / 메모</th>
                  <th class="text-center" style="width: 80px;">관리</th>
                </tr>
              </thead>
              <tbody id="inv-events-tbody">
                ${existingEvents.length === 0 ? `
                  <tr>
                    <td colspan="6" style="text-align: center; color: var(--outline); padding: 16px;">
                      해당 일자에 직접 등록된 입고 또는 폐기 내역이 없습니다.
                    </td>
                  </tr>
                ` : existingEvents.map((ev) => {
                  const m = materials.find((mat) => mat.material_id === ev.material_id);
                  const isIncoming = ev.event_type === '입고';
                  return `
                    <tr>
                      <td class="tabular-nums" style="color: var(--outline);">${ev.event_id || ev.이벤트ID || '-'}</td>
                      <td class="text-center">
                        <span class="badge ${isIncoming ? 'badge-profit' : 'badge-danger'}">
                          ${ev.event_type}
                        </span>
                      </td>
                      <td style="font-weight: 600;">${m ? m.name : ev.material_id}</td>
                      <td class="text-right tabular-nums" style="font-weight: 700; color: ${isIncoming ? '#166534' : '#b91c1c'};">
                        ${isIncoming ? '+' : '-'}${Number(ev.quantity || 0).toLocaleString()}${ev.unit || (m ? m.unit : '')}
                      </td>
                      <td style="color: var(--on-surface-variant);">${ev.reason || '-'}</td>
                      <td class="text-center">
                        <button class="btn btn-secondary btn-sm btn-delete-inv-event" data-id="${ev.event_id || ev.이벤트ID}" style="padding: 2px 6px; color: var(--error);">
                          삭제
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    // Recalculate Live Preview on user input
    function updateLivePreview() {
      let sumDineInQty = 0;
      let sumDineInDisc = 0;
      let sumTakeOutQty = 0;
      let sumTakeOutDisc = 0;
      let grandTotalContrib = 0;

      const rows = container.querySelectorAll('#closing-input-tbody tr');
      rows.forEach((tr, idx) => {
        const rowData = rowsData[idx];
        const dineInQty = parseFloat(tr.querySelector('.input-dinein-qty').value) || 0;
        const dineInDisc = parseFloat(tr.querySelector('.input-dinein-discount').value) || 0;
        const takeOutQty = parseFloat(tr.querySelector('.input-takeout-qty').value) || 0;
        const takeOutDisc = parseFloat(tr.querySelector('.input-takeout-discount').value) || 0;

        sumDineInQty += dineInQty;
        sumDineInDisc += dineInDisc;
        sumTakeOutQty += takeOutQty;
        sumTakeOutDisc += takeOutDisc;

        // Calc Dine-in margin
        const dineInDiscPerItem = dineInQty > 0 ? dineInDisc / dineInQty : 0;
        const mDineIn = calculateItemMargin({
          unitPrice: rowData.basePrice,
          discountPerItem: dineInDiscPerItem,
          foodCost: rowData.foodCost,
          packagingCost: 0
        });

        // Calc Takeout margin
        const takeOutDiscPerItem = takeOutQty > 0 ? takeOutDisc / takeOutQty : 0;
        const mTakeOut = calculateItemMargin({
          unitPrice: rowData.basePrice,
          discountPerItem: takeOutDiscPerItem,
          foodCost: rowData.foodCost,
          packagingCost: rowData.packagingCost
        });

        const dineInContrib = dineInQty * mDineIn.netMargin;
        const takeOutContrib = takeOutQty * mTakeOut.netMargin;
        const rowContrib = dineInContrib + takeOutContrib;
        grandTotalContrib += rowContrib;

        // Update row DOM
        const elDineInMargin = tr.querySelector('.live-dinein-margin');
        const elTakeOutMargin = tr.querySelector('.live-takeout-margin');
        const elRowContrib = tr.querySelector('.live-total-contrib');
        const elWarningText = tr.querySelector('.row-warning-text');

        elDineInMargin.textContent = `${mDineIn.netMargin.toFixed(1)}원 (${mDineIn.marginRate.toFixed(1)}%)`;
        elTakeOutMargin.textContent = `${mTakeOut.netMargin.toFixed(1)}원 (${mTakeOut.marginRate.toFixed(1)}%)`;
        elRowContrib.textContent = `${Math.round(rowContrib).toLocaleString()}원`;

        // Check negative margin warning
        if (mDineIn.isNegativeMargin || mTakeOut.isNegativeMargin) {
          tr.classList.add('warning-row');
          elWarningText.classList.remove('hidden');
          elWarningText.textContent = '⚠️ 역마진 주의: 할인액이 원가보다 큽니다.';
        } else {
          tr.classList.remove('warning-row');
          elWarningText.classList.add('hidden');
        }
      });

      container.querySelector('#total-dinein-qty').textContent = `${sumDineInQty}잔`;
      container.querySelector('#total-dinein-disc').textContent = `${sumDineInDisc.toLocaleString()}원`;
      container.querySelector('#total-takeout-qty').textContent = `${sumTakeOutQty}잔`;
      container.querySelector('#total-takeout-disc').textContent = `${sumTakeOutDisc.toLocaleString()}원`;
      container.querySelector('#grand-total-contrib').textContent = `${Math.round(grandTotalContrib).toLocaleString()}원`;
    }

    // Attach Sales Input Event Listeners
    container.querySelectorAll('#closing-input-tbody input').forEach((input) => {
      input.addEventListener('input', () => {
        if (parseFloat(input.value) < 0) {
          input.value = 0;
          const alertBox = container.querySelector('#input-alert-box');
          alertBox.className = 'alert-box alert-danger';
          alertBox.textContent = '⚠️ 판매 수량 및 할인액은 0 이상이어야 합니다.';
          alertBox.classList.remove('hidden');
          setTimeout(() => alertBox.classList.add('hidden'), 3000);
        }
        updateLivePreview();
      });
    });

    // Date change listener
    const dateInput = container.querySelector('#closing-date-input');
    dateInput.addEventListener('change', (e) => {
      selectedDate = e.target.value;
      render();
    });

    // Reset button
    container.querySelector('#btn-reset-inputs').addEventListener('click', () => {
      container.querySelectorAll('#closing-input-tbody input').forEach((inp) => (inp.value = 0));
      updateLivePreview();
    });

    // Save Sales button
    container.querySelector('#btn-save-sales').addEventListener('click', async () => {
      const salesBatch = [];
      let hasNegative = false;

      const rows = container.querySelectorAll('#closing-input-tbody tr');
      rows.forEach((tr, idx) => {
        const rowData = rowsData[idx];
        const dineInQty = parseFloat(tr.querySelector('.input-dinein-qty').value) || 0;
        const dineInDisc = parseFloat(tr.querySelector('.input-dinein-discount').value) || 0;
        const takeOutQty = parseFloat(tr.querySelector('.input-takeout-qty').value) || 0;
        const takeOutDisc = parseFloat(tr.querySelector('.input-takeout-discount').value) || 0;

        if (dineInQty < 0 || dineInDisc < 0 || takeOutQty < 0 || takeOutDisc < 0) {
          hasNegative = true;
          return;
        }

        if (dineInQty > 0) {
          salesBatch.push({
            date: selectedDate,
            menu_id: rowData.menuId,
            channel: '매장',
            quantity: dineInQty,
            unit_price: rowData.basePrice,
            discount_amount: dineInDisc,
            net_sales: (rowData.basePrice * dineInQty) - dineInDisc,
            payment_fee: Math.round(((rowData.basePrice * dineInQty) - dineInDisc) * 0.015),
            recipe_version: rowData.recipeVersion
          });
        }

        if (takeOutQty > 0) {
          salesBatch.push({
            date: selectedDate,
            menu_id: rowData.menuId,
            channel: '포장',
            quantity: takeOutQty,
            unit_price: rowData.basePrice,
            discount_amount: takeOutDisc,
            net_sales: (rowData.basePrice * takeOutQty) - takeOutDisc,
            payment_fee: Math.round(((rowData.basePrice * takeOutQty) - takeOutDisc) * 0.015),
            recipe_version: rowData.recipeVersion
          });
        }
      });

      if (hasNegative) {
        const alertBox = container.querySelector('#input-alert-box');
        alertBox.className = 'alert-box alert-danger';
        alertBox.textContent = '⚠️ 판매 수량이나 할인액에 음수가 포함되어 있어 저장할 수 없습니다.';
        alertBox.classList.remove('hidden');
        return;
      }

      await store.saveDailySalesBatch(salesBatch);

      const alertBox = container.querySelector('#input-alert-box');
      alertBox.className = 'alert-box alert-info';
      alertBox.textContent = `✅ ${selectedDate} 마감 판매 데이터(${salesBatch.length}개 전표)가 성공적으로 저장되었습니다!`;
      alertBox.classList.remove('hidden');
      setTimeout(() => alertBox.classList.add('hidden'), 4000);
    });

    // Add Expense button
    const btnAddExpense = container.querySelector('#btn-add-expense');
    if (btnAddExpense) {
      btnAddExpense.addEventListener('click', async () => {
        const catSelect = container.querySelector('#expense-category-select');
        const amtInput = container.querySelector('#expense-amount-input');
        const memoInput = container.querySelector('#expense-memo-input');
        const alertBox = container.querySelector('#input-alert-box');

        const category = catSelect.value;
        const amount = parseFloat(amtInput.value);
        const memo = memoInput.value.trim();

        if (isNaN(amount) || amount < 0) {
          alertBox.className = 'alert-box alert-danger';
          alertBox.textContent = '지출 금액은 0원 이상이어야 합니다';
          alertBox.classList.remove('hidden');
          setTimeout(() => alertBox.classList.add('hidden'), 4000);
          return;
        }

        if (amount === 0) {
          alertBox.className = 'alert-box alert-danger';
          alertBox.textContent = '⚠️ 0원 초과의 지출 금액을 입력해 주세요.';
          alertBox.classList.remove('hidden');
          setTimeout(() => alertBox.classList.add('hidden'), 3000);
          return;
        }

        await store.addOrUpdateExpense({
          date: selectedDate,
          category,
          amount,
          recognition: memo || '일일 지출 등록'
        });

        alertBox.className = 'alert-box alert-info';
        alertBox.textContent = `✅ ${selectedDate} [${category}] 지출 ${amount.toLocaleString()}원이 성공적으로 등록되었습니다!`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 3000);

        render();
      });
    }

    // Delete Expense buttons
    container.querySelectorAll('.btn-delete-expense').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (id) {
          await store.deleteExpense(id);
          render();
        }
      });
    });

    // Sync Material Unit Label
    const matSelect = container.querySelector('#inv-mat-select');
    if (matSelect) {
      matSelect.addEventListener('change', () => {
        const selectedOpt = matSelect.options[matSelect.selectedIndex];
        const unit = selectedOpt.getAttribute('data-unit');
        const unitLabel = container.querySelector('#inv-unit-label');
        if (unitLabel && unit) unitLabel.textContent = unit;
      });
    }

    // Add Inventory Event button (FEAT-12 & Case 3.1, 3.3)
    const btnAddEvent = container.querySelector('#btn-add-inv-event');
    if (btnAddEvent) {
      btnAddEvent.addEventListener('click', async () => {
        const typeSelect = container.querySelector('#inv-type-select');
        const matSel = container.querySelector('#inv-mat-select');
        const qtyInput = container.querySelector('#inv-qty-input');
        const reasonInput = container.querySelector('#inv-reason-input');
        const alertBox = container.querySelector('#input-alert-box');

        const event_type = typeSelect.value;
        const material_id = matSel.value;
        const quantity = parseFloat(qtyInput.value);
        const reason = reasonInput.value.trim();

        if (isNaN(quantity) || quantity < 0) {
          alertBox.className = 'alert-box alert-danger';
          alertBox.textContent = '수량은 0 이상이어야 합니다';
          alertBox.classList.remove('hidden');
          setTimeout(() => alertBox.classList.add('hidden'), 3500);
          return;
        }

        if (quantity === 0) {
          alertBox.className = 'alert-box alert-danger';
          alertBox.textContent = '⚠️ 0 초과의 수량을 입력해 주세요.';
          alertBox.classList.remove('hidden');
          setTimeout(() => alertBox.classList.add('hidden'), 3000);
          return;
        }

        const m = materials.find((mat) => mat.material_id === material_id);
        const unit = m ? m.unit : 'g';

        await store.addOrUpdateInventoryEvent({
          date: selectedDate,
          material_id,
          event_type,
          quantity,
          unit,
          reason: reason || `${event_type} 등록`
        });

        alertBox.className = 'alert-box alert-info';
        alertBox.textContent = `✅ ${selectedDate} [${m ? m.name : material_id}] ${event_type}(${quantity.toLocaleString()}${unit})이 성공적으로 등록되었습니다!`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 3500);

        render();
      });
    }

    // Delete Inventory Event buttons
    container.querySelectorAll('.btn-delete-inv-event').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (id) {
          await store.deleteInventoryEvent(id);
          render();
        }
      });
    });

    updateLivePreview();
  }

  render();
}

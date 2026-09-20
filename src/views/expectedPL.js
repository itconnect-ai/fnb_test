// Expected P&L Statement and Monthly Projection View (EPIC 2 with Charts)
import { store } from '../models/store.js';
import { calculatePLStatement, calculateMonthlyProjection } from '../services/calculations.js';
import { createDonutChart, createForecastBandChart } from '../services/charts.js';

export function renderExpectedPLView(container) {
  // Default range: 2026-09-01 ~ 2026-09-18 (Current month MTD up to reference date)
  let activePeriod = 'month'; // 'day' | 'week' | 'month' | 'quarter' | 'half' | 'year' | 'custom'
  let startDate = '2026-09-01';
  let endDate = '2026-09-18';
  let referenceDate = '2026-09-18';

  function setPeriod(period) {
    activePeriod = period;
    const ref = new Date(referenceDate);

    if (period === 'day') {
      startDate = referenceDate;
      endDate = referenceDate;
    } else if (period === 'week') {
      const d = new Date(ref);
      d.setDate(d.getDate() - 6);
      startDate = d.toISOString().slice(0, 10);
      endDate = referenceDate;
    } else if (period === 'month') {
      startDate = `${referenceDate.slice(0, 7)}-01`;
      endDate = referenceDate;
    } else if (period === 'quarter') {
      startDate = '2026-07-01';
      endDate = referenceDate;
    } else if (period === 'half') {
      startDate = '2026-04-01';
      endDate = referenceDate;
    } else if (period === 'year') {
      startDate = '2025-10-01';
      endDate = referenceDate;
    }
    render();
  }

  function render() {
    const sales = store.get('sales');
    const expenses = store.get('expenses');
    const monthlyPlan = store.get('monthly_expense_plan');
    const recipes = store.get('recipes');
    const priceHistory = store.get('price_history');
    const materials = store.get('materials');

    // 1. Calculate P&L Statement for selected period
    const pl = calculatePLStatement({
      sales,
      expenses,
      monthlyPlan,
      recipes,
      priceHistory,
      materials,
      startDate,
      endDate
    });

    // 2. Calculate Monthly Projection
    const projection = calculateMonthlyProjection({
      referenceDate,
      sales,
      monthlyPlan,
      expenses,
      recipes,
      priceHistory,
      materials
    });

    // Prepare Cost Slices for Donut
    const costSlices = [
      { label: '원두·원재료', value: pl.rawMaterialCost, color: '#c2410c' },
      { label: '우유·유제품', value: pl.dairyCost, color: '#ea580c' },
      { label: '포장용기비', value: pl.packagingCost, color: '#f97316' },
      { label: '결제수수료', value: pl.paymentFee, color: '#3b82f6' },
      ...Object.entries(pl.expenseBreakdown).map(([k, v], idx) => {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];
        return { label: k, value: v, color: colors[idx % colors.length] };
      })
    ].filter((s) => s.value > 0);

    // Prepare 1~30 Cumulative Actual & Projected Sales
    const septSales = sales.filter((s) => s.date.startsWith('2026-09') && s.date <= '2026-09-18');
    const dailyTotals = {};
    for (let d = 1; d <= 18; d++) {
      const ds = `2026-09-${String(d).padStart(2, '0')}`;
      dailyTotals[ds] = 0;
    }
    for (const s of septSales) {
      const net = s.net_sales !== undefined ? s.net_sales : (s.unit_price * s.quantity - (s.discount_amount || 0));
      if (dailyTotals[s.date] !== undefined) {
        dailyTotals[s.date] += net;
      }
    }
    const actualCumSales = [];
    let runSum = 0;
    for (let d = 1; d <= 18; d++) {
      const ds = `2026-09-${String(d).padStart(2, '0')}`;
      runSum += dailyTotals[ds] || 0;
      actualCumSales.push(runSum);
    }

    const projectedCumSales = [];
    let projSum = runSum;
    const avgDaySales = projection.projectedRemainingSales / 12;
    for (let d = 19; d <= 30; d++) {
      projSum += avgDaySales;
      projectedCumSales.push(projSum);
    }

    const isProfit = pl.operatingProfit >= 0;
    const bepPct = pl.bepAttainment || 0;
    const bepBarWidth = Math.min(100, Math.max(0, bepPct));

    container.innerHTML = `
      <div class="view-panel">
        <!-- Top Controls Bar -->
        <div class="card" style="padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <!-- Period Selector Tabs -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 12px; font-weight: 700; color: var(--on-surface-variant); margin-right: 4px;">집계 기간:</span>
            <div class="tab-group" id="pl-period-tabs">
              <button class="tab-btn ${activePeriod === 'day' ? 'active' : ''}" data-period="day">일간(1일)</button>
              <button class="tab-btn ${activePeriod === 'week' ? 'active' : ''}" data-period="week">주간(7일)</button>
              <button class="tab-btn ${activePeriod === 'month' ? 'active' : ''}" data-period="month">당월(1~18일)</button>
              <button class="tab-btn ${activePeriod === 'quarter' ? 'active' : ''}" data-period="quarter">분기(3개월)</button>
              <button class="tab-btn ${activePeriod === 'half' ? 'active' : ''}" data-period="half">반기(6개월)</button>
              <button class="tab-btn ${activePeriod === 'year' ? 'active' : ''}" data-period="year">연간(1년)</button>
            </div>
          </div>

          <!-- Date Range Inputs -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <label for="pl-start-date" style="font-size: 11px; font-weight: 600; color: var(--outline);">시작일:</label>
              <input type="date" id="pl-start-date" class="form-input" style="padding: 2px 6px; font-size: 11px; height: 28px;" value="${startDate}" />
            </div>
            <span style="color: var(--outline); font-size: 12px;">~</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <label for="pl-end-date" style="font-size: 11px; font-weight: 600; color: var(--outline);">종료일:</label>
              <input type="date" id="pl-end-date" class="form-input" style="padding: 2px 6px; font-size: 11px; height: 28px;" value="${endDate}" />
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-apply-pl-dates">조회</button>
          </div>
        </div>

        <!-- Main Layout: 2 Columns (P&L Left, Projection & BEP Right) -->
        <div class="split-2-col-pl">
          
          <!-- LEFT COLUMN: Structured P&L Statement -->
          <div class="card" style="padding: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid var(--outline-variant); padding-bottom: 8px;">
              <div>
                <div style="font-size: 15px; font-weight: 700; color: var(--on-surface);">매장 손익계산서 (P&L Statement)</div>
                <div style="font-size: 11px; color: var(--outline);">
                  기간: ${startDate} ~ ${endDate} | 순매출액 대비 비율(%) 표기
                </div>
              </div>
              <div style="text-align: right;">
                <span class="badge ${isProfit ? 'badge-profit' : 'badge-danger'}" style="font-size: 12px; padding: 4px 8px;">
                  영업이익률: ${pl.operatingMargin.toFixed(1)}%
                </span>
              </div>
            </div>

            <!-- P&L Table -->
            <div class="table-container" style="box-shadow: none; border: 1px solid #e2e8f0;">
              <table class="data-table" style="font-size: 12px;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 6px 12px;">계정과목</th>
                    <th class="text-right" style="width: 140px; padding: 6px 12px;">금액 (원)</th>
                    <th class="text-right" style="width: 80px; padding: 6px 12px;">구성비</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- I. 순매출액 -->
                  <tr style="background-color: #f8fafc; font-weight: 700;">
                    <td colspan="3" style="padding: 6px 12px; color: var(--primary);">I. 순매출액 (Net Sales)</td>
                  </tr>
                  <tr>
                    <td style="padding-left: 24px;">음료류 순매출</td>
                    <td class="text-right tabular-nums">${Math.round(pl.beverageSales).toLocaleString()}원</td>
                    <td class="text-right tabular-nums text-muted">${pl.totalNetSales > 0 ? ((pl.beverageSales / pl.totalNetSales) * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td style="padding-left: 24px;">디저트류 순매출</td>
                    <td class="text-right tabular-nums">${Math.round(pl.dessertSales).toLocaleString()}원</td>
                    <td class="text-right tabular-nums text-muted">${pl.totalNetSales > 0 ? ((pl.dessertSales / pl.totalNetSales) * 100).toFixed(1) : 0}%</td>
                  </tr>
                  ${pl.totalDiscounts > 0 ? `
                  <tr style="color: var(--error);">
                    <td style="padding-left: 24px;">(차감) 프로모션 및 할인액</td>
                    <td class="text-right tabular-nums">-${Math.round(pl.totalDiscounts).toLocaleString()}원</td>
                    <td class="text-right tabular-nums text-muted">-${pl.totalNetSales > 0 ? ((pl.totalDiscounts / pl.totalNetSales) * 100).toFixed(1) : 0}%</td>
                  </tr>` : ''}
                  <tr style="font-weight: 700; background-color: #eff6ff; border-bottom: 2px solid #bfdbfe;">
                    <td style="padding: 6px 12px;">순매출액 합계</td>
                    <td class="text-right tabular-nums" style="color: var(--primary); font-size: 13px;">${Math.round(pl.totalNetSales).toLocaleString()}원</td>
                    <td class="text-right tabular-nums">100.0%</td>
                  </tr>

                  <!-- II. 매출원가 -->
                  <tr style="background-color: #f8fafc; font-weight: 700;">
                    <td colspan="3" style="padding: 6px 12px; color: #9a3412;">II. 매출원가 (COGS: 직접원가)</td>
                  </tr>
                  <tr>
                    <td style="padding-left: 24px;">원두·파우더·시럽 원재료비</td>
                    <td class="text-right tabular-nums">${Math.round(pl.rawMaterialCost).toLocaleString()}원</td>
                    <td class="text-right tabular-nums text-muted">${pl.totalNetSales > 0 ? ((pl.rawMaterialCost / pl.totalNetSales) * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td style="padding-left: 24px;">우유 및 유제품비</td>
                    <td class="text-right tabular-nums">${Math.round(pl.dairyCost).toLocaleString()}원</td>
                    <td class="text-right tabular-nums text-muted">${pl.totalNetSales > 0 ? ((pl.dairyCost / pl.totalNetSales) * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td style="padding-left: 24px;">포장재비 (컵/홀더/디저트용기)</td>
                    <td class="text-right tabular-nums">${Math.round(pl.packagingCost).toLocaleString()}원</td>
                    <td class="text-right tabular-nums text-muted">${pl.totalNetSales > 0 ? ((pl.packagingCost / pl.totalNetSales) * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr style="font-weight: 700; background-color: #fff7ed; border-bottom: 2px solid #fed7aa;">
                    <td style="padding: 6px 12px;">매출원가 합계</td>
                    <td class="text-right tabular-nums" style="color: #c2410c;">${Math.round(pl.totalCogs).toLocaleString()}원</td>
                    <td class="text-right tabular-nums">${pl.totalNetSales > 0 ? ((pl.totalCogs / pl.totalNetSales) * 100).toFixed(1) : 0}%</td>
                  </tr>

                  <!-- III. 매출총이익 -->
                  <tr style="font-weight: 700; background-color: #f0fdf4; border-bottom: 2px solid #bbf7d0;">
                    <td style="padding: 8px 12px; color: #166534; font-size: 13px;">III. 매출총이익 (Gross Profit)</td>
                    <td class="text-right tabular-nums" style="color: #166534; font-size: 13px;">${Math.round(pl.grossProfit).toLocaleString()}원</td>
                    <td class="text-right tabular-nums" style="color: #166534; font-weight: 700;">${pl.grossProfitMargin.toFixed(1)}%</td>
                  </tr>

                  <!-- IV. 판매관리비 -->
                  <tr style="background-color: #f8fafc; font-weight: 700;">
                    <td colspan="3" style="padding: 6px 12px; color: #475569;">IV. 판매관리비 (OPEX: 수수료 + 운영비)</td>
                  </tr>
                  <tr>
                    <td style="padding-left: 24px;">결제수수료 (카드/간편결제 1.5%)</td>
                    <td class="text-right tabular-nums">${Math.round(pl.paymentFee).toLocaleString()}원</td>
                    <td class="text-right tabular-nums text-muted">1.5%</td>
                  </tr>
                  ${Object.entries(pl.expenseBreakdown).map(([cat, amt]) => `
                    <tr>
                      <td style="padding-left: 24px;">${cat} ${activePeriod !== 'day' ? '(일할 배분)' : ''}</td>
                      <td class="text-right tabular-nums">${Math.round(amt).toLocaleString()}원</td>
                      <td class="text-right tabular-nums text-muted">${pl.totalNetSales > 0 ? ((amt / pl.totalNetSales) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  `).join('')}
                  <tr style="font-weight: 700; background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                    <td style="padding: 6px 12px;">판매관리비 합계</td>
                    <td class="text-right tabular-nums" style="color: #334155;">${Math.round(pl.totalOpex).toLocaleString()}원</td>
                    <td class="text-right tabular-nums">${pl.totalNetSales > 0 ? ((pl.totalOpex / pl.totalNetSales) * 100).toFixed(1) : 0}%</td>
                  </tr>

                  <!-- V. 영업이익 -->
                  <tr style="font-weight: 800; background-color: ${isProfit ? '#ecfdf5' : '#fef2f2'}; border-top: 2px solid ${isProfit ? '#059669' : '#dc2626'};">
                    <td style="padding: 10px 12px; font-size: 14px; color: ${isProfit ? '#065f46' : '#991b1b'};">
                      V. 영업이익 (Operating Profit)
                    </td>
                    <td class="text-right tabular-nums" style="padding: 10px 12px; font-size: 15px; color: ${isProfit ? '#065f46' : '#991b1b'};">
                      ${Math.round(pl.operatingProfit).toLocaleString()}원
                    </td>
                    <td class="text-right tabular-nums" style="padding: 10px 12px; font-size: 14px; color: ${isProfit ? '#065f46' : '#991b1b'};">
                      ${pl.operatingMargin.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- RIGHT COLUMN: Projection & BEP Cards -->
          <div style="display: flex; flex-direction: column; gap: 14px;">
            
            <!-- 1. Monthly Projection Card -->
            <div class="card" style="padding: 16px; border: 1.5px solid #3b82f6; background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="material-symbols-outlined" style="color: #2563eb; font-size: 22px;">trending_up</span>
                  <span style="font-size: 15px; font-weight: 700; color: #1e3a8a;">2026년 9월 마감 예상 손익</span>
                </div>
                <span class="badge badge-star" style="font-size: 11px;">최근 4주 요일패턴 분석</span>
              </div>

              <!-- Main KPI Big Boxes -->
              <div class="split-2-col-even" style="gap: 10px; margin-bottom: 14px;">
                <div style="background-color: #eff6ff; padding: 12px; border-radius: var(--radius-md); border: 1px solid #dbeafe;">
                  <div style="font-size: 11px; font-weight: 600; color: #1d4ed8; margin-bottom: 4px;">당월 최종 예상 매출</div>
                  <div style="font-size: 18px; font-weight: 800; color: #1e40af; line-height: 1.2;">
                    ${Math.round(projection.finalForecastSales).toLocaleString()}원
                  </div>
                  <div style="font-size: 11px; color: #2563eb; margin-top: 4px; font-weight: 600;">
                    전월 대비 ${projection.momSalesGrowth >= 0 ? '+' : ''}${projection.momSalesGrowth.toFixed(1)}%
                  </div>
                </div>

                <div style="background-color: #ecfdf5; padding: 12px; border-radius: var(--radius-md); border: 1px solid #a7f3d0;">
                  <div style="font-size: 11px; font-weight: 600; color: #047857; margin-bottom: 4px;">당월 최종 예상 순이익</div>
                  <div style="font-size: 18px; font-weight: 800; color: #065f46; line-height: 1.2;">
                    ${Math.round(projection.finalForecastOperatingProfit).toLocaleString()}원
                  </div>
                  <div style="font-size: 11px; color: #059669; margin-top: 4px; font-weight: 600;">
                    전월 대비 ${projection.momProfitGrowth >= 0 ? '+' : ''}${projection.momProfitGrowth.toFixed(1)}%
                  </div>
                </div>
              </div>

              <!-- Projection Calculation Details -->
              <div style="background-color: #ffffff; border-radius: var(--radius-md); padding: 12px; border: 1px solid #e2e8f0; font-size: 12px; margin-bottom: 12px;">
                <div style="font-weight: 700; color: var(--on-surface); margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                  <span>예측 산출 근거 (기준일: ${projection.referenceDate})</span>
                  <span style="font-weight: 500; font-size: 11px; color: var(--outline);">경과 ${projection.elapsedDays}일 / 잔여 ${projection.remainingDays}일</span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px; color: var(--on-surface-variant);">
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #f1f5f9; padding-bottom: 4px;">
                    <span>• 9월 1일~18일 누적 실적</span>
                    <span class="tabular-nums" style="font-weight: 600; color: var(--on-surface);">
                      매출 ${Math.round(projection.mtdNetSales).toLocaleString()}원 / 순익 ${Math.round(projection.mtdOperatingProfit).toLocaleString()}원
                    </span>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #f1f5f9; padding-bottom: 4px;">
                    <span>• 잔여 12일 프로젝션 예측</span>
                    <span class="tabular-nums" style="font-weight: 600; color: #2563eb;">
                      매출 +${Math.round(projection.projectedRemainingSales).toLocaleString()}원 / 순익 +${Math.round(projection.projectedRemainingProfit).toLocaleString()}원
                    </span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>• 최근 4주 일평균 매출 패턴</span>
                    <span class="tabular-nums" style="font-size: 11px; color: var(--outline);">
                      평일 ${Math.round(projection.sampleAvgWeekdaySales).toLocaleString()}원 / 주말 ${Math.round(projection.sampleAvgWeekendSales).toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>

              <!-- Visual Forecast Trajectory Chart -->
              <div style="background: #ffffff; border-radius: var(--radius-md); padding: 10px 12px; border: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-size: 12px; font-weight: 700; color: var(--on-surface);">9월 누적 매출 궤적 및 월말 예측선</span>
                  <span style="font-size: 10px; color: var(--outline);">실적(실선) vs 예측(점선)</span>
                </div>
                <div id="pl-forecast-chart-container"></div>
              </div>
            </div>

            <!-- 2. Cost Composition Donut Chart Card -->
            <div class="card" style="padding: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid var(--outline-variant); padding-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="material-symbols-outlined" style="color: #ea580c; font-size: 20px;">pie_chart</span>
                  <span style="font-size: 14px; font-weight: 700; color: var(--on-surface);">선택 기간 비용 구성비 (원가 + 판관비)</span>
                </div>
                <span class="badge badge-star">${activePeriod.toUpperCase()}</span>
              </div>
              <div id="pl-cost-donut-container"></div>
            </div>

            <!-- 3. BEP Break-even Point Analysis Card -->
            <div class="card" style="padding: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="material-symbols-outlined" style="color: #059669; font-size: 20px;">speed</span>
                  <span style="font-size: 14px; font-weight: 700; color: var(--on-surface);">손익분기점 (BEP) 달성률</span>
                </div>
                <span class="badge ${bepPct >= 100 ? 'badge-profit' : 'badge-danger'}" style="font-weight: 700; font-size: 12px;">
                  달성률 ${bepPct.toFixed(1)}%
                </span>
              </div>

              <!-- Progress Bar -->
              <div style="background-color: #f1f5f9; height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 8px; border: 1px solid #e2e8f0; position: relative;">
                <div style="background-color: ${bepPct >= 100 ? '#10b981' : '#f59e0b'}; width: ${bepBarWidth}%; height: 100%; transition: width 0.3s ease;"></div>
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--outline); margin-bottom: 10px;">
                <span>0%</span>
                <span style="font-weight: 700; color: var(--on-surface-variant);">BEP 기준점 (100%)</span>
                <span>200%+</span>
              </div>

              <!-- BEP Info Details -->
              <div style="background-color: #f8fafc; padding: 10px 12px; border-radius: var(--radius-md); font-size: 12px; display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--on-surface-variant);">손익분기 기준 매출액:</span>
                  <span class="tabular-nums" style="font-weight: 700; color: var(--on-surface);">${Math.round(pl.bepRevenue).toLocaleString()}원</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--on-surface-variant);">현재 누적 고정운영비:</span>
                  <span class="tabular-nums" style="color: #64748b;">${Math.round(pl.totalOperatingExpenses).toLocaleString()}원</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--on-surface-variant);">손익분기 초과 안전이익:</span>
                  <span class="tabular-nums" style="font-weight: 700; color: #059669;">
                    +${Math.round(Math.max(0, (pl.grossProfit - pl.paymentFee) - pl.totalOperatingExpenses)).toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    // Render Forecast Trajectory Band Chart
    const forecastContainer = container.querySelector('#pl-forecast-chart-container');
    if (forecastContainer) {
      createForecastBandChart({
        container: forecastContainer,
        currentDay: 18,
        totalDays: 30,
        actualCumSales,
        projectedCumSales,
        bepAmount: pl.bepRevenue || 4385714,
        width: 500,
        height: 160
      });
    }

    // Render Cost Composition Donut Chart
    const donutContainer = container.querySelector('#pl-cost-donut-container');
    if (donutContainer) {
      const totalCost = costSlices.reduce((sum, s) => sum + s.value, 0);
      createDonutChart({
        container: donutContainer,
        slices: costSlices,
        centerLabel: '총 비용 합계',
        centerValue: `${(totalCost / 10000).toFixed(1)}만`,
        size: 150
      });
    }

    // Attach Event Listeners
    // Period Tab Click
    container.querySelectorAll('#pl-period-tabs .tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const period = btn.getAttribute('data-period');
        setPeriod(period);
      });
    });

    // Custom Date Range Apply Button
    const btnApply = container.querySelector('#btn-apply-pl-dates');
    if (btnApply) {
      btnApply.addEventListener('click', () => {
        const startInput = container.querySelector('#pl-start-date');
        const endInput = container.querySelector('#pl-end-date');
        if (startInput && endInput) {
          activePeriod = 'custom';
          startDate = startInput.value;
          endDate = endInput.value;
          render();
        }
      });
    }
  }

  render();
}

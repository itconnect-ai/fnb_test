// Lightweight Pure SVG Interactive Charting Engine (0 KB External Dependencies)

/**
 * 1. Dual Area & Line Trend Chart (e.g. 14-day Sales & Contribution Margin)
 */
export function createDualAreaTrendChart({
  container,
  data = [], // [{ date: '09-05', fullDate: '2026-09-05', sales: 160000, margin: 120000 }]
  width = 720,
  height = 220
}) {
  if (!container || data.length === 0) return;

  const padLeft = 65;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxSales = Math.max(...data.map((d) => d.sales), 100000);
  const yMax = Math.ceil((maxSales * 1.15) / 50000) * 50000;

  const getX = (idx) => padLeft + (idx / (data.length - 1 || 1)) * chartW;
  const getY = (val) => padTop + chartH - (val / yMax) * chartH;

  // Build SVG paths
  const salesPoints = data.map((d, i) => `${getX(i)},${getY(d.sales)}`);
  const marginPoints = data.map((d, i) => `${getX(i)},${getY(d.margin)}`);

  const areaPathD = `M ${salesPoints[0]} L ${salesPoints.join(' L ')} L ${getX(data.length - 1)},${padTop + chartH} L ${getX(0)},${padTop + chartH} Z`;
  const salesLineD = `M ${salesPoints.join(' L ')}`;
  const marginLineD = `M ${marginPoints.join(' L ')}`;

  // Y-axis grid lines (4 lines)
  let yGridHtml = '';
  for (let i = 0; i <= 4; i++) {
    const val = (yMax / 4) * i;
    const yPos = getY(val);
    yGridHtml += `
      <line x1="${padLeft}" y1="${yPos}" x2="${width - padRight}" y2="${yPos}" stroke="#e2e8f0" stroke-dasharray="3 3" />
      <text x="${padLeft - 8}" y="${yPos + 3}" fill="#94a3b8" font-size="10" font-weight="600" text-anchor="end" font-family="'Plus Jakarta Sans', sans-serif">
        ${(val / 10000).toFixed(0)}만
      </text>
    `;
  }

  // X-axis dates
  let xLabelsHtml = '';
  data.forEach((d, i) => {
    // Show alternate or every 2 labels if too many
    if (i % 2 === 0 || i === data.length - 1) {
      xLabelsHtml += `
        <text x="${getX(i)}" y="${height - 10}" fill="#64748b" font-size="10" font-weight="600" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif">
          ${d.date}
        </text>
      `;
    }
  });

  // Interactive Hover Hit Zones
  let hitZonesHtml = '';
  data.forEach((d, i) => {
    const cx = getX(i);
    const stepW = chartW / (data.length - 1 || 1);
    hitZonesHtml += `
      <g class="chart-point-group" data-idx="${i}" style="cursor: pointer;">
        <rect x="${cx - stepW / 2}" y="${padTop}" width="${stepW}" height="${chartH}" fill="transparent" />
        <circle cx="${cx}" cy="${getY(d.sales)}" r="4" fill="#2563eb" stroke="#ffffff" stroke-width="2" class="point-sales" style="transition: transform 0.15s; pointer-events: none;" />
        <circle cx="${cx}" cy="${getY(d.margin)}" r="4" fill="#059669" stroke="#ffffff" stroke-width="2" class="point-margin" style="transition: transform 0.15s; pointer-events: none;" />
      </g>
    `;
  });

  container.innerHTML = `
    <div class="chart-wrapper">
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block; overflow: visible;">
        <defs>
          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2563eb" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#2563eb" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Grid Lines -->
        ${yGridHtml}

        <!-- Sales Area & Line -->
        <path d="${areaPathD}" fill="url(#salesGrad)" />
        <path d="${salesLineD}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Margin Line -->
        <path d="${marginLineD}" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

        <!-- X Labels -->
        ${xLabelsHtml}

        <!-- Guide Line (Hover) -->
        <line id="trend-guide-line" x1="0" y1="${padTop}" x2="0" y2="${padTop + chartH}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="2 2" style="display: none;" />

        <!-- Hit Zones -->
        ${hitZonesHtml}
      </svg>
      <div class="chart-tooltip" id="trend-chart-tooltip"></div>
    </div>
  `;

  // Bind tooltip interactions
  const tooltip = container.querySelector('#trend-chart-tooltip');
  const guideLine = container.querySelector('#trend-guide-line');
  const groups = container.querySelectorAll('.chart-point-group');

  groups.forEach((g) => {
    g.addEventListener('mouseenter', () => {
      const idx = parseInt(g.getAttribute('data-idx'), 10);
      const item = data[idx];
      const cx = getX(idx);
      const marginRate = item.sales > 0 ? ((item.margin / item.sales) * 100).toFixed(1) : 0;

      guideLine.setAttribute('x1', cx);
      guideLine.setAttribute('x2', cx);
      guideLine.style.display = 'block';

      const sDot = g.querySelector('.point-sales');
      const mDot = g.querySelector('.point-margin');
      if (sDot) sDot.setAttribute('r', '6');
      if (mDot) mDot.setAttribute('r', '6');

      tooltip.innerHTML = `
        <div style="font-weight: 700; color: #93c5fd; margin-bottom: 2px;">${item.fullDate || item.date}</div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="color: #cbd5e1;">순매출:</span>
          <span style="font-weight: 700;">${Math.round(item.sales).toLocaleString()}원</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="color: #6ee7b7;">공헌이익:</span>
          <span style="font-weight: 700; color: #34d399;">${Math.round(item.margin).toLocaleString()}원 (${marginRate}%)</span>
        </div>
      `;

      const pctX = (cx / width) * 100;
      tooltip.style.display = 'block';
      tooltip.style.left = `${pctX}%`;
      tooltip.style.top = '10px';
      tooltip.style.transform = pctX > 70 ? 'translateX(-100%)' : 'translateX(10px)';
    });

    g.addEventListener('mouseleave', () => {
      guideLine.style.display = 'none';
      tooltip.style.display = 'none';
      const sDot = g.querySelector('.point-sales');
      const mDot = g.querySelector('.point-margin');
      if (sDot) sDot.setAttribute('r', '4');
      if (mDot) mDot.setAttribute('r', '4');
    });
  });
}

/**
 * 2. Donut Chart (e.g. Sales by Channel or Cost Breakdown)
 */
export function createDonutChart({
  container,
  slices = [], // [{ label: '매장', value: 120000, color: '#2563eb' }]
  centerLabel = '총 매출',
  centerValue = '16.4만원',
  size = 180
}) {
  if (!container || slices.length === 0) return;

  const total = slices.reduce((sum, s) => sum + (s.value || 0), 0);
  const radius = 68;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;
  let pathsHtml = '';

  slices.forEach((slice, i) => {
    const pct = total > 0 ? slice.value / total : 0;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -accumulated * circumference;
    accumulated += pct;

    pathsHtml += `
      <circle
        cx="${size / 2}" cy="${size / 2}" r="${radius}"
        fill="transparent"
        stroke="${slice.color}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${strokeDasharray}"
        stroke-dashoffset="${strokeDashoffset}"
        transform="rotate(-90 ${size / 2} ${size / 2})"
        style="transition: stroke-width 0.2s, opacity 0.2s; cursor: pointer;"
        class="donut-segment"
        data-idx="${i}"
      />
    `;
  });

  let legendHtml = slices
    .map((s) => {
      const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : 0;
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; padding: 2px 0;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${s.color};"></span>
            <span style="color: var(--on-surface); font-weight: 500;">${s.label}</span>
          </div>
          <div style="font-weight: 700; color: var(--on-surface); font-family: 'Plus Jakarta Sans', sans-serif;">
            ${Math.round(s.value).toLocaleString()}원 <span style="font-size: 10px; color: var(--outline); font-weight: 500;">(${pct}%)</span>
          </div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
      <div style="position: relative; width: ${size}px; height: ${size}px; flex-shrink: 0;">
        <svg viewBox="0 0 ${size} ${size}" style="width: 100%; height: 100%; overflow: visible;">
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="transparent" stroke="#f1f5f9" stroke-width="${strokeWidth}" />
          ${pathsHtml}
        </svg>
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; text-align: center;">
          <span style="font-size: 11px; font-weight: 600; color: var(--on-surface-variant);">${centerLabel}</span>
          <span style="font-size: 14px; font-weight: 800; color: var(--on-surface); font-family: 'Plus Jakarta Sans', sans-serif; letter-spacing: -0.02em;">${centerValue}</span>
        </div>
      </div>
      <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px;">
        ${legendHtml}
      </div>
    </div>
  `;
}

/**
 * 3. BCG 4-Quadrant Menu Portfolio Scatter Bubble Chart
 */
export function createScatterMatrixChart({
  container,
  points = [], // [{ menuId, menuName, quantity, marginRate, contribution, badge, isNegative }]
  onPointClick
}) {
  if (!container || points.length === 0) return;

  const width = 640;
  const height = 280;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 35;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxQty = Math.max(...points.map((p) => p.quantity), 20);
  const xMax = Math.ceil(maxQty * 1.1);
  const yMax = 100; // Margin rate %

  const xThreshold = xMax * 0.45;
  const yThreshold = 65; // Margin rate threshold 65%

  const getX = (qty) => padLeft + (qty / xMax) * chartW;
  const getY = (mRate) => padTop + chartH - (Math.max(0, Math.min(100, mRate)) / yMax) * chartH;

  const xSplit = getX(xThreshold);
  const ySplit = getY(yThreshold);

  // Quadrant Background labels
  const quadrantLabelsHtml = `
    <!-- Top-Right: Stars (효자) -->
    <rect x="${xSplit}" y="${padTop}" width="${width - padRight - xSplit}" height="${ySplit - padTop}" fill="#ecfdf5" opacity="0.35" />
    <text x="${width - padRight - 10}" y="${padTop + 18}" fill="#059669" font-size="11" font-weight="700" text-anchor="end">⭐ 효자 (Stars)</text>

    <!-- Top-Left: Puzzles (마진형) -->
    <rect x="${padLeft}" y="${padTop}" width="${xSplit - padLeft}" height="${ySplit - padTop}" fill="#eff6ff" opacity="0.35" />
    <text x="${padLeft + 10}" y="${padTop + 18}" fill="#2563eb" font-size="11" font-weight="700">🧩 마진형 (Puzzles)</text>

    <!-- Bottom-Left: Dogs (재검토) -->
    <rect x="${padLeft}" y="${ySplit}" width="${xSplit - padLeft}" height="${padTop + chartH - ySplit}" fill="#fff1f2" opacity="0.35" />
    <text x="${padLeft + 10}" y="${padTop + chartH - 10}" fill="#e11d48" font-size="11" font-weight="700">⚠️ 재검토 (Dogs)</text>

    <!-- Bottom-Right: Plowhorses (볼륨형) -->
    <rect x="${xSplit}" y="${ySplit}" width="${width - padRight - xSplit}" height="${padTop + chartH - ySplit}" fill="#fffbeb" opacity="0.35" />
    <text x="${width - padRight - 10}" y="${padTop + chartH - 10}" fill="#d97706" font-size="11" font-weight="700" text-anchor="end">🐎 볼륨형 (Plowhorses)</text>

    <!-- Threshold Grid Lines -->
    <line x1="${xSplit}" y1="${padTop}" x2="${xSplit}" y2="${padTop + chartH}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4 4" />
    <line x1="${padLeft}" y1="${ySplit}" x2="${width - padRight}" y2="${ySplit}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4 4" />
  `;

  // Bubbles
  const maxContrib = Math.max(...points.map((p) => p.contribution), 10000);
  let bubblesHtml = '';

  points.forEach((p) => {
    const cx = getX(p.quantity);
    const cy = getY(p.marginRate);
    const radiusRatio = Math.max(0.1, (p.contribution || 0) / maxContrib);
    const r = 5 + radiusRatio * 16; // 5px ~ 21px

    let color = '#2563eb';
    if (p.marginRate >= yThreshold && p.quantity >= xThreshold) color = '#059669'; // Stars
    else if (p.marginRate >= yThreshold) color = '#3b82f6'; // Puzzles
    else if (p.quantity >= xThreshold) color = '#d97706'; // Volume
    else color = '#e11d48'; // Dogs

    bubblesHtml += `
      <g class="scatter-bubble-group" data-id="${p.menuId}" style="cursor: pointer;">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" fill-opacity="0.75" stroke="#ffffff" stroke-width="1.5" class="bubble-circle" style="transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);" />
        <text x="${cx}" y="${cy + 3}" fill="#ffffff" font-size="9" font-weight="700" text-anchor="middle" pointer-events="none" style="user-select: none;">
          ${p.menuName.slice(0, 3)}
        </text>
      </g>
    `;
  });

  container.innerHTML = `
    <div class="chart-wrapper">
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block; overflow: visible;">
        ${quadrantLabelsHtml}

        <!-- Axes -->
        <line x1="${padLeft}" y1="${padTop + chartH}" x2="${width - padRight}" y2="${padTop + chartH}" stroke="#94a3b8" stroke-width="1.5" />
        <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + chartH}" stroke="#94a3b8" stroke-width="1.5" />

        <!-- Axis Labels -->
        <text x="${width - padRight}" y="${padTop + chartH + 26}" fill="#64748b" font-size="11" font-weight="700" text-anchor="end">
          판매량 (수량) →
        </text>
        <text x="${padLeft}" y="${padTop - 12}" fill="#64748b" font-size="11" font-weight="700">
          ↑ 마진율 (%)
        </text>

        <!-- Y Axis Ticks -->
        <text x="${padLeft - 6}" y="${getY(100) + 4}" fill="#94a3b8" font-size="9" font-weight="600" text-anchor="end">100%</text>
        <text x="${padLeft - 6}" y="${getY(50) + 4}" fill="#94a3b8" font-size="9" font-weight="600" text-anchor="end">50%</text>
        <text x="${padLeft - 6}" y="${getY(0) + 4}" fill="#94a3b8" font-size="9" font-weight="600" text-anchor="end">0%</text>

        <!-- Bubbles -->
        ${bubblesHtml}
      </svg>
      <div class="chart-tooltip" id="scatter-chart-tooltip"></div>
    </div>
  `;

  // Bind interactions
  const tooltip = container.querySelector('#scatter-chart-tooltip');
  const bubbleGroups = container.querySelectorAll('.scatter-bubble-group');

  bubbleGroups.forEach((g) => {
    const id = g.getAttribute('data-id');
    const p = points.find((item) => item.menuId === id);
    if (!p) return;

    g.addEventListener('mouseenter', (e) => {
      const circle = g.querySelector('.bubble-circle');
      if (circle) circle.setAttribute('transform', `scale(1.2)`);
      circle.style.transformOrigin = `${getX(p.quantity)}px ${getY(p.marginRate)}px`;

      tooltip.innerHTML = `
        <div style="font-weight: 700; color: #93c5fd; margin-bottom: 2px;">${p.menuName} (${p.category})</div>
        <div style="display: flex; gap: 8px;"><span>판매량:</span> <b>${p.quantity}잔</b></div>
        <div style="display: flex; gap: 8px;"><span>실질 마진율:</span> <b>${p.marginRate.toFixed(1)}%</b></div>
        <div style="display: flex; gap: 8px;"><span>총 공헌이익:</span> <b style="color: #34d399;">${Math.round(p.contribution).toLocaleString()}원</b></div>
        <div style="font-size: 10px; color: #cbd5e1; margin-top: 4px;">클릭하여 테이블에서 상세 확인 →</div>
      `;

      const pctX = (getX(p.quantity) / width) * 100;
      tooltip.style.display = 'block';
      tooltip.style.left = `${pctX}%`;
      tooltip.style.top = `${getY(p.marginRate) - 75}px`;
      tooltip.style.transform = pctX > 70 ? 'translateX(-100%)' : 'translateX(10px)';
    });

    g.addEventListener('mouseleave', () => {
      const circle = g.querySelector('.bubble-circle');
      if (circle) circle.setAttribute('transform', '');
      tooltip.style.display = 'none';
    });

    g.addEventListener('click', () => {
      if (onPointClick) onPointClick(p.menuId);
    });
  });
}

/**
 * 4. Horizontal Bar Chart (e.g. Top 5 Contribution Margin Menus)
 */
export function createHorizontalBarChart({ container, items = [], totalContrib = 0 }) {
  if (!container || items.length === 0) return;

  const maxVal = Math.max(...items.map((i) => i.contribution), 1);

  const rowsHtml = items
    .map((item, idx) => {
      const pctOfMax = (item.contribution / maxVal) * 100;
      const share = totalContrib > 0 ? ((item.contribution / totalContrib) * 100).toFixed(1) : 0;
      const badgeColor = idx === 0 ? '#2563eb' : idx === 1 ? '#3b82f6' : idx === 2 ? '#60a5fa' : '#94a3b8';

      return `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 18px; height: 18px; border-radius: 4px; background: ${badgeColor}; color: #ffffff; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;">
                ${idx + 1}
              </span>
              <span style="font-weight: 600; color: var(--on-surface);">${item.name}</span>
            </div>
            <div style="font-weight: 700; color: var(--on-surface); font-family: 'Plus Jakarta Sans', sans-serif;">
              ${Math.round(item.contribution).toLocaleString()}원
              <span style="font-size: 11px; color: var(--outline); font-weight: 500;">(${share}%)</span>
            </div>
          </div>
          <div style="width: 100%; height: 7px; background-color: #f1f5f9; border-radius: 4px; overflow: hidden;">
            <div style="width: ${pctOfMax}%; height: 100%; background: linear-gradient(90deg, #2563eb 0%, #3b82f6 100%); border-radius: 4px; transition: width 0.4s ease;"></div>
          </div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${rowsHtml}
    </div>
  `;
}

/**
 * 5. Monthly Projection Trajectory Band Chart (e.g. 1st~30th Actual vs Projected with BEP Line)
 */
export function createForecastBandChart({
  container,
  currentDay = 18,
  totalDays = 30,
  actualCumSales = [], // cumulative sales up to currentDay
  projectedCumSales = [], // cumulative sales from currentDay to totalDays
  bepAmount = 4385714,
  width = 540,
  height = 180
}) {
  if (!container) return;

  const padLeft = 60;
  const padRight = 25;
  const padTop = 20;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const lastProjected = projectedCumSales[projectedCumSales.length - 1] || bepAmount * 1.5;
  const yMax = Math.ceil(Math.max(lastProjected, bepAmount * 1.2) / 2000000) * 2000000;

  const getX = (day) => padLeft + ((day - 1) / (totalDays - 1)) * chartW;
  const getY = (val) => padTop + chartH - (val / yMax) * chartH;

  // Actual points (1 ~ currentDay)
  const actualPoints = actualCumSales.map((val, i) => `${getX(i + 1)},${getY(val)}`);
  const actualLineD = `M ${actualPoints.join(' L ')}`;

  // Projected points (currentDay ~ totalDays)
  const projPoints = projectedCumSales.map((val, i) => `${getX(currentDay + i)},${getY(val)}`);
  const projLineD = `M ${actualPoints[actualPoints.length - 1]} L ${projPoints.join(' L ')}`;

  // BEP Line Y
  const bepY = getY(bepAmount);

  container.innerHTML = `
    <div class="chart-wrapper">
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block; overflow: visible;">
        <!-- BEP Line -->
        <line x1="${padLeft}" y1="${bepY}" x2="${width - padRight}" y2="${bepY}" stroke="#e11d48" stroke-width="1.5" stroke-dasharray="4 4" />
        <text x="${width - padRight}" y="${bepY - 5}" fill="#e11d48" font-size="10" font-weight="700" text-anchor="end">
          손익분기점(BEP): ${(bepAmount / 10000).toFixed(0)}만원
        </text>

        <!-- Current Day Separator -->
        <line x1="${getX(currentDay)}" y1="${padTop}" x2="${getX(currentDay)}" y2="${padTop + chartH}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2 2" />
        <text x="${getX(currentDay)}" y="${padTop - 6}" fill="#64748b" font-size="10" font-weight="700" text-anchor="middle">
          오늘 (${currentDay}일)
        </text>

        <!-- Actual Line (Blue Solid) -->
        <path d="${actualLineD}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Projected Line (Blue Dashed) -->
        <path d="${projLineD}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="4 4" stroke-linecap="round" stroke-linejoin="round" />

        <!-- End Projected Dot & Label -->
        <circle cx="${getX(totalDays)}" cy="${getY(lastProjected)}" r="5" fill="#2563eb" stroke="#ffffff" stroke-width="2" />
        <text x="${getX(totalDays)}" y="${getY(lastProjected) - 10}" fill="#1e3a8a" font-size="11" font-weight="800" text-anchor="end">
          예상 ${(lastProjected / 10000).toFixed(0)}만원
        </text>

        <!-- X Axis -->
        <line x1="${padLeft}" y1="${padTop + chartH}" x2="${width - padRight}" y2="${padTop + chartH}" stroke="#cbd5e1" stroke-width="1" />
        <text x="${getX(1)}" y="${height - 8}" fill="#94a3b8" font-size="10" font-weight="600">1일</text>
        <text x="${getX(currentDay)}" y="${height - 8}" fill="#2563eb" font-size="10" font-weight="700" text-anchor="middle">${currentDay}일</text>
        <text x="${getX(totalDays)}" y="${height - 8}" fill="#94a3b8" font-size="10" font-weight="600" text-anchor="end">${totalDays}일(월말)</text>

        <!-- Y Axis Ticks -->
        <text x="${padLeft - 6}" y="${getY(yMax) + 4}" fill="#94a3b8" font-size="9" font-weight="600" text-anchor="end">${(yMax / 10000).toFixed(0)}만</text>
        <text x="${padLeft - 6}" y="${getY(yMax / 2) + 4}" fill="#94a3b8" font-size="9" font-weight="600" text-anchor="end">${(yMax / 20000).toFixed(0)}만</text>
        <text x="${padLeft - 6}" y="${getY(0) + 4}" fill="#94a3b8" font-size="9" font-weight="600" text-anchor="end">0</text>
      </svg>
    </div>
  `;
}

/**
 * 6. Stock Level Bullet Gauges for 11 Key Materials
 */
export function createStockBulletGauges({ container, items = [] }) {
  if (!container || items.length === 0) return;

  const rowsHtml = items
    .map((item) => {
      // item: { name, unit, currentStock, safetyStock, rop, status }
      const maxVal = Math.max(item.rop * 2, item.currentStock * 1.2, 1);
      const curPct = Math.min(100, Math.max(0, (item.currentStock / maxVal) * 100));
      const safetyPct = Math.min(100, (item.safetyStock / maxVal) * 100);
      const ropPct = Math.min(100, (item.rop / maxVal) * 100);

      const isDanger = item.currentStock <= item.safetyStock;
      const isWarning = !isDanger && item.currentStock <= item.rop;
      const fillColor = isDanger ? '#e11d48' : isWarning ? '#d97706' : '#059669';
      const badgeText = isDanger ? '위험' : isWarning ? '발주점' : '안전';
      const badgeBg = isDanger ? '#ffe4e6' : isWarning ? '#fffbeb' : '#ecfdf5';
      const badgeColor = isDanger ? '#9f1239' : isWarning ? '#92400e' : '#065f46';

      return `
        <div class="stock-bullet-row">
          <div class="stock-bullet-label" title="${item.name}">${item.name}</div>
          
          <div class="stock-bullet-track" style="position: relative;">
            <!-- Safety stock marker -->
            <div style="position: absolute; left: ${safetyPct}%; top: 0; bottom: 0; width: 2px; background-color: #fca5a5; z-index: 2;" title="안전재고선"></div>
            <!-- ROP marker -->
            <div style="position: absolute; left: ${ropPct}%; top: 0; bottom: 0; width: 2px; background-color: #fde68a; z-index: 2;" title="발주점선"></div>
            
            <!-- Current Stock Fill -->
            <div class="stock-bullet-fill" style="width: ${curPct}%; background-color: ${fillColor}; z-index: 1;"></div>
          </div>

          <div class="stock-bullet-val">
            <span style="color: ${fillColor};">${item.currentStock.toFixed(1)}</span>
            <span style="font-size: 10px; color: var(--outline); font-weight: 500;">${item.unit}</span>
          </div>

          <span style="display: inline-block; width: 44px; text-align: center; font-size: 10px; font-weight: 700; padding: 1px 4px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor};">
            ${badgeText}
          </span>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `
    <div class="stock-bullet-container">
      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 14px; font-size: 10px; color: var(--outline); margin-bottom: 4px;">
        <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 2px; background: #e11d48;"></span> 안전재고 이하 (위험)</span>
        <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 2px; background: #d97706;"></span> 발주점(ROP) 이하 (주의)</span>
        <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 2px; background: #059669;"></span> 안전 버퍼 확보</span>
      </div>
      ${rowsHtml}
    </div>
  `;
}

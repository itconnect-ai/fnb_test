// FRD Business Calculation Engine for Prep Cafe

/**
 * Find active material price per unit (g, ml, ea) on a given date.
 */
export function getMaterialUnitPriceAtDate(materialId, dateStr, priceHistory = [], materials = []) {
  const history = priceHistory
    .filter((p) => p.material_id === materialId && (!p.effective_date || p.effective_date <= dateStr))
    .sort((a, b) => (b.effective_date || '').localeCompare(a.effective_date || ''));

  if (history.length > 0) {
    const latest = history[0];
    return latest.pack_price / latest.pack_quantity;
  }

  const mat = materials.find((m) => m.material_id === materialId);
  if (mat && mat.pack_quantity > 0) {
    return mat.base_pack_price / mat.pack_quantity;
  }

  return 0;
}

/**
 * Calculate recipe food cost and packaging cost for 1 item.
 */
export function calculateRecipeUnitCost(recipeVersion, menuId, channel, dateStr, recipes = [], priceHistory = [], materials = []) {
  const menuRecipes = recipes.filter(
    (r) => r.menu_id === menuId && (!r.recipe_version || r.recipe_version === recipeVersion)
  );

  let foodCost = 0;
  let packagingCost = 0;

  for (const r of menuRecipes) {
    const unitPrice = getMaterialUnitPriceAtDate(r.material_id, dateStr, priceHistory, materials);
    const itemCost = unitPrice * r.quantity;
    const isPackaging = r.channel_only === '포장' || r.channel === '포장';

    if (isPackaging) {
      if (channel === '포장') {
        packagingCost += itemCost;
      }
    } else {
      foodCost += itemCost;
    }
  }

  return { foodCost, packagingCost };
}

/**
 * Calculate real contribution margin for 1 item.
 * Formula (FRD):
 * actualPrice = unitPrice - discountPerItem
 * paymentFee = actualPrice * 0.015
 * netMargin = actualPrice - foodCost - packagingCost - paymentFee
 * marginRate = (netMargin / actualPrice) * 100
 */
export function calculateItemMargin({
  unitPrice,
  discountPerItem = 0,
  foodCost,
  packagingCost = 0,
  feeRate = 0.015
}) {
  const actualPrice = unitPrice - discountPerItem;
  const paymentFee = actualPrice > 0 ? actualPrice * feeRate : 0;
  const netMargin = actualPrice - foodCost - packagingCost - paymentFee;
  const marginRate = actualPrice > 0 ? (netMargin / actualPrice) * 100 : 0;

  return {
    actualPrice,
    paymentFee,
    foodCost,
    packagingCost,
    netMargin,
    marginRate,
    isNegativeMargin: netMargin < 0
  };
}

/**
 * Aggregate menu profitability from a list of sales records.
 */
export function aggregateMenuProfitability(salesList, {
  menus = [],
  recipes = [],
  priceHistory = [],
  materials = [],
  channelFilter = 'all', // 'all' | '매장' | '포장'
  startDate = null,
  endDate = null,
  sortBy = 'contribution' // 'contribution' | 'marginRate' | 'quantity'
} = {}) {
  // Filter sales
  let filteredSales = salesList;

  if (startDate) {
    filteredSales = filteredSales.filter((s) => s.date >= startDate);
  }
  if (endDate) {
    filteredSales = filteredSales.filter((s) => s.date <= endDate);
  }
  if (channelFilter && channelFilter !== 'all') {
    filteredSales = filteredSales.filter((s) => s.channel === channelFilter);
  }

  // Aggregate by menu_id
  const map = new Map();

  // Initialize all menus
  for (const m of menus) {
    map.set(m.menu_id, {
      menuId: m.menu_id,
      menuName: m.name,
      category: m.category,
      basePrice: m.price,
      recipeVersion: m.recipe_version,
      quantity: 0,
      totalNetSales: 0,
      totalDiscounts: 0,
      totalFoodCost: 0,
      totalPackagingCost: 0,
      totalPaymentFee: 0,
      totalContribution: 0,
      unitNetMargin: 0,
      marginRate: 0,
      isNegativeMargin: false,
      hasSales: false
    });
  }

  // Accumulate sales
  for (const s of filteredSales) {
    let stat = map.get(s.menu_id);
    if (!stat) {
      stat = {
        menuId: s.menu_id,
        menuName: s.menu_id,
        category: '기타',
        basePrice: s.unit_price,
        recipeVersion: s.recipe_version,
        quantity: 0,
        totalNetSales: 0,
        totalDiscounts: 0,
        totalFoodCost: 0,
        totalPackagingCost: 0,
        totalPaymentFee: 0,
        totalContribution: 0,
        unitNetMargin: 0,
        marginRate: 0,
        isNegativeMargin: false,
        hasSales: false
      };
      map.set(s.menu_id, stat);
    }

    stat.hasSales = true;
    const qty = s.quantity;
    const unitPrice = s.unit_price;
    const discountTotal = s.discount_amount || 0;
    const discountPerItem = qty > 0 ? discountTotal / qty : 0;

    // Use recipe cost at sale date
    const { foodCost, packagingCost } = calculateRecipeUnitCost(
      s.recipe_version || stat.recipeVersion,
      s.menu_id,
      s.channel,
      s.date,
      recipes,
      priceHistory,
      materials
    );

    const marginData = calculateItemMargin({
      unitPrice,
      discountPerItem,
      foodCost,
      packagingCost,
      feeRate: 0.015
    });

    const netSales = s.net_sales !== undefined ? s.net_sales : (unitPrice * qty - discountTotal);
    const fee = marginData.paymentFee * qty;
    const foodTotal = foodCost * qty;
    const packTotal = packagingCost * qty;
    const contribution = netSales - foodTotal - packTotal - fee;

    stat.quantity += qty;
    stat.totalNetSales += netSales;
    stat.totalDiscounts += discountTotal;
    stat.totalFoodCost += foodTotal;
    stat.totalPackagingCost += packTotal;
    stat.totalPaymentFee += fee;
    stat.totalContribution += contribution;
  }

  const result = Array.from(map.values()).map((stat) => {
    if (stat.quantity > 0) {
      stat.unitNetMargin = stat.totalContribution / stat.quantity;
      stat.marginRate = stat.totalNetSales > 0 ? (stat.totalContribution / stat.totalNetSales) * 100 : 0;
    } else {
      // Calculate theoretical margin using current date
      const today = new Date().toISOString().slice(0, 10);
      const ch = channelFilter === 'all' ? '매장' : channelFilter;
      const { foodCost, packagingCost } = calculateRecipeUnitCost(
        stat.recipeVersion,
        stat.menuId,
        ch,
        today,
        recipes,
        priceHistory,
        materials
      );
      const m = calculateItemMargin({
        unitPrice: stat.basePrice,
        discountPerItem: 0,
        foodCost,
        packagingCost
      });
      stat.unitNetMargin = m.netMargin;
      stat.marginRate = m.marginRate;
      stat.totalFoodCost = foodCost;
      stat.totalPackagingCost = packagingCost;
    }
    stat.isNegativeMargin = stat.unitNetMargin < 0;
    return stat;
  });

  // Calculate 4-quadrant diagnostic badges using Quantity & Margin Rate (%)
  const activeMenus = result.filter((r) => r.quantity > 0);
  if (activeMenus.length > 0) {
    const sortedQty = [...activeMenus].map((m) => m.quantity).sort((a, b) => a - b);
    const sortedRate = [...activeMenus].map((m) => m.marginRate).sort((a, b) => a - b);
    const midIdx = Math.floor(sortedQty.length / 2);
    const medianQty = sortedQty[midIdx] || 0;
    const medianRate = sortedRate[midIdx] || 0;

    for (const item of result) {
      if (item.quantity === 0) {
        item.badge = 'unopened'; // 미판매
        item.badgeName = '판매없음';
      } else if (item.quantity >= medianQty && item.marginRate >= medianRate) {
        item.badge = 'star'; // ⭐ 효자
        item.badgeName = '⭐ 효자(스타)';
      } else if (item.quantity >= medianQty && item.marginRate < medianRate) {
        item.badge = 'volume'; // 📈 인기
        item.badgeName = '📈 인기(볼륨)';
      } else if (item.quantity < medianQty && item.marginRate >= medianRate) {
        item.badge = 'profit'; // 💎 고수익
        item.badgeName = '💎 고수익(틈새)';
      } else {
        item.badge = 'review'; // ⚠️ 재검토
        item.badgeName = '⚠️ 재검토';
      }
    }
  } else {
    result.forEach((r) => {
      r.badge = 'unopened';
      r.badgeName = '판매없음';
    });
  }

  // Sort
  if (sortBy === 'marginRate') {
    result.sort((a, b) => b.marginRate - a.marginRate);
  } else if (sortBy === 'quantity') {
    result.sort((a, b) => b.quantity - a.quantity);
  } else {
    // Default: contribution (총 공헌이익)
    result.sort((a, b) => b.totalContribution - a.totalContribution);
  }

  // Find Top Best Menu (Highest contribution)
  const bestMenu = result.find((r) => r.quantity > 0) || result[0];

  // Overall summary metrics
  const totalQty = result.reduce((acc, r) => acc + r.quantity, 0);
  const totalSales = result.reduce((acc, r) => acc + r.totalNetSales, 0);
  const totalContrib = result.reduce((acc, r) => acc + r.totalContribution, 0);
  const avgMarginRate = totalSales > 0 ? (totalContrib / totalSales) * 100 : 0;
  const warningCount = result.filter((r) => r.isNegativeMargin || (r.quantity > 0 && r.marginRate < 50)).length;

  return {
    items: result,
    bestMenu,
    totalQty,
    totalSales,
    totalContrib,
    avgMarginRate,
    warningCount,
    menuCount: result.length
  };
}

/**
 * Calculate daily allocated expense rate for a given month (YYYY-MM).
 */
export function calculateDailyExpenseRate(yearMonth, monthlyExpensePlan = []) {
  const [year, month] = yearMonth.split('-').map(Number);
  // Get days in month: new Date(year, month, 0).getDate()
  const daysInMonth = new Date(year, month, 0).getDate();

  const planItems = monthlyExpensePlan.filter((p) => {
    const pMonth = p.month ? p.month.slice(0, 7) : (p.귀속월 ? String(p.귀속월).slice(0, 7) : '');
    return pMonth === yearMonth;
  });

  let totalMonthlyBudget = 0;
  const categories = {};

  for (const item of planItems) {
    const cat = item.category || item.항목 || '기타운영비';
    const amt = Number(item.amount || item.금액 || 0);
    totalMonthlyBudget += amt;
    categories[cat] = {
      monthlyBudget: amt,
      dailyRate: daysInMonth > 0 ? amt / daysInMonth : 0
    };
  }

  const totalDailyRate = daysInMonth > 0 ? totalMonthlyBudget / daysInMonth : 0;

  return {
    yearMonth,
    daysInMonth,
    totalMonthlyBudget,
    totalDailyRate,
    categories
  };
}

/**
 * Calculate detailed P&L statement for a specified date range.
 */
export function calculatePLStatement({
  sales = [],
  expenses = [],
  monthlyPlan = [],
  recipes = [],
  priceHistory = [],
  materials = [],
  startDate,
  endDate
}) {
  // Filter sales
  let filteredSales = sales;
  if (startDate) filteredSales = filteredSales.filter((s) => s.date >= startDate);
  if (endDate) filteredSales = filteredSales.filter((s) => s.date <= endDate);

  // Filter expenses
  let filteredExpenses = expenses;
  if (startDate) filteredExpenses = filteredExpenses.filter((e) => (e.date || e.귀속일자) >= startDate);
  if (endDate) filteredExpenses = filteredExpenses.filter((e) => (e.date || e.귀속일자) <= endDate);

  // 1. Gross & Net Sales
  let beverageSales = 0;
  let dessertSales = 0;
  let otherSales = 0;
  let totalDiscounts = 0;
  let totalNetSales = 0;
  let totalGrossSales = 0;

  // 2. COGS (Food & Packaging)
  let rawMaterialCost = 0; // 원두/파우더/시럽 등
  let dairyCost = 0;       // 우유
  let packagingCost = 0;   // 컵/홀더 등
  let otherCogs = 0;

  for (const s of filteredSales) {
    const qty = Number(s.quantity || 0);
    const unitPrice = Number(s.unit_price || 0);
    const disc = Number(s.discount_amount || 0);
    const net = s.net_sales !== undefined ? Number(s.net_sales) : (unitPrice * qty - disc);

    totalGrossSales += unitPrice * qty;
    totalDiscounts += disc;
    totalNetSales += net;

    // Check menu category
    if (s.menu_id === 'M07' || s.menu_id === 'M08' || (s.category && s.category.includes('디저트'))) {
      dessertSales += net;
    } else {
      beverageSales += net;
    }

    // Detailed ingredients cost
    const menuRecipes = recipes.filter((r) => r.menu_id === s.menu_id && (!r.recipe_version || r.recipe_version === s.recipe_version));
    for (const r of menuRecipes) {
      const uPrice = getMaterialUnitPriceAtDate(r.material_id, s.date, priceHistory, materials);
      const cost = uPrice * r.quantity * qty;
      const isPack = r.channel_only === '포장' || r.channel === '포장';

      if (isPack) {
        if (s.channel === '포장') packagingCost += cost;
      } else if (r.material_id === 'I02') {
        dairyCost += cost;
      } else {
        rawMaterialCost += cost;
      }
    }
  }

  const totalCogs = rawMaterialCost + dairyCost + packagingCost + otherCogs;
  const grossProfit = totalNetSales - totalCogs;
  const grossProfitMargin = totalNetSales > 0 ? (grossProfit / totalNetSales) * 100 : 0;

  // 3. Operating Expenses (OPEX)
  const paymentFee = totalNetSales * 0.015; // 1.5%

  // Group expenses by category
  const expenseCatMap = {};
  let recordedExpenseTotal = 0;

  for (const e of filteredExpenses) {
    const cat = e.category || e.항목 || '기타';
    const amt = Number(e.amount || e.금액 || 0);
    expenseCatMap[cat] = (expenseCatMap[cat] || 0) + amt;
    recordedExpenseTotal += amt;
  }

  // If no individual expense records exist for the range, fallback to daily allocated rate
  if (recordedExpenseTotal === 0 && startDate && endDate && monthlyPlan.length > 0) {
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    const dayCount = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
    const ym = startDate.slice(0, 7);
    const rateInfo = calculateDailyExpenseRate(ym, monthlyPlan);

    for (const [cat, info] of Object.entries(rateInfo.categories)) {
      expenseCatMap[cat] = info.dailyRate * dayCount;
      recordedExpenseTotal += expenseCatMap[cat];
    }
  }

  const totalOpex = paymentFee + recordedExpenseTotal;
  const operatingProfit = grossProfit - totalOpex;
  const operatingMargin = totalNetSales > 0 ? (operatingProfit / totalNetSales) * 100 : 0;

  // 4. BEP Analysis
  const contributionMargin = grossProfit - paymentFee; // 공헌이익
  const contributionMarginRatio = totalNetSales > 0 ? contributionMargin / totalNetSales : 0;
  const fixedCost = recordedExpenseTotal;
  const bepRevenue = contributionMarginRatio > 0 ? fixedCost / contributionMarginRatio : 0;
  const bepAttainment = fixedCost > 0 ? (contributionMargin / fixedCost) * 100 : 0;

  return {
    totalGrossSales,
    totalDiscounts,
    totalNetSales,
    beverageSales,
    dessertSales,
    otherSales,
    rawMaterialCost,
    dairyCost,
    packagingCost,
    totalCogs,
    grossProfit,
    grossProfitMargin,
    paymentFee,
    expenseBreakdown: expenseCatMap,
    totalOperatingExpenses: recordedExpenseTotal,
    totalOpex,
    operatingProfit,
    operatingMargin,
    bepRevenue,
    bepAttainment
  };
}

/**
 * Calculate Monthly Projection using last 4 weeks day-of-week average.
 */
export function calculateMonthlyProjection({
  referenceDate = '2026-09-18',
  sales = [],
  monthlyPlan = [],
  expenses = [],
  recipes = [],
  priceHistory = [],
  materials = []
}) {
  const currentYM = referenceDate.slice(0, 7); // e.g., '2026-09'
  const [year, month] = currentYM.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const lastDateOfMonth = `${currentYM}-${String(daysInMonth).padStart(2, '0')}`;

  // 1. Actual performance from Day 1 to referenceDate
  const startOfMonth = `${currentYM}-01`;
  const mtdSales = sales.filter((s) => s.date >= startOfMonth && s.date <= referenceDate);

  const mtdPL = calculatePLStatement({
    sales: mtdSales,
    expenses,
    monthlyPlan,
    recipes,
    priceHistory,
    materials,
    startDate: startOfMonth,
    endDate: referenceDate
  });

  // 2. Identify remaining unclosed dates in current month
  const refD = new Date(referenceDate);
  const remainingDates = [];
  for (let day = refD.getDate() + 1; day <= daysInMonth; day++) {
    remainingDates.push(`${currentYM}-${String(day).padStart(2, '0')}`);
  }

  // 3. Sample Window: last 4 weeks (28 days) ending at referenceDate
  const sampleStartD = new Date(refD);
  sampleStartD.setDate(sampleStartD.getDate() - 27);
  const sampleStartDate = sampleStartD.toISOString().slice(0, 10);

  const sampleSales = sales.filter((s) => s.date >= sampleStartDate && s.date <= referenceDate);

  // Group sample sales by day-of-week (0: Sun ~ 6: Sat)
  const salesByDow = Array.from({ length: 7 }, () => ({ count: 0, netSales: 0 }));
  const salesByDate = {};

  for (const s of sampleSales) {
    const net = s.net_sales !== undefined ? Number(s.net_sales) : (s.unit_price * s.quantity - (s.discount_amount || 0));
    salesByDate[s.date] = (salesByDate[s.date] || 0) + net;
  }

  for (const [dateStr, net] of Object.entries(salesByDate)) {
    const dow = new Date(dateStr).getDay();
    salesByDow[dow].count += 1;
    salesByDow[dow].netSales += net;
  }

  // Calculate average for each day of week (fallback to overall daily average if count == 0)
  const totalSampleNet = Object.values(salesByDate).reduce((a, b) => a + b, 0);
  const overallAvgDaily = Object.keys(salesByDate).length > 0 ? totalSampleNet / Object.keys(salesByDate).length : 700000;

  const dowAvg = salesByDow.map((d) => (d.count > 0 ? d.netSales / d.count : overallAvgDaily));

  // Sample average direct cost rate
  const samplePL = calculatePLStatement({
    sales: sampleSales,
    expenses,
    monthlyPlan,
    recipes,
    priceHistory,
    materials,
    startDate: sampleStartDate,
    endDate: referenceDate
  });
  const avgDirectCostRatio = samplePL.totalNetSales > 0 ? (samplePL.totalCogs + samplePL.paymentFee) / samplePL.totalNetSales : 0.29;

  // Daily fixed expense rate for this month
  const rateInfo = calculateDailyExpenseRate(currentYM, monthlyPlan);
  const dailyOpexRate = rateInfo.totalDailyRate;

  // 4. Project remaining days
  let projectedRemainingSales = 0;
  for (const dateStr of remainingDates) {
    const dow = new Date(dateStr).getDay();
    projectedRemainingSales += dowAvg[dow];
  }

  const projectedRemainingDirectCosts = projectedRemainingSales * avgDirectCostRatio;
  const projectedRemainingOpex = remainingDates.length * dailyOpexRate;
  const projectedRemainingProfit = projectedRemainingSales - projectedRemainingDirectCosts - projectedRemainingOpex;

  // 5. Total Final Monthly Forecast
  const finalForecastSales = mtdPL.totalNetSales + projectedRemainingSales;
  const finalForecastOperatingProfit = mtdPL.operatingProfit + projectedRemainingProfit;

  // Compare with previous month (e.g. 2026-08)
  const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
  const prevDays = new Date(year, month - 1, 0).getDate();
  const prevSales = sales.filter((s) => s.date >= `${prevMonth}-01` && s.date <= `${prevMonth}-${String(prevDays).padStart(2, '0')}`);
  const prevPL = calculatePLStatement({
    sales: prevSales,
    expenses,
    monthlyPlan,
    recipes,
    priceHistory,
    materials,
    startDate: `${prevMonth}-01`,
    endDate: `${prevMonth}-${String(prevDays).padStart(2, '0')}`
  });

  const momSalesGrowth = prevPL.totalNetSales > 0 ? ((finalForecastSales - prevPL.totalNetSales) / prevPL.totalNetSales) * 100 : 0;
  const momProfitGrowth = prevPL.operatingProfit > 0 ? ((finalForecastOperatingProfit - prevPL.operatingProfit) / prevPL.operatingProfit) * 100 : 0;

  return {
    referenceDate,
    currentYM,
    daysInMonth,
    elapsedDays: refD.getDate(),
    remainingDays: remainingDates.length,
    mtdNetSales: mtdPL.totalNetSales,
    mtdOperatingProfit: mtdPL.operatingProfit,
    projectedRemainingSales,
    projectedRemainingProfit,
    finalForecastSales,
    finalForecastOperatingProfit,
    momSalesGrowth,
    momProfitGrowth,
    sampleAvgWeekdaySales: (dowAvg[1] + dowAvg[2] + dowAvg[3] + dowAvg[4]) / 4,
    sampleAvgWeekendSales: (dowAvg[5] + dowAvg[6] + dowAvg[0]) / 3
  };
}

/**
 * Calculate dynamic material usage from sales and recipes up to a date or for a range.
 */
export function calculateMaterialUsage(sales = [], recipes = [], { startDate = null, endDate = null } = {}) {
  let filtered = sales;
  if (startDate) filtered = filtered.filter((s) => s.date >= startDate);
  if (endDate) filtered = filtered.filter((s) => s.date <= endDate);

  const recipeMap = new Map();
  for (const r of recipes) {
    const key = `${r.recipe_version || ''}_${r.menu_id}`;
    if (!recipeMap.has(key)) recipeMap.set(key, []);
    recipeMap.get(key).push(r);
  }

  const usageMap = {};

  for (const s of filtered) {
    const key = `${s.recipe_version || ''}_${s.menu_id}`;
    const recs = recipeMap.get(key) || [];
    const qty = Number(s.quantity || 0);

    for (const r of recs) {
      const isPack = r.channel_only === '포장' || r.channel === '포장';
      if (!isPack || s.channel === '포장') {
        const matQty = Number(r.quantity || 0) * qty;
        usageMap[r.material_id] = (usageMap[r.material_id] || 0) + matQty;
      }
    }
  }

  return usageMap;
}

/**
 * Calculate continuous inventory ledger and current stock as of targetDate.
 * Cascade calculates all inflows, sales consumption, waste, and audit adjustments.
 */
export function calculateInventoryLedger({
  materials = [],
  openingInventory = [],
  inventoryEvents = [],
  sales = [],
  recipes = [],
  targetDate = '2026-09-18'
}) {
  // Usage up to targetDate
  const totalUsageMap = calculateMaterialUsage(sales, recipes, { endDate: targetDate });
  // Usage on targetDate alone
  const todayUsageMap = calculateMaterialUsage(sales, recipes, { startDate: targetDate, endDate: targetDate });

  // Filter events
  const pastEvents = inventoryEvents.filter((e) => (e.date || e.귀속일자) <= targetDate);
  const todayEvents = inventoryEvents.filter((e) => (e.date || e.귀속일자) === targetDate);

  const eventsByMat = {};
  for (const e of pastEvents) {
    const mid = e.material_id;
    if (!eventsByMat[mid]) eventsByMat[mid] = { inflow: 0, waste: 0, auditDiff: 0 };
    const qty = Number(e.quantity || 0);
    if (e.event_type === '입고') eventsByMat[mid].inflow += qty;
    else if (e.event_type === '폐기') eventsByMat[mid].waste += qty;
    else if (e.event_type === '실사조정') eventsByMat[mid].auditDiff += qty;
  }

  const todayEventsByMat = {};
  for (const e of todayEvents) {
    const mid = e.material_id;
    if (!todayEventsByMat[mid]) todayEventsByMat[mid] = { inflow: 0, waste: 0, auditDiff: 0 };
    const qty = Number(e.quantity || 0);
    if (e.event_type === '입고') todayEventsByMat[mid].inflow += qty;
    else if (e.event_type === '폐기') todayEventsByMat[mid].waste += qty;
    else if (e.event_type === '실사조정') todayEventsByMat[mid].auditDiff += qty;
  }

  const openingMap = {};
  for (const o of openingInventory) {
    openingMap[o.material_id] = Number(o.quantity || 0);
  }

  const items = materials.map((m) => {
    const mid = m.material_id;
    const op = openingMap[mid] || 0;
    const ev = eventsByMat[mid] || { inflow: 0, waste: 0, auditDiff: 0 };
    const todayEv = todayEventsByMat[mid] || { inflow: 0, waste: 0, auditDiff: 0 };

    const totalUsage = totalUsageMap[mid] || 0;
    const todayUsage = todayUsageMap[mid] || 0;

    // Continuous ending inventory
    const currentStock = Math.round((op + ev.inflow - totalUsage - ev.waste + ev.auditDiff) * 100) / 100;
    const currentPacks = m.pack_quantity > 0 ? currentStock / m.pack_quantity : 0;

    // Yesterday closing stock
    const yesterdayStock = Math.round(
      (currentStock - todayEv.inflow + todayUsage + todayEv.waste - todayEv.auditDiff) * 100
    ) / 100;

    return {
      materialId: mid,
      name: m.name,
      unit: m.unit,
      packQuantity: m.pack_quantity,
      basePackPrice: m.base_pack_price,
      leadDays: m.lead_days || 1,
      safetyDays: m.safety_days || 1,
      supplierId: m.supplier_id,
      openingStock: op,
      yesterdayStock,
      todayInflow: todayEv.inflow,
      todayUsage,
      todayWaste: todayEv.waste,
      todayAuditDiff: todayEv.auditDiff,
      currentStock,
      currentPacks,
      totalUsage,
      totalInflow: ev.inflow,
      totalWaste: ev.waste
    };
  });

  return {
    targetDate,
    items
  };
}

/**
 * Calculate ROP and order recommendations with pack ceiling rounding (FEAT-15 & Case 3.2).
 */
export function calculateOrderRecommendations({
  materials = [],
  inventoryLedger = [],
  sales = [],
  recipes = [],
  suppliers = [],
  referenceDate = '2026-09-18'
}) {
  // 14 days average daily usage
  const refD = new Date(referenceDate);
  const sampleStartD = new Date(refD);
  sampleStartD.setDate(sampleStartD.getDate() - 13);
  const sampleStartDate = sampleStartD.toISOString().slice(0, 10);

  const sampleUsageMap = calculateMaterialUsage(sales, recipes, {
    startDate: sampleStartDate,
    endDate: referenceDate
  });

  const ledgerItems = inventoryLedger.items || inventoryLedger;
  const ledgerMap = new Map();
  for (const item of ledgerItems) {
    ledgerMap.set(item.materialId, item);
  }

  const supplierMap = new Map();
  for (const s of suppliers) {
    supplierMap.set(s.supplier_id, s.name);
  }

  const recommendations = [];

  for (const m of materials) {
    const mid = m.material_id;
    const ledger = ledgerMap.get(mid) || { currentStock: 0 };
    const currentStock = ledger.currentStock;

    const total14DaysUsage = sampleUsageMap[mid] || 0;
    const dailyAvgUsage = total14DaysUsage / 14; // Average usage per day

    const leadDays = m.lead_days || 1;
    const safetyDays = m.safety_days || 1;
    const rop = dailyAvgUsage * (leadDays + safetyDays); // Reorder Point in units (g, ml, ea)

    const isUrgent = currentStock <= rop;
    let orderPacks = 0;
    let orderQuantity = 0;
    let estimatedCost = 0;

    if (isUrgent) {
      const targetStock = rop * 1.5;
      const deficit = Math.max(0, targetStock - currentStock);
      const packQty = m.pack_quantity || 1;
      orderPacks = Math.max(1, Math.ceil(deficit / packQty)); // Ceiling round to pack
      orderQuantity = orderPacks * packQty;
      estimatedCost = orderPacks * (m.base_pack_price || 0);
    }

    const supplierName = supplierMap.get(m.supplier_id) || m.supplier_id || '기타공급사';

    recommendations.push({
      materialId: mid,
      name: m.name,
      unit: m.unit,
      packQuantity: m.pack_quantity,
      basePackPrice: m.base_pack_price,
      supplierId: m.supplier_id,
      supplierName,
      leadDays,
      safetyDays,
      currentStock,
      currentPacks: m.pack_quantity > 0 ? (currentStock / m.pack_quantity).toFixed(1) : 0,
      dailyAvgUsage,
      dailyAvgPacks: m.pack_quantity > 0 ? (dailyAvgUsage / m.pack_quantity).toFixed(1) : 0,
      rop,
      ropPacks: m.pack_quantity > 0 ? (rop / m.pack_quantity).toFixed(1) : 0,
      isUrgent,
      orderPacks,
      orderQuantity,
      estimatedCost
    });
  }

  const urgentItems = recommendations.filter((r) => r.isUrgent);
  const totalEstimatedCost = urgentItems.reduce((sum, r) => sum + r.estimatedCost, 0);

  return {
    referenceDate,
    items: recommendations,
    urgentItems,
    urgentCount: urgentItems.length,
    totalEstimatedCost
  };
}

/**
 * Generate formatted order clipboard text grouped by supplier for KakaoTalk / SMS (FEAT-16 & Case 3.2).
 */
export function generateOrderClipboardText(urgentItems = [], referenceDate = '2026-09-18') {
  if (urgentItems.length === 0) {
    return `[프렙 카페 발주서 - ${referenceDate}]\n현재 긴급 발주가 필요한 품목이 없습니다.`;
  }

  // Group by supplier
  const bySupplier = {};
  for (const item of urgentItems) {
    const sName = item.supplierName || '거래처';
    if (!bySupplier[sName]) bySupplier[sName] = [];
    bySupplier[sName].push(item);
  }

  let text = `[프렙 카페 발주서 - ${referenceDate}]\n`;
  text += `────────────────────\n`;

  for (const [sName, items] of Object.entries(bySupplier)) {
    text += `■ 거래처: ${sName}\n`;
    for (const it of items) {
      text += `  - ${it.name}: ${it.orderPacks}박스/팩 (${it.orderQuantity.toLocaleString()}${it.unit})\n`;
    }
    text += `\n`;
  }

  const totalCost = urgentItems.reduce((acc, it) => acc + it.estimatedCost, 0);
  text += `────────────────────\n`;
  text += `총 발주 건수: ${urgentItems.length}건\n`;
  text += `총 예상 금액: ${Math.round(totalCost).toLocaleString()}원\n`;
  text += `희망 납기: 익일 오전 중 납품 부탁드립니다.\n`;

  return text;
}


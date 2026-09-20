// Automated Unit Tests for EPIC 2 Calculations (P&L & Monthly Projection)
import fs from 'fs';
import {
  calculateDailyExpenseRate,
  calculatePLStatement,
  calculateMonthlyProjection
} from './src/services/calculations.js';

const rawData = JSON.parse(fs.readFileSync('./src/data/initialData.json', 'utf-8'));
const { menus, recipes, price_history, materials, sales, monthly_expense_plan, expenses } = rawData;

console.log('=== TEST 1: Verification Case 2.1 (Daily Allocated Expense Rate) ===');
// 9월(30일), 임차료 1,800,000원, 인건비 3,300,000원, 기타 6개 비용 1,230,000원 (총 6,330,000원) ➔ 211,000원/일
const samplePlan = [
  { month: '2026-09', category: '임차료', amount: 1800000 },
  { month: '2026-09', category: '인건비', amount: 3300000 },
  { month: '2026-09', category: '기타6종비용', amount: 1230000 }
];
const rateResult = calculateDailyExpenseRate('2026-09', samplePlan);
console.log('Days in month:', rateResult.daysInMonth);
console.log('Total monthly budget:', rateResult.totalMonthlyBudget);
console.log('Daily rate:', rateResult.totalDailyRate, '(Expected: 211,000원/일)');

if (rateResult.daysInMonth === 30 && rateResult.totalDailyRate === 211000) {
  console.log('✅ TEST 1 (Case 2.1) PASSED');
} else {
  console.error('❌ TEST 1 FAILED');
  process.exit(1);
}

console.log('\n=== TEST 2: Verification Case 2.2 (Daily Real Operating Profit) ===');
// 순매출 800,000원, 직접원가 220,000원, 결제수수료 12,000원 (800,000 * 1.5%), 일일 운영비 211,000원
// 매출총이익 = 580,000원, 판관비 = 223,000원, 최종 영업이익 = 357,000원 (44.6%)
const testSale = [
  { date: '2026-09-18', menu_id: 'M01', quantity: 200, unit_price: 4000, discount_amount: 0, net_sales: 800000 }
];
const testExpense = [
  { date: '2026-09-18', category: '일일운영비', amount: 211000 }
];
// Mock recipe to produce exact 220,000 cost (1,100 * 200)
const testRecipe = [{ menu_id: 'M01', material_id: 'I01', quantity: 20 }];
const testPrice = [{ material_id: 'I01', effective_date: '2025-01-01', pack_quantity: 1000, pack_price: 55000 }];

const plResult = calculatePLStatement({
  sales: testSale,
  expenses: testExpense,
  recipes: testRecipe,
  priceHistory: testPrice,
  materials: [],
  startDate: '2026-09-18',
  endDate: '2026-09-18'
});

console.log('Net Sales:', plResult.totalNetSales, '(Expected: 800,000)');
console.log('COGS (Direct Cost):', plResult.totalCogs, '(Expected: 220,000)');
console.log('Gross Profit:', plResult.grossProfit, '(Expected: 580,000)');
console.log('Payment Fee:', plResult.paymentFee, '(Expected: 12,000)');
console.log('Total OPEX:', plResult.totalOpex, '(Expected: 223,000)');
console.log('Operating Profit:', plResult.operatingProfit, '(Expected: 357,000)');
console.log('Operating Margin:', plResult.operatingMargin.toFixed(1) + '%', '(Expected: 44.6%)');

if (
  plResult.totalNetSales === 800000 &&
  plResult.totalCogs === 220000 &&
  plResult.grossProfit === 580000 &&
  plResult.paymentFee === 12000 &&
  plResult.totalOpex === 223000 &&
  plResult.operatingProfit === 357000 &&
  Math.abs(plResult.operatingMargin - 44.625) < 0.01
) {
  console.log('✅ TEST 2 (Case 2.2) PASSED');
} else {
  console.error('❌ TEST 2 FAILED');
  process.exit(1);
}

console.log('\n=== TEST 3: Verification Case 2.4 (Break-Even Point Attainment) ===');
// 고정비 211,000원 대비 공헌이익(580,000 - 12,000 = 568,000원) ➔ BEP 달성률 269.2%
console.log('BEP Attainment:', plResult.bepAttainment.toFixed(1) + '%', '(Expected: 269.2%)');
if (Math.abs(plResult.bepAttainment - 269.1943) < 0.01) {
  console.log('✅ TEST 3 (Case 2.4 BEP) PASSED');
} else {
  console.error('❌ TEST 3 FAILED');
  process.exit(1);
}

console.log('\n=== TEST 4: Verification Case 2.3 (Monthly Projection with Real Store Data) ===');
const proj = calculateMonthlyProjection({
  referenceDate: '2026-09-18',
  sales,
  monthlyPlan: monthly_expense_plan,
  expenses,
  recipes,
  priceHistory: price_history,
  materials
});

console.log('Elapsed Days:', proj.elapsedDays, 'Remaining Days:', proj.remainingDays);
console.log('MTD Net Sales (1~18):', Math.round(proj.mtdNetSales).toLocaleString());
console.log('MTD Operating Profit (1~18):', Math.round(proj.mtdOperatingProfit).toLocaleString());
console.log('Projected Remaining Sales (19~30):', Math.round(proj.projectedRemainingSales).toLocaleString());
console.log('Projected Remaining Profit (19~30):', Math.round(proj.projectedRemainingProfit).toLocaleString());
console.log('Final Forecast Sales:', Math.round(proj.finalForecastSales).toLocaleString());
console.log('Final Forecast Profit:', Math.round(proj.finalForecastOperatingProfit).toLocaleString());
console.log('MoM Sales Growth:', proj.momSalesGrowth.toFixed(1) + '%');
console.log('MoM Profit Growth:', proj.momProfitGrowth.toFixed(1) + '%');

if (
  proj.elapsedDays === 18 &&
  proj.remainingDays === 12 &&
  proj.finalForecastSales > 20000000 &&
  proj.finalForecastOperatingProfit > 10000000 &&
  proj.momSalesGrowth > 0 &&
  proj.momProfitGrowth > 0
) {
  console.log('✅ TEST 4 (Case 2.3 Projection) PASSED');
} else {
  console.error('❌ TEST 4 FAILED');
  process.exit(1);
}

console.log('\n=== TEST 5: Period Allocation Check (Day, Week, Month) ===');
const weekPL = calculatePLStatement({
  sales,
  expenses,
  monthlyPlan: monthly_expense_plan,
  recipes,
  priceHistory: price_history,
  materials,
  startDate: '2026-09-12',
  endDate: '2026-09-18'
});
console.log('7 Days Week Net Sales:', Math.round(weekPL.totalNetSales).toLocaleString());
console.log('7 Days Operating Profit:', Math.round(weekPL.operatingProfit).toLocaleString());
console.log('7 Days Operating Margin:', weekPL.operatingMargin.toFixed(1) + '%');

if (weekPL.totalNetSales > 0 && weekPL.operatingProfit > 0 && weekPL.totalCogs > 0) {
  console.log('✅ TEST 5 (Period Allocation) PASSED');
} else {
  console.error('❌ TEST 5 FAILED');
  process.exit(1);
}

console.log('\n=== ALL 5 EPIC 2 AUTOMATED TESTS PASSED WITH 100% SUCCESS ===');

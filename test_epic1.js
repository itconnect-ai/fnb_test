// Automated Unit Tests for EPIC 1 Calculations
import fs from 'fs';
import {
  getMaterialUnitPriceAtDate,
  calculateRecipeUnitCost,
  calculateItemMargin,
  aggregateMenuProfitability
} from './src/services/calculations.js';

const rawData = JSON.parse(fs.readFileSync('./src/data/initialData.json', 'utf-8'));
const { menus, recipes, price_history, materials, sales } = rawData;

console.log('=== TEST 1: Material Unit Price by Date ===');
const p1 = getMaterialUnitPriceAtDate('I01', '2025-10-01', price_history, materials);
const p2 = getMaterialUnitPriceAtDate('I01', '2026-02-01', price_history, materials);
console.log(`I01 (원두) price at 2025-10-01: ${p1} (Expected: 23원/g)`);
console.log(`I01 (원두) price at 2026-02-01: ${p2} (Expected: 23.92원/g)`);
if (p1 === 23 && Math.abs(p2 - 23.92) < 0.001) {
  console.log('✅ TEST 1 PASSED');
} else {
  console.error('❌ TEST 1 FAILED');
  process.exit(1);
}

console.log('\n=== TEST 2: Recipe Cost (Dine-in vs Takeout) ===');
const costDineIn = calculateRecipeUnitCost('R1', 'M01', '매장', '2025-10-01', recipes, price_history, materials);
const costTakeOut = calculateRecipeUnitCost('R1', 'M01', '포장', '2025-10-01', recipes, price_history, materials);
console.log('M01 Dine-in cost:', costDineIn, '(Expected food: 460, packaging: 0)');
console.log('M01 Takeout cost:', costTakeOut, '(Expected food: 460, packaging: 160)');
if (costDineIn.foodCost === 460 && costDineIn.packagingCost === 0 && costTakeOut.packagingCost === 160) {
  console.log('✅ TEST 2 PASSED');
} else {
  console.error('❌ TEST 2 FAILED');
  process.exit(1);
}

console.log('\n=== TEST 3: Verification Case 1.1 (Dine-in Normal) ===');
// 아메리카노 매장 10잔(잔당 4,000원, 원두 460원, 수수료 60원 ➔ 개당 마진 3,480원, 87.0%, 총 공헌이익 34,800원)
const margin1 = calculateItemMargin({
  unitPrice: 4000,
  discountPerItem: 0,
  foodCost: 460,
  packagingCost: 0,
  feeRate: 0.015
});
console.log('Case 1.1 single item margin:', margin1);
const totalContrib1 = margin1.netMargin * 10;
console.log('Case 1.1 total contribution (10 items):', totalContrib1);
if (margin1.netMargin === 3480 && margin1.marginRate === 87 && totalContrib1 === 34800) {
  console.log('✅ TEST 3 (Case 1.1) PASSED');
} else {
  console.error('❌ TEST 3 FAILED');
  process.exit(1);
}

console.log('\n=== TEST 4: Verification Case 1.2 (Takeout Discount 500) ===');
// 아메리카노 포장 5잔(판매가 3,500원, 원두 460원, 포장컵 160원, 수수료 52.5원 ➔ 개당 마진 2,827.5원, 80.8%, 총 공헌이익 14,138원)
const margin2 = calculateItemMargin({
  unitPrice: 4000,
  discountPerItem: 500,
  foodCost: 460,
  packagingCost: 160,
  feeRate: 0.015
});
console.log('Case 1.2 single item margin:', margin2);
const totalContrib2 = margin2.netMargin * 5;
console.log('Case 1.2 total contribution (5 items):', Math.round(totalContrib2));
if (margin2.netMargin === 2827.5 && Math.abs(margin2.marginRate - 80.7857) < 0.01 && Math.round(totalContrib2) === 14138) {
  console.log('✅ TEST 4 (Case 1.2) PASSED');
} else {
  console.error('❌ TEST 4 FAILED');
  process.exit(1);
}

console.log('\n=== TEST 5: Verification Case 1.4 (Negative Margin / Error Case) ===');
// 디저트 판매가 5,000원에 할인 4,500원(실제수납 500원, 원가 1,500원)
const marginNeg = calculateItemMargin({
  unitPrice: 5000,
  discountPerItem: 4500,
  foodCost: 1500,
  packagingCost: 0,
  feeRate: 0.015
});
console.log('Negative margin case:', marginNeg);
if (marginNeg.isNegativeMargin && marginNeg.netMargin < 0) {
  console.log('✅ TEST 5 (Case 1.4 Negative Margin Flag) PASSED');
} else {
  console.error('❌ TEST 5 FAILED');
  process.exit(1);
}

console.log('\n=== TEST 6: Aggregation & Best Menu Selection across 445 days ===');
const aggAll = aggregateMenuProfitability(sales, {
  menus,
  recipes,
  priceHistory: price_history,
  materials,
  channelFilter: 'all'
});

console.log('Total sales records processed:', sales.length);
console.log('Menu count:', aggAll.items.length);
console.log('Best Menu (Top Contribution):', aggAll.bestMenu.menuName, `(${Math.round(aggAll.bestMenu.totalContribution).toLocaleString()}원)`);
console.log('Best Menu Badge:', aggAll.bestMenu.badgeName);

aggAll.items.forEach((item) => {
  console.log(`  - [${item.menuId}] ${item.menuName}: 수량 ${item.quantity}개, 개당마진 ${item.unitNetMargin.toFixed(1)}원, 마진율 ${item.marginRate.toFixed(1)}%, 총공헌 ${Math.round(item.totalContribution).toLocaleString()}원, 뱃지: ${item.badgeName}`);
});

if (aggAll.bestMenu && aggAll.bestMenu.menuId === 'M01' && aggAll.bestMenu.badge === 'star') {
  console.log('✅ TEST 6 PASSED: M01 (아메리카노) is Top 1 Best Menu with Star Badge');
} else {
  console.error('❌ TEST 6 FAILED');
  process.exit(1);
}

console.log('\nALL 6 AUTOMATED TESTS PASSED SUCCESSFULLY! 🎉');

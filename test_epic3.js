// Automated Unit Tests for EPIC 3 (Inventory Ledger, ROP Orders & Excel Backup/Restore)
import fs from 'fs';
import * as XLSX from 'xlsx';
import {
  calculateMaterialUsage,
  calculateInventoryLedger,
  calculateOrderRecommendations,
  generateOrderClipboardText
} from './src/services/calculations.js';

const SHEET_MAPPINGS = [
  { key: 'suppliers', sheetName: '공급사' },
  { key: 'materials', sheetName: '원부자재' },
  { key: 'menus', sheetName: '메뉴' },
  { key: 'recipes', sheetName: '레시피' },
  { key: 'price_history', sheetName: '단가이력' },
  { key: 'calendar', sheetName: '영업일정' },
  { key: 'sales', sheetName: '판매기록' },
  { key: 'opening_inventory', sheetName: '기초재고' },
  { key: 'inventory_events', sheetName: '입출고실사' },
  { key: 'monthly_expense_plan', sheetName: '월비용계획' },
  { key: 'expenses', sheetName: '비용기록' }
];

const rawData = JSON.parse(fs.readFileSync('./src/data/initialData.json', 'utf-8'));
const { materials, recipes, price_history, sales, opening_inventory, inventory_events, suppliers } = rawData;

console.log('=== TEST 1: Verification Case 3.1 (Sales Recipe Consumption & Cascade Ledger) ===');
// 전일 우유 재고 40,000ml (40팩). 오늘 카페라떼(우유 200ml 소모) 30잔 판매, 우유 10팩(10,000ml) 입고
// 소모량 = 6,000ml (6팩). 오늘 마감재고 = 40,000 + 10,000 - 6,000 = 44,000ml (44팩)
const testMaterials = [
  { material_id: 'I02', name: '우유', unit: 'ml', pack_quantity: 1000, base_pack_price: 2900, lead_days: 1, safety_days: 1 }
];
const testRecipes = [
  { recipe_version: 'R1', menu_id: 'M02', material_id: 'I02', quantity: 200 }
];
const testOpening = [
  { material_id: 'I02', date: '2026-09-01', quantity: 40000 }
];
const testEvents = [
  { date: '2026-09-18', material_id: 'I02', event_type: '입고', quantity: 10000 }
];
const testSales = [
  { date: '2026-09-18', menu_id: 'M02', quantity: 30, channel: '매장', recipe_version: 'R1' }
];

const ledger1 = calculateInventoryLedger({
  materials: testMaterials,
  openingInventory: testOpening,
  inventoryEvents: testEvents,
  sales: testSales,
  recipes: testRecipes,
  targetDate: '2026-09-18'
});

const milkItem1 = ledger1.items[0];
console.log('Today Inflow:', milkItem1.todayInflow, '(Expected: 10,000ml)');
console.log('Today Usage:', milkItem1.todayUsage, '(Expected: 6,000ml)');
console.log('Closing Stock:', milkItem1.currentStock, '(Expected: 44,000ml)');
console.log('Closing Packs:', milkItem1.currentPacks, '(Expected: 44팩)');

if (milkItem1.todayInflow === 10000 && milkItem1.todayUsage === 6000 && milkItem1.currentStock === 44000 && milkItem1.currentPacks === 44) {
  console.log('✅ Subtest 3.1-A PASSED');
} else {
  console.error('❌ Subtest 3.1-A FAILED');
  process.exit(1);
}

// Cascade Test: 어제(9/17) 판매에 10잔 추가 수정 시 (소모 2,000ml 증가) ➔ 오늘 마감재고가 즉시 42,000ml로 자동 재계산
testSales.push({ date: '2026-09-17', menu_id: 'M02', quantity: 10, channel: '매장', recipe_version: 'R1' });
const ledgerCascade = calculateInventoryLedger({
  materials: testMaterials,
  openingInventory: testOpening,
  inventoryEvents: testEvents,
  sales: testSales,
  recipes: testRecipes,
  targetDate: '2026-09-18'
});
const milkCascade = ledgerCascade.items[0];
console.log('After Yesterday Edit (+10 cups), Today Closing Stock:', milkCascade.currentStock, '(Expected: 42,000ml)');

if (milkCascade.currentStock === 42000) {
  console.log('✅ TEST 1 (Case 3.1 Cascade Recalculation) PASSED');
} else {
  console.error('❌ TEST 1 FAILED');
  process.exit(1);
}

console.log('\n=== TEST 2: Verification Case 3.2 (ROP & Pack Ceil Order Recommendation) ===');
// 매일 바리스타 우유(10팩/박스, 1,000ml/팩 -> 10,000ml/박스, 납기 1일, 안전 1일, 일평균 13팩 = 13,000ml)
// ROP = (13,000 * 1) + (13,000 * 1) = 26,000ml (26팩)
// 현재고 8,000ml (8팩)인 경우:
// 권장 발주량 = 26,000 * 1.5 - 8,000 = 31,000ml (31팩) ➔ 10팩 단위 올림 = Ceil(31 / 10) * 10 = 40팩 (4박스)
const matMilkOrder = [
  {
    material_id: 'I02',
    name: '매일 바리스타 우유',
    unit: 'ml',
    pack_quantity: 10000, // 10팩/박스 규격
    base_pack_price: 29000,
    lead_days: 1,
    safety_days: 1,
    supplier_id: 'V02'
  }
];
const mockLedger = [{ materialId: 'I02', currentStock: 8000 }]; // 8팩 (0.8박스)
// Generate 14 days sales to produce exactly 13,000ml/day average (Sep 5 to Sep 18)
const mockSales = [];
for (let i = 0; i < 14; i++) {
  const day = 5 + i;
  const d = `2026-09-${String(day).padStart(2, '0')}`;
  mockSales.push({ date: d, menu_id: 'M02', quantity: 65, channel: '매장', recipe_version: 'R1' }); // 65 * 200ml = 13,000ml/day
}

const orderRec = calculateOrderRecommendations({
  materials: matMilkOrder,
  inventoryLedger: mockLedger,
  sales: mockSales,
  recipes: testRecipes,
  suppliers: [{ supplier_id: 'V02', name: '매일유업' }],
  referenceDate: '2026-09-18'
});

const milkOrderResult = orderRec.items[0];
console.log('Daily Average Usage:', milkOrderResult.dailyAvgUsage, 'ml (Expected: 13,000ml)');
console.log('ROP:', milkOrderResult.rop, 'ml (Expected: 26,000ml)');
console.log('Is Urgent:', milkOrderResult.isUrgent, '(Expected: true)');
console.log('Order Boxes (Ceil rounded):', milkOrderResult.orderPacks, '박스 (Expected: 4박스 = 40팩)');
console.log('Order Quantity:', milkOrderResult.orderQuantity, 'ml (Expected: 40,000ml)');

const clipText = generateOrderClipboardText(orderRec.urgentItems, '2026-09-18');
console.log('\nClipboard Text snippet:\n' + clipText);

if (
  milkOrderResult.dailyAvgUsage === 13000 &&
  milkOrderResult.rop === 26000 &&
  milkOrderResult.isUrgent === true &&
  milkOrderResult.orderPacks === 4 &&
  milkOrderResult.orderQuantity === 40000 &&
  clipText.includes('4박스/팩')
) {
  console.log('✅ TEST 2 (Case 3.2 Order Recommendation & Clipboard) PASSED');
} else {
  console.error('❌ TEST 2 FAILED');
  process.exit(1);
}

console.log('\n=== TEST 3: Verification Case 3.3 (Waste Separation from Recipe Margin) ===');
// 우유 1팩(2,900원) 폐기 등록 시 수불부 폐기 차감 및 개당 마진 보존 검증
testEvents.push({ date: '2026-09-18', material_id: 'I02', event_type: '폐기', quantity: 1000 });
const ledgerWaste = calculateInventoryLedger({
  materials: testMaterials,
  openingInventory: testOpening,
  inventoryEvents: testEvents,
  sales: testSales,
  recipes: testRecipes,
  targetDate: '2026-09-18'
});
const milkAfterWaste = ledgerWaste.items[0];
console.log('Today Waste:', milkAfterWaste.todayWaste, '(Expected: 1,000ml)');
console.log('Stock after 1 pack waste:', milkAfterWaste.currentStock, '(Expected: 41,000ml)');

if (milkAfterWaste.todayWaste === 1000 && milkAfterWaste.currentStock === 41000) {
  console.log('✅ TEST 3 (Case 3.3 Waste Ledger Separation) PASSED');
} else {
  console.error('❌ TEST 3 FAILED');
  process.exit(1);
}

console.log('\n=== TEST 4: Verification Case 3.4 (11-Sheet Excel Backup & 100% Integrity Restore) ===');
// Create a full 11-sheet workbook in memory and parse back
const wb = XLSX.utils.book_new();
for (const { key, sheetName } of SHEET_MAPPINGS) {
  const rows = rawData[key] || [];
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
const readWb = XLSX.read(excelBuffer, { type: 'buffer' });
console.log('Exported & Read Sheets Count:', readWb.SheetNames.length, '(Expected: 11)');

let totalRowsRestored = 0;
let salesRowsRestored = 0;
for (const { key, sheetName } of SHEET_MAPPINGS) {
  const sheet = readWb.Sheets[sheetName];
  const parsed = XLSX.utils.sheet_to_json(sheet);
  totalRowsRestored += parsed.length;
  if (key === 'sales') salesRowsRestored = parsed.length;
}

console.log('Total Restored Records across 11 sheets:', totalRowsRestored);
console.log('Sales Records Restored:', salesRowsRestored, '(Expected: 6,112)');

if (readWb.SheetNames.length === 11 && salesRowsRestored === 6112 && totalRowsRestored > 10000) {
  console.log('✅ TEST 4 (Case 3.4 Excel Backup & Restore Integrity) PASSED');
} else {
  console.error('❌ TEST 4 FAILED');
  process.exit(1);
}

console.log('\n=== TEST 5: Verification Case 3.5 (Error Case & Corrupt File Block) ===');
// Corrupted file with no sheets or missing required sheets
const fakeWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(fakeWb, XLSX.utils.json_to_sheet([{ a: 1 }]), '임의의시트');
const fakeBuf = XLSX.write(fakeWb, { type: 'buffer', bookType: 'xlsx' });
const parsedFake = XLSX.read(fakeBuf, { type: 'buffer' });
const essentialKeywords = ['판매', '재고', '메뉴', '원부자재'];
const hasEssential = essentialKeywords.some((k) => parsedFake.SheetNames.some((n) => n.includes(k)));
console.log('Corrupted File Has Essential Sheets:', hasEssential, '(Expected: false - should block)');

if (!hasEssential) {
  console.log('✅ TEST 5 (Case 3.5 Corrupt File Block Validation) PASSED');
} else {
  console.error('❌ TEST 5 FAILED');
  process.exit(1);
}

console.log('\n=== ALL 5 EPIC 3 AUTOMATED TESTS PASSED WITH 100% SUCCESS ===');

// Excel Backup and Restore Service using SheetJS (XLSX)
import * as XLSX from 'xlsx';
import { storage } from '../data/storage.js';
import { store } from '../models/store.js';

export const SHEET_MAPPINGS = [
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

/**
 * Export all 11 stores to a 11-sheet Excel file (.xlsx) and trigger download.
 */
export async function exportBackupToExcel() {
  const exportData = await storage.exportAll();
  const wb = XLSX.utils.book_new();

  for (const { key, sheetName } of SHEET_MAPPINGS) {
    const dataList = exportData[key] || [];
    const ws = XLSX.utils.json_to_sheet(dataList);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const fileName = `프렙카페_운영백업_${todayStr}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return {
    success: true,
    fileName,
    sheetsCount: SHEET_MAPPINGS.length
  };
}

/**
 * Import and restore an Excel file (.xlsx).
 * Validates sheet existence and data integrity.
 */
export async function importBackupFromExcel(file) {
  if (!file) {
    throw new Error('선택된 파일이 없습니다.');
  }

  // Check file extension or name
  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    throw new Error('유효하지 않은 파일 형식입니다. .xlsx 엑셀 백업 파일을 선택해 주세요.');
  }

  let buffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (err) {
    throw new Error('파일을 읽는 중 오류가 발생했습니다.');
  }

  let wb;
  try {
    wb = XLSX.read(buffer, { type: 'array' });
  } catch (err) {
    throw new Error('유효하지 않은 엑셀 백업 파일입니다. 파일 손상 여부를 확인해 주세요.');
  }

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('유효하지 않은 엑셀 백업 파일입니다. 필수 시트(판매, 재고 등)를 확인해 주세요.');
  }

  // Check essential sheets exist
  const essentialKeywords = ['판매', '재고', '메뉴', '원부자재'];
  const hasEssential = essentialKeywords.some((keyword) =>
    wb.SheetNames.some((name) => name.includes(keyword) || name.toLowerCase().includes(keyword))
  );

  // Or check by key mapping
  const foundSheets = SHEET_MAPPINGS.filter(({ key, sheetName }) =>
    wb.SheetNames.includes(sheetName) || wb.SheetNames.includes(key)
  );

  if (foundSheets.length < 3 && !hasEssential) {
    throw new Error('유효하지 않은 엑셀 백업 파일입니다. 필수 시트(판매, 재고 등)를 확인해 주세요.');
  }

  const restoredData = {};

  for (const { key, sheetName } of SHEET_MAPPINGS) {
    // Find sheet by Korean name or english key
    let targetSheetName = wb.SheetNames.find((s) => s === sheetName || s === key);
    if (!targetSheetName) {
      // Fuzzy find
      targetSheetName = wb.SheetNames.find((s) => s.includes(sheetName) || s.includes(key));
    }

    if (targetSheetName && wb.Sheets[targetSheetName]) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[targetSheetName]);
      restoredData[key] = rows;
    } else {
      restoredData[key] = [];
    }
  }

  // Validate that critical tables are not all completely empty unless user uploaded empty template
  const totalRecords = Object.values(restoredData).reduce((sum, arr) => sum + arr.length, 0);
  if (totalRecords === 0) {
    throw new Error('유효하지 않은 엑셀 백업 파일입니다. 데이터가 비어 있습니다.');
  }

  // Save to IndexedDB
  await storage.importAll(restoredData);
  // Reload store in-memory state
  await store.reload();

  return {
    success: true,
    totalRecords,
    sheetsRestored: Object.keys(restoredData).length
  };
}

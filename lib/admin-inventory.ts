export type InventoryRow = {
  id: string; productId: string; productName: string; sku: string; color: string; size: string;
  stock: number; reserved: number; available: number; active: number; productStatus: string; priceKobo: number;
};
export type StockFilter = 'available' | 'low' | 'out' | 'archived' | 'all';
export function isSellable(row: InventoryRow) { return Boolean(row.active) && row.productStatus === 'published'; }
export function matchesStockFilter(row: InventoryRow, filter: StockFilter, threshold=3) {
  if (filter === 'all') return true;
  if (filter === 'archived') return !row.active || row.productStatus === 'archived';
  if (!isSellable(row)) return false;
  return filter === 'available' ? row.available > 0 : filter === 'low' ? row.available > 0 && row.available <= threshold : row.available === 0;
}
export function parseStock(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 && n <= 100000 ? n : null;
}
export function stockTotals(rows: InventoryRow[], threshold=3) {
  const live = rows.filter(isSellable);
  return { onHand: live.reduce((n,r)=>n+r.stock,0), reserved: live.reduce((n,r)=>n+r.reserved,0), available: live.reduce((n,r)=>n+r.available,0), low: live.filter(r=>matchesStockFilter(r,'low',threshold)).length, out: live.filter(r=>matchesStockFilter(r,'out')).length };
}

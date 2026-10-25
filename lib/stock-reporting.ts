import {matchesStockFilter, stockTotals, type InventoryRow} from './admin-inventory';

// Match the dashboard's sellable stock and reservation rules. Limit examples,
// never the totals; zero available is reported separately from low stock.
export async function inventoryStockReport(db: D1Database, threshold: number) {
  const {results} = await db.prepare(`
    SELECT v.id,v.product_id AS productId,p.name AS productName,v.sku,v.color,v.size,
           v.stock,v.active,p.status AS productStatus,p.price_kobo AS priceKobo,
           COALESCE(r.reserved,0) AS reserved,
           MAX(0,v.stock-COALESCE(r.reserved,0)) AS available
    FROM product_variants v JOIN products p ON p.id=v.product_id
    LEFT JOIN (SELECT variant_id,SUM(quantity) AS reserved FROM stock_reservations
               WHERE expires_at>CURRENT_TIMESTAMP GROUP BY variant_id) r ON r.variant_id=v.id
    WHERE v.active=1 AND p.status='published'
    ORDER BY available,p.name,v.color,v.size,v.id
  `).all<InventoryRow>();
  const totals = stockTotals(results, threshold);
  return {
    lowStock: totals.low,
    outOfStock: totals.out,
    lowExamples: results.filter(row=>matchesStockFilter(row,'low',threshold)).slice(0,100),
    outExamples: results.filter(row=>matchesStockFilter(row,'out',threshold)).slice(0,100),
  };
}

export function inventoryReportMessage(report: Awaited<ReturnType<typeof inventoryStockReport>>, threshold: number) {
  const section = (title: string, count: number, rows: InventoryRow[]) =>
    `${title}: ${count}\n` + rows.map(row=>`${row.productName} · ${row.color} · ${row.size}: ${row.available} available (${row.stock} recorded, ${row.reserved} reserved)`).join('\n') +
    (count>rows.length ? `\nShowing ${rows.length} of ${count}. Open Inventory for the full list.` : '');
  return `Published, active variants only. Available stock excludes active checkout reservations.\nLow-stock threshold: ${threshold}\n\n` +
    section('Low-stock variants',report.lowStock,report.lowExamples) + '\n\n' +
    section('Out-of-stock variants',report.outOfStock,report.outExamples);
}

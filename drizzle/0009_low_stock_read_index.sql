-- Supports threshold filtering and stock/SKU ordering without a full variant scan.
CREATE INDEX IF NOT EXISTS product_variants_low_stock_idx
ON product_variants(active, stock, sku, product_id);

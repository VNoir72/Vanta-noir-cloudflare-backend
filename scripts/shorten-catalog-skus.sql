-- User-authorized catalogue label cleanup. Variant IDs and stock are unchanged.
-- Preserve every original SKU and proposed replacement for rollback/audit.
INSERT OR IGNORE INTO store_meta(key,value)
SELECT 'sku-shortening-20261014:'||id,
       json_object('before',sku,'after',printf('VN-%04X-%s',ROW_NUMBER() OVER(ORDER BY product_id,id),substr(replace(upper(size),' ',''),1,3)))
FROM product_variants WHERE length(sku)>16;
-- One atomic UPDATE: unique SKU constraints reject the whole statement on conflict.
UPDATE product_variants SET sku=(SELECT json_extract(value,'$.after') FROM store_meta WHERE key='sku-shortening-20261014:'||product_variants.id)
WHERE EXISTS(SELECT 1 FROM store_meta WHERE key='sku-shortening-20261014:'||product_variants.id AND json_extract(value,'$.before')=product_variants.sku);

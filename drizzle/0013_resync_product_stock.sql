-- Inventory for products with variants = combined stock of the variants; stock is never negative.
UPDATE product_variants SET stock_qty = 0 WHERE stock_qty < 0;
UPDATE products SET stock_qty = 0 WHERE stock_qty < 0;

-- Products with option groups: sum the variants of the first group
UPDATE products p SET stock_qty = COALESCE((
	SELECT SUM(GREATEST(v.stock_qty, 0))::int
	FROM product_variants v
	WHERE v.product_id = p.id
		AND EXISTS (
			SELECT 1 FROM product_option_values ov
			WHERE ov.id = v.option_value_ids ->> 0
				AND ov.group_id = (
					SELECT g.id FROM product_option_groups g WHERE g.product_id = p.id ORDER BY g.sort_order LIMIT 1
				)
		)
), p.stock_qty)
WHERE EXISTS (SELECT 1 FROM product_option_groups g WHERE g.product_id = p.id);

-- Legacy products: flat variants without option groups
UPDATE products p SET stock_qty = (
	SELECT COALESCE(SUM(GREATEST(v.stock_qty, 0)), 0)::int FROM product_variants v WHERE v.product_id = p.id
)
WHERE NOT EXISTS (SELECT 1 FROM product_option_groups g WHERE g.product_id = p.id)
	AND EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id);

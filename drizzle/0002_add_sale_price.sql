-- Migration: add sale_price column to products table
-- A NULL sale_price means the product is not on sale.
-- A non-NULL value means the product has a discounted price ("on sale").

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sale_price" numeric(10, 2);

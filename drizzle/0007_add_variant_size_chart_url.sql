-- Add size_chart_url column to product_variants for size-type variant size charts
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "size_chart_url" text;

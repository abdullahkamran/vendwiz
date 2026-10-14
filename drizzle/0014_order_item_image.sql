-- Snapshot of the product/option image on each order line, so past orders keep their image
-- after the product is deleted.
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "image_url" text;

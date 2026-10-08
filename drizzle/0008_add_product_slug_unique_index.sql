-- Add unique index on (store_id, slug) to enforce per-store slug uniqueness at the DB level
-- This eliminates the TOCTOU race between the application-level conflict check and INSERT/UPDATE
CREATE UNIQUE INDEX IF NOT EXISTS "products_store_slug_unique" ON "products" ("store_id", "slug");

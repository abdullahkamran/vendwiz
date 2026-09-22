-- Migration: add 'basic' as a valid theme value and update the column default
-- The theme column is a plain text column; no PostgreSQL ENUM type is used,
-- so no ALTER TYPE is needed.  We just update the column default so that
-- newly-created stores get 'basic' instead of the old default 'minimal'.

ALTER TABLE "stores" ALTER COLUMN "theme" SET DEFAULT 'basic';

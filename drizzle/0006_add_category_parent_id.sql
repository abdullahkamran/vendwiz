ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "parent_id" text REFERENCES "categories"("id") ON DELETE SET NULL;

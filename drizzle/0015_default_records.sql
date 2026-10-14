-- Hidden per-store default category / product / discount code. Deleting the real thing re-points
-- its dependants (products, past order lines, past orders) at the default instead of leaving a gap.
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false;
ALTER TABLE "discount_codes" ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false;

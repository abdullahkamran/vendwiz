-- Hidden default variant: past order lines are re-pointed at it when their variant is removed.
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false;

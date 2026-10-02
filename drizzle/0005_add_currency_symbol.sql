ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "currency_symbol" text NOT NULL DEFAULT 'Rs.';

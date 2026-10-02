-- Migration: add discount_type enum and discount_codes table

DO $$ BEGIN
  CREATE TYPE "discount_type" AS ENUM ('percentage', 'fixed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "discount_codes" (
  "id"               text PRIMARY KEY,
  "store_id"         text NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "code"             text NOT NULL,
  "type"             "discount_type" NOT NULL,
  "value"            numeric(10, 2) NOT NULL,
  "min_order_amount" numeric(10, 2),
  "usage_limit"      integer,
  "usage_count"      integer NOT NULL DEFAULT 0,
  "is_active"        boolean NOT NULL DEFAULT true,
  "expires_at"       timestamp,
  "created_at"       timestamp NOT NULL DEFAULT now()
);

-- Per-store bank details for bank-transfer payments (blank = bank transfer not offered).
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "bank_name" text;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "bank_account_title" text;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "bank_account_number" text;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "bank_iban" text;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "bank_branch" text;

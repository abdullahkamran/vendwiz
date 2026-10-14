-- Supported currencies, selectable per store in store settings
CREATE TABLE IF NOT EXISTS "currencies" (
	"code" text PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL DEFAULT 0
);

INSERT INTO "currencies" ("code", "symbol", "name", "sort_order") VALUES
	('PKR', 'Rs.', 'Pakistani Rupee', 1),
	('USD', '$', 'US Dollar', 2),
	('EUR', '€', 'Euro', 3),
	('GBP', '£', 'British Pound', 4),
	('INR', '₹', 'Indian Rupee', 5),
	('AED', 'AED', 'UAE Dirham', 6),
	('SAR', 'SAR', 'Saudi Riyal', 7),
	('CAD', 'CA$', 'Canadian Dollar', 8),
	('AUD', 'A$', 'Australian Dollar', 9),
	('BDT', '৳', 'Bangladeshi Taka', 10)
ON CONFLICT ("code") DO NOTHING;

ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "currency_code" text NOT NULL DEFAULT 'PKR';

-- Backfill from the symbol each store already uses
UPDATE "stores" s SET "currency_code" = c."code"
FROM "currencies" c WHERE c."symbol" = s."currency_symbol";

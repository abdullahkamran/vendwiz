-- How the customer chose to pay: 'cod' (cash on delivery) or 'bank_transfer'. Existing orders were all COD.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_method" text NOT NULL DEFAULT 'cod';

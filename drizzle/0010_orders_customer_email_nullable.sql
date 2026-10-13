-- Make customer_email nullable: email is optional at checkout
ALTER TABLE orders ALTER COLUMN customer_email DROP NOT NULL;

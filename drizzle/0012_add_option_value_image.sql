-- Optional product image shown on the storefront when a colour option is selected
ALTER TABLE "product_option_values" ADD COLUMN IF NOT EXISTS "image_url" text;

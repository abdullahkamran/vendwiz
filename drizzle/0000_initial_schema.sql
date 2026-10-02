-- Initial schema: create all base tables idempotently.
-- Every subsequent migration uses ADD COLUMN IF NOT EXISTS / ON CONFLICT DO NOTHING,
-- so this file can be run before OR after those migrations without conflict.
--
-- Enum types are created via DO blocks to avoid "already exists" errors on
-- databases that already have them (PostgreSQL does not support
-- CREATE TYPE IF NOT EXISTS for user-defined enum types in older versions).

-- ── Enum types ────────────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'pending', 'processing', 'dispatched', 'completed', 'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE review_status AS ENUM ('pending', 'approved', 'hidden');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Auth tables (Better Auth) ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "users" (
    "id"             text PRIMARY KEY,
    "email"          text NOT NULL UNIQUE,
    "email_verified" boolean NOT NULL DEFAULT false,
    "name"           text NOT NULL,
    "image"          text,
    "created_at"     timestamp NOT NULL DEFAULT now(),
    "updated_at"     timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sessions" (
    "id"          text PRIMARY KEY,
    "expires_at"  timestamp NOT NULL,
    "token"       text NOT NULL UNIQUE,
    "created_at"  timestamp NOT NULL DEFAULT now(),
    "updated_at"  timestamp NOT NULL DEFAULT now(),
    "ip_address"  text,
    "user_agent"  text,
    "user_id"     text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "accounts" (
    "id"                        text PRIMARY KEY,
    "account_id"                text NOT NULL,
    "provider_id"               text NOT NULL,
    "user_id"                   text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "access_token"              text,
    "refresh_token"             text,
    "id_token"                  text,
    "access_token_expires_at"   timestamp,
    "refresh_token_expires_at"  timestamp,
    "scope"                     text,
    "password"                  text,
    "created_at"                timestamp NOT NULL DEFAULT now(),
    "updated_at"                timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "verifications" (
    "id"          text PRIMARY KEY,
    "identifier"  text NOT NULL,
    "value"       text NOT NULL,
    "expires_at"  timestamp NOT NULL,
    "created_at"  timestamp NOT NULL DEFAULT now(),
    "updated_at"  timestamp NOT NULL DEFAULT now()
);

-- ── Stores ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "stores" (
    "id"                      text PRIMARY KEY,
    "owner_id"                text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "subdomain"               text NOT NULL UNIQUE,
    "name"                    text NOT NULL,
    "description"             text,
    "logo_url"                text,
    "favicon_url"             text,
    "theme"                   text NOT NULL DEFAULT 'basic',
    "custom_theme"            jsonb,
    "whatsapp"                text,
    "instagram"               text,
    "facebook"                text,
    "contact_email"           text,
    "contact_phone"           text,
    "announcement_enabled"    boolean NOT NULL DEFAULT false,
    "announcement_text"       text,
    "announcement_bg"         text DEFAULT '#1a1a2e',
    "announcement_fg"         text DEFAULT '#ffffff',
    "shipping_fee"            numeric(10, 2) NOT NULL DEFAULT '0',
    "free_shipping_threshold" numeric(10, 2),
    "tax_rate"                numeric(5, 4) NOT NULL DEFAULT '0',
    "tax_label"               text DEFAULT 'Tax',
    "currency_symbol"         text NOT NULL DEFAULT 'Rs.',
    "seo_title"               text,
    "seo_description"         text,
    "is_active"               boolean NOT NULL DEFAULT false,
    "verification_code"       text,
    "created_at"              timestamp NOT NULL DEFAULT now(),
    "updated_at"              timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "license_keys" (
    "id"               text PRIMARY KEY,
    "code"             text NOT NULL UNIQUE,
    "used_by_store_id" text REFERENCES "stores"("id"),
    "used_at"          timestamp,
    "created_at"       timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "store_policies" (
    "id"         text PRIMARY KEY,
    "store_id"   text NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
    "type"       text NOT NULL,
    "title"      text NOT NULL,
    "content"    text NOT NULL,
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- ── Categories ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "categories" (
    "id"          text PRIMARY KEY,
    "store_id"    text NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
    "name"        text NOT NULL,
    "slug"        text NOT NULL,
    "description" text,
    "image_url"   text,
    "sort_order"  integer NOT NULL DEFAULT 0,
    "created_at"  timestamp NOT NULL DEFAULT now()
);

-- ── Products ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "products" (
    "id"                  text PRIMARY KEY,
    "store_id"            text NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
    "category_id"         text REFERENCES "categories"("id") ON DELETE SET NULL,
    "title"               text NOT NULL,
    "slug"                text NOT NULL,
    "description"         text,
    "base_price"          numeric(10, 2) NOT NULL,
    "images"              jsonb NOT NULL DEFAULT '[]',
    "youtube_url"         text,
    "stock_qty"           integer NOT NULL DEFAULT 0,
    "low_stock_threshold" integer NOT NULL DEFAULT 5,
    "track_inventory"     boolean NOT NULL DEFAULT true,
    "seo_title"           text,
    "seo_description"     text,
    "sale_price"          numeric(10, 2),
    "is_published"        boolean NOT NULL DEFAULT true,
    "sort_order"          integer NOT NULL DEFAULT 0,
    "created_at"          timestamp NOT NULL DEFAULT now(),
    "updated_at"          timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "product_option_groups" (
    "id"         text PRIMARY KEY,
    "product_id" text NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "name"       text NOT NULL,
    "sort_order" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "product_option_values" (
    "id"         text PRIMARY KEY,
    "group_id"   text NOT NULL REFERENCES "product_option_groups"("id") ON DELETE CASCADE,
    "value"      text NOT NULL,
    "sort_order" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "product_variants" (
    "id"               text PRIMARY KEY,
    "product_id"       text NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "option_value_ids" jsonb NOT NULL,
    "label"            text NOT NULL,
    "price"            numeric(10, 2),
    "stock_qty"        integer NOT NULL DEFAULT 0,
    "sku"              text
);

CREATE TABLE IF NOT EXISTS "product_attributes" (
    "id"         text PRIMARY KEY,
    "product_id" text NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "name"       text NOT NULL,
    "value"      text NOT NULL,
    "sort_order" integer NOT NULL DEFAULT 0
);

-- ── Discounts ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "discount_codes" (
    "id"               text PRIMARY KEY,
    "store_id"         text NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
    "code"             text NOT NULL,
    "type"             discount_type NOT NULL,
    "value"            numeric(10, 2) NOT NULL,
    "min_order_amount" numeric(10, 2),
    "usage_limit"      integer,
    "usage_count"      integer NOT NULL DEFAULT 0,
    "is_active"        boolean NOT NULL DEFAULT true,
    "expires_at"       timestamp,
    "created_at"       timestamp NOT NULL DEFAULT now()
);

-- ── Orders ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "orders" (
    "id"               text PRIMARY KEY,
    "store_id"         text NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
    "order_number"     text NOT NULL,
    "status"           order_status NOT NULL DEFAULT 'pending',
    "customer_name"    text NOT NULL,
    "customer_phone"   text NOT NULL,
    "customer_email"   text NOT NULL,
    "shipping_address" text NOT NULL,
    "discount_code_id" text REFERENCES "discount_codes"("id"),
    "discount_amount"  numeric(10, 2) NOT NULL DEFAULT '0',
    "subtotal"         numeric(10, 2) NOT NULL,
    "shipping_fee"     numeric(10, 2) NOT NULL DEFAULT '0',
    "tax_amount"       numeric(10, 2) NOT NULL DEFAULT '0',
    "total"            numeric(10, 2) NOT NULL,
    "notes"            text,
    "whatsapp_sent"    boolean NOT NULL DEFAULT false,
    "created_at"       timestamp NOT NULL DEFAULT now(),
    "updated_at"       timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "order_items" (
    "id"            text PRIMARY KEY,
    "order_id"      text NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
    "product_id"    text REFERENCES "products"("id") ON DELETE SET NULL,
    "variant_id"    text REFERENCES "product_variants"("id") ON DELETE SET NULL,
    "product_title" text NOT NULL,
    "variant_label" text,
    "unit_price"    numeric(10, 2) NOT NULL,
    "quantity"      integer NOT NULL,
    "subtotal"      numeric(10, 2) NOT NULL
);

-- ── Reviews ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "reviews" (
    "id"             text PRIMARY KEY,
    "store_id"       text NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
    "product_id"     text NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "reviewer_name"  text NOT NULL,
    "reviewer_email" text,
    "rating"         integer NOT NULL,
    "body"           text,
    "ip"             text,
    "status"         review_status NOT NULL DEFAULT 'pending',
    "created_at"     timestamp NOT NULL DEFAULT now()
);

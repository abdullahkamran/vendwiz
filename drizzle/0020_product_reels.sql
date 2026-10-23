-- Product videos shown in the storefront Reels feed.
CREATE TABLE IF NOT EXISTS "product_reels" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
	"product_id" text NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
	"video_url" text NOT NULL,
	"caption" text,
	"is_published" boolean NOT NULL DEFAULT true,
	"sort_order" integer NOT NULL DEFAULT 0,
	"created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "product_reels_store_id_idx" ON "product_reels" ("store_id", "sort_order");

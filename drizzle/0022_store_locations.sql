-- Physical shops listed under "Our Stores" in the storefront footer: [{ "name": "...", "mapUrl": "https://..." }]
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "store_locations" jsonb NOT NULL DEFAULT '[]'::jsonb;

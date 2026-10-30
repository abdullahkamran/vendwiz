-- Home page slideshow set by the owner: [{ "imageUrl": "<storeId>/slides/<id>.webp", "title": "...", "description": "..." }]
-- Empty array = the slideshow uses product images, as before.
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "hero_slides" jsonb NOT NULL DEFAULT '[]'::jsonb;

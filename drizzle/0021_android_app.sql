-- Optional Android (Trusted Web Activity) app per store. Owners opt in from Admin → Android App.
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "android_app_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "android_package_name" text;
-- SHA-256 signing-certificate fingerprints served in /.well-known/assetlinks.json
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "android_cert_fingerprints" text[] NOT NULL DEFAULT '{}';
-- Guide steps the owner has ticked off
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "android_steps_done" text[] NOT NULL DEFAULT '{}';
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "android_play_url" text;

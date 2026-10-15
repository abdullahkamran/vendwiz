-- History of customer notifications (emails) sent manually from the admin order page.
CREATE TABLE IF NOT EXISTS "order_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
	"channel" text NOT NULL DEFAULT 'email',
	"status" text NOT NULL,
	"recipient" text NOT NULL,
	"result" text NOT NULL,
	"error" text,
	"sent_by_user_id" text,
	"created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "order_notifications_order_id_idx" ON "order_notifications" ("order_id");

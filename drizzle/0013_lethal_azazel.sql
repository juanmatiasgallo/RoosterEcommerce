ALTER TABLE "users" ADD COLUMN "default_shipping_address" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_shipping_zone_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_default_shipping_zone_id_shipping_zones_id_fk" FOREIGN KEY ("default_shipping_zone_id") REFERENCES "public"."shipping_zones"("id") ON DELETE no action ON UPDATE no action;
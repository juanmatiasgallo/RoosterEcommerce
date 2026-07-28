ALTER TABLE "cart_items" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "guest_id" uuid;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_owner_xor" CHECK (("cart_items"."user_id" IS NOT NULL AND "cart_items"."guest_id" IS NULL) OR ("cart_items"."user_id" IS NULL AND "cart_items"."guest_id" IS NOT NULL));
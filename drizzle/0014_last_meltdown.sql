ALTER TABLE "products" ADD COLUMN "specs" jsonb;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "instagram_url" varchar(300);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "facebook_url" varchar(300);
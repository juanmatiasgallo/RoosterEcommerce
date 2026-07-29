CREATE TYPE "public"."product_media_type" AS ENUM('image', 'video');--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "media_type" "product_media_type" DEFAULT 'image' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "technical_specs" jsonb;
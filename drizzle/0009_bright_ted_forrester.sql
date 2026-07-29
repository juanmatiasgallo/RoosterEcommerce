ALTER TYPE "public"."payment_method" ADD VALUE 'mi_dinero';--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'prex';--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "payment_instructions_mi_dinero" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "payment_instructions_prex" text;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_user_unique" UNIQUE("product_id","user_id");
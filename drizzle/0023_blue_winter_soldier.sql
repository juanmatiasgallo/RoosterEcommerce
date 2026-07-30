CREATE TYPE "public"."discount_campaign_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TABLE "discount_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"code" varchar(30) NOT NULL,
	"type" "discount_campaign_type" NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discount_campaigns_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "compare_at_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "discount_campaigns" ADD CONSTRAINT "discount_campaigns_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
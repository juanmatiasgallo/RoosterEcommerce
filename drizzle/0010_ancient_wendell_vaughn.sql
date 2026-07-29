CREATE TABLE "shipping_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"cost" numeric(12, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "legal_name" varchar(200);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "tax_id" varchar(50);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "address" varchar(300);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "department" varchar(100);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "contact_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "contact_email" varchar(255);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "invoice_prefix" varchar(20);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "next_invoice_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "vacation_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "vacation_message" text;--> statement-breakpoint
ALTER TABLE "shipping_zones" ADD CONSTRAINT "shipping_zones_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
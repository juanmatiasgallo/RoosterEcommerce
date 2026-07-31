CREATE TABLE "telegram_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"template" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_templates_store_event_unique" UNIQUE("store_id","event_type")
);
--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "telegram_bot_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "telegram_chat_id" varchar(100);--> statement-breakpoint
ALTER TABLE "telegram_templates" ADD CONSTRAINT "telegram_templates_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
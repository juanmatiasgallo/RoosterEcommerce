ALTER TABLE "stores" ADD COLUMN "mp_access_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "mp_public_key" varchar(200);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "mp_webhook_secret_encrypted" text;
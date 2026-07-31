ALTER TABLE "stores" ADD COLUMN "n8n_webhook_url" varchar(500);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "n8n_webhook_secret_encrypted" text;
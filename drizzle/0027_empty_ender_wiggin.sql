ALTER TABLE "stores" ADD COLUMN "listmonk_url" varchar(300);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "listmonk_api_user" varchar(100);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "listmonk_api_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "listmonk_list_id" varchar(100);
ALTER TABLE "stores" ADD COLUMN "smtp_host" varchar(255);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "smtp_port" integer;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "smtp_user" varchar(255);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "smtp_password_encrypted" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "smtp_from_email" varchar(255);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "smtp_from_name" varchar(200);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "smtp_secure" boolean DEFAULT false NOT NULL;
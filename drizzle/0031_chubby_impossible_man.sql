ALTER TABLE "projects" ADD COLUMN "theme" varchar(40);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;
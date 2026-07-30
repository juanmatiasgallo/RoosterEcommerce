CREATE TYPE "public"."product_inquiry_sender" AS ENUM('cliente', 'empleado');--> statement-breakpoint
CREATE TABLE "product_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_inquiries_product_customer_unique" UNIQUE("product_id","customer_id")
);
--> statement-breakpoint
CREATE TABLE "product_inquiry_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"sender_role" "product_inquiry_sender" NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_inquiries" ADD CONSTRAINT "product_inquiries_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_inquiries" ADD CONSTRAINT "product_inquiries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_inquiries" ADD CONSTRAINT "product_inquiries_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_inquiry_messages" ADD CONSTRAINT "product_inquiry_messages_inquiry_id_product_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."product_inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_inquiry_messages" ADD CONSTRAINT "product_inquiry_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
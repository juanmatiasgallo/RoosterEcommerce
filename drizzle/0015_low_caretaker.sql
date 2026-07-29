CREATE TYPE "public"."loyalty_points_type" AS ENUM('earned', 'redeemed');--> statement-breakpoint
CREATE TABLE "discount_coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"code" varchar(30) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"points_spent" integer NOT NULL,
	"used_at" timestamp,
	"used_order_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discount_coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_product_unique" UNIQUE("user_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "loyalty_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid,
	"type" "loyalty_points_type" NOT NULL,
	"points" integer NOT NULL,
	"note" varchar(300),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pendiente_pago'::text;--> statement-breakpoint
DROP TYPE "public"."order_status";--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pendiente_pago', 'pendiente_confirmacion', 'pagado', 'en_cola', 'imprimiendo', 'postprocesado', 'enviado', 'entregado', 'cancelado');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pendiente_pago'::"public"."order_status";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."order_status" USING "status"::"public"."order_status";--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_sku" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_code" varchar(30);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "loyalty_points_per_100" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "loyalty_point_value" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "discount_coupons" ADD CONSTRAINT "discount_coupons_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_coupons" ADD CONSTRAINT "discount_coupons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_coupons" ADD CONSTRAINT "discount_coupons_used_order_id_orders_id_fk" FOREIGN KEY ("used_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_points" ADD CONSTRAINT "loyalty_points_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_points" ADD CONSTRAINT "loyalty_points_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_points" ADD CONSTRAINT "loyalty_points_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
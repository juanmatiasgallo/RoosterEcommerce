CREATE TYPE "public"."payment_method" AS ENUM('mercado_pago', 'transferencia', 'abitab', 'redpagos');--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'pendiente_confirmacion' BEFORE 'pagado';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_number" serial NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" "payment_method" DEFAULT 'mercado_pago' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "payment_instructions_transferencia" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "payment_instructions_abitab" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "payment_instructions_redpagos" text;
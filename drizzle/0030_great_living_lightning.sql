ALTER TYPE "public"."custom_order_status" ADD VALUE 'vencido' BEFORE 'pagado';--> statement-breakpoint
ALTER TABLE "custom_orders" ADD COLUMN "quote_valid_until" timestamp;
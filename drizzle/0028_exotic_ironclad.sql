-- Codigo publico unico por producto/variante (task #88, "SKU unificado").
-- drizzle-kit genero esto como ADD COLUMN ... NOT NULL directo, lo cual
-- rompe contra filas existentes (sin default). Se reescribe a mano en 3
-- pasos: (1) agregar la columna nullable + la secuencia, (2) backfillear
-- codigo para las filas que ya existan, (3) recien ahi poner NOT NULL +
-- UNIQUE. A partir de esta migracion, createProduct/createVariant generan
-- el codigo solos (ver src/lib/catalog/code.ts) -- este backfill es
-- unicamente para datos ya cargados antes de esta migracion.

ALTER TABLE "products" ADD COLUMN "code" varchar(20);--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "code" varchar(24);--> statement-breakpoint

-- Secuencia que despues usa nextProductCode() (nextval) para cada alta
-- nueva desde la app -- se crea aca en vez de en el codigo de la app para
-- que exista antes de que cualquier INSERT la necesite.
CREATE SEQUENCE IF NOT EXISTS product_code_seq;--> statement-breakpoint

-- Backfill de products.code: PRD-0001, PRD-0002... en el orden en que se
-- crearon (created_at). Sin efecto si la tabla esta vacia.
UPDATE "products" p
SET "code" = 'PRD-' || lpad(sub.rn::text, 4, '0')
FROM (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM "products"
) sub
WHERE p.id = sub.id;--> statement-breakpoint

-- Sincroniza la secuencia para que el proximo nextval() continue justo
-- despues del ultimo codigo backfilleado (si la tabla estaba vacia, arranca
-- en 1 igual).
SELECT setval('product_code_seq', (SELECT COUNT(*) FROM "products"), true);--> statement-breakpoint

-- Backfill de product_variants.code: codigo del producto + sufijo tipo hoja
-- de calculo (A, B, C...) relativo a CADA producto, en el orden de su id.
-- Nota: chr(64+n) solo cubre A-Z (hasta 26 variantes por producto) -- ok
-- para el volumen actual (el seed original tiene 3 variantes en 1
-- producto). Las variantes creadas DESPUES de esta migracion usan
-- nextVariantCode() en la app, que si soporta mas de 26 (AA, AB...).
UPDATE "product_variants" v
SET "code" = p.code || '-' || chr((64 + sub.rn)::int)
FROM (
  SELECT id, product_id, row_number() OVER (PARTITION BY product_id ORDER BY id) AS rn
  FROM "product_variants"
) sub
JOIN "products" p ON p.id = sub.product_id
WHERE v.id = sub.id;--> statement-breakpoint

ALTER TABLE "products" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_code_unique" UNIQUE("code");--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_code_unique" UNIQUE("code");

import { count, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { productVariants } from "@/lib/db/schema";

// Codigo publico de producto: PRD-0001, PRD-0002... (task #88, "SKU
// unificado"). Se apoya en la secuencia de Postgres `product_code_seq`
// (creada en la migracion junto con la columna) para que la asignacion sea
// atomica incluso con altas concurrentes -- a diferencia de un COUNT()+1 en
// JS, nextval() nunca repite un numero aunque dos requests lleguen al mismo
// tiempo. Se usa como expresion SQL cruda dentro del propio INSERT (ver
// createProduct en catalog/actions.ts), mismo patron que otros usos de
// `sql` inline ya existentes en el repo (ej. incremento atomico de stock en
// orders/mark-paid.ts) -- no hace falta un select previo ni una transaccion
// aparte.
export const NEXT_PRODUCT_CODE_SQL = sql`'PRD-' || lpad(nextval('product_code_seq')::text, 4, '0')`;

// Sufijo tipo hoja de calculo: 0->A, 1->B, ..., 25->Z, 26->AA, 27->AB...
// Se usa para el codigo de variante (jerarquico: codigo del producto +
// sufijo), sin techo de 26 variantes por producto.
function suffixFromIndex(index: number): string {
  let n = index;
  let result = "";
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}

// Codigo de variante: codigo del producto + sufijo relativo a cuantas
// variantes ya tiene ESE producto (no una secuencia global). Se calcula con
// un COUNT() en vez de nextval() porque el sufijo depende del producto, no
// es un contador unico por tienda -- riesgo de carrera aceptado: alta de
// variantes es una accion manual desde el panel admin, no un flujo de alto
// trafico concurrente.
export async function nextVariantCode(productId: string, productCode: string): Promise<string> {
  const [row] = await db
    .select({ total: count() })
    .from(productVariants)
    .where(eq(productVariants.productId, productId));
  return `${productCode}-${suffixFromIndex(row?.total ?? 0)}`;
}

import { db } from "./index";
import { stores } from "./schema";

let cachedStoreId: string | undefined;

/**
 * Multi-tenant no esta activado todavia: hoy existe una unica fila en
 * `stores`. Las queries publicas de catalogo (sin sesion) necesitan igual
 * filtrar por storeId (regla sin excepcion de CLAUDE.md), asi que resuelven
 * el id de esa fila unica con este helper en vez de asumir un valor fijo.
 */
export async function getDefaultStoreId(): Promise<string> {
  if (cachedStoreId) return cachedStoreId;

  const [store] = await db.select({ id: stores.id }).from(stores).limit(1);
  if (!store) {
    throw new Error("No hay ninguna tienda creada todavia (tabla stores vacia).");
  }

  cachedStoreId = store.id;
  return cachedStoreId;
}

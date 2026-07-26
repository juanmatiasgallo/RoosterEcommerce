import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = PostgresJsDatabase<typeof schema>;

// globalThis (no una variable de modulo) para que el pool sobreviva al Fast
// Refresh de "next dev": una variable de modulo comun se resetearia en cada
// recarga, abriendo un pool de postgres.js nuevo por recarga sin cerrar los
// anteriores. Mismo patron que ChickenHouseContab.
declare global {
  // eslint-disable-next-line no-var
  var __db__: DB | undefined;
}

function getDb(): DB {
  if (globalThis.__db__) return globalThis.__db__;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no esta definida. Revisa tu archivo .env.");
  }

  const queryClient = postgres(process.env.DATABASE_URL);
  globalThis.__db__ = drizzle(queryClient, { schema });
  return globalThis.__db__;
}

/**
 * Proxy perezoso: la conexion real (y la validacion de DATABASE_URL) se crea
 * recien en el primer uso, no al importar el modulo. Esto evita que
 * `next build` falle al recolectar metadata de rutas que importan la base
 * sin necesitar conectarse.
 */
export const db: DB = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

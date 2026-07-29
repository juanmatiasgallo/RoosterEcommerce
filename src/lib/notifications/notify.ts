// Sin "use server": es un helper interno que importan otras Server Actions
// (orders/actions.ts, custom-orders/actions.ts, mark-paid.ts), no algo que
// el cliente llame directo — mismo patron que mark-paid.ts.
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

// Nunca bloquea el flujo principal si falla (mismo criterio de resiliencia
// que sendMail): una notificacion in-app que no se pudo guardar no puede
// tirar abajo la creacion de una orden.
export async function notify(params: {
  storeId: string;
  recipientUserId?: string | null;
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  try {
    await db.insert(notifications).values({
      storeId: params.storeId,
      recipientUserId: params.recipientUserId ?? null,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
    });
  } catch {
    // No-op.
  }
}

// Atajo para el caso mas comun: avisar a todo el staff de la tienda (no a
// un cliente puntual) — recipientUserId queda nulo.
export async function notifyStaff(params: {
  storeId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  await notify({ ...params, recipientUserId: null });
}

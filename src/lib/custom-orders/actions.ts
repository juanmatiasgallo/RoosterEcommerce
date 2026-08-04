"use server";

import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/auth";
import type { Role } from "@/lib/auth/schema";
import { db } from "@/lib/db";
import { auditLogs, customOrders, orderItems, orders, users } from "@/lib/db/schema";
import { formatCurrency } from "@/lib/format";
import { sendMail } from "@/lib/mail";
import { getEmailTemplateForSending } from "@/lib/email-templates/render";
import { createPreference } from "@/lib/mercadopago/client";
import { getAvailableManualPaymentMethods, type ManualPaymentMethod, type PaymentMethod } from "@/lib/orders/actions";
import { getVacationStatus } from "@/lib/settings/actions";
import { notify, notifyStaff } from "@/lib/notifications/notify";
import { contentTypeForExtension, resolveFileUrl, uploadToStorage } from "@/lib/storage";
import { CUSTOM_ORDER_ALLOWED_EXTENSIONS, createCustomOrderSchema, quoteCustomOrderSchema } from "./schema";

const STAFF_ROLES: Role[] = ["admin", "empleado"];

async function requireUser() {
  const session = await auth();
  if (!session) throw new Error("Debes iniciar sesion.");
  return session;
}

async function requireStaff() {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role)) {
    throw new Error("No autorizado.");
  }
  return session;
}

async function logAudit(params: {
  userId: string;
  storeId: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  await db.insert(auditLogs).values({
    storeId: params.storeId,
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    before: params.before ?? null,
    after: params.after ?? null,
  });
}

// Perezoso, sin cron aparte (task #152): se corre en cada lectura de pedidos
// a medida (getMyCustomOrders / listCustomOrdersForAdmin), no hay un job de
// fondo -- coherente con "gastos operativos = solo el VPS" del proyecto. Un
// storeId opcional acota la busqueda cuando ya se conoce (lecturas de
// admin); getMyCustomOrders no lo pasa porque ya filtra por userId.
async function expireStaleQuotes(storeId?: string) {
  const conditions = [eq(customOrders.status, "cotizado"), lt(customOrders.quoteValidUntil, new Date())];
  if (storeId) conditions.push(eq(customOrders.storeId, storeId));

  const expired = await db
    .update(customOrders)
    .set({ status: "vencido" })
    .where(and(...conditions))
    .returning({ id: customOrders.id, storeId: customOrders.storeId, userId: customOrders.userId, fileName: customOrders.fileName });

  for (const order of expired) {
    await logAudit({
      userId: order.userId,
      storeId: order.storeId,
      action: "expire",
      entityType: "custom_order",
      entityId: order.id,
      after: { status: "vencido" },
    });
  }
}

export async function createCustomOrder(input: z.infer<typeof createCustomOrderSchema>, file: File) {
  const session = await requireUser();
  const data = createCustomOrderSchema.parse(input);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!CUSTOM_ORDER_ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Extension no permitida. Usa: ${CUSTOM_ORDER_ALLOWED_EXTENSIONS.join(", ")}.`);
  }

  const maxSizeMb = Number(process.env.UPLOADS_MAX_SIZE_MB ?? 20);
  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`El archivo supera el tamano maximo permitido (${maxSizeMb} MB).`);
  }

  // Nombre generado server-side (nunca el original del cliente) para evitar
  // path traversal y colisiones, mismo criterio que uploadProductImage en
  // catalog/actions.ts. El nombre original se guarda aparte solo para mostrar.
  //
  // El id se genera aca (en vez de dejar que Postgres lo autogenere con
  // defaultRandom()) porque la key del objeto en MinIO necesita el id del
  // pedido *antes* de insertar la fila -- mismo criterio de key con "carpeta
  // por pedido" que uploadPaymentReceipt en orders/actions.ts.
  const customOrderId = randomUUID();
  const filename = `${randomUUID()}.${ext}`;
  const objectKey = `custom-orders/${customOrderId}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadToStorage(objectKey, buffer, contentTypeForExtension(ext));

  const [created] = await db
    .insert(customOrders)
    .values({
      id: customOrderId,
      storeId: session.user.storeId,
      userId: session.user.id,
      fileUrl: objectKey,
      fileName: file.name.slice(0, 255),
      material: data.material,
      color: data.color,
      quantity: data.quantity,
      approxSize: data.approxSize,
      notes: data.notes,
    })
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "create",
    entityType: "custom_order",
    entityId: created.id,
    after: created,
  });

  await notifyStaff({
    storeId: session.user.storeId,
    type: "new_custom_order",
    title: `Nuevo pedido a medida: ${created.fileName}`,
    link: "/admin/pedidos-custom",
  });

  revalidatePath("/mi-cuenta/pedidos");
  revalidatePath("/admin/pedidos-custom");
  return created;
}

// Lectura scoped al usuario logueado (no hay lectura publica de pedidos a
// medida), asi que vive junto a las mutaciones guardadas de este archivo,
// mismo criterio que getCartItems en cart/actions.ts.
export async function getMyCustomOrders() {
  const session = await requireUser();

  // Antes de leer: si alguna cotizacion propia ya paso su "valido hasta" sin
  // pagarse, pasarla a "vencido" -- asi el badge que ve el cliente siempre
  // refleja el estado real, no importa cuando haya sido la ultima vez que
  // alguien miro este pedido.
  await expireStaleQuotes(session.user.storeId);

  // Left join a la orden real (si ya se pago): customOrders.status se queda
  // fijo en "pagado" para siempre (el pipeline de impresion fino vive en
  // orders.status, ver src/lib/orders/actions.ts) — sin este join la pantalla
  // de "Mis pedidos" no podria mostrar el progreso real despues del pago.
  const rows = await db
    .select({
      customOrder: customOrders,
      linkedOrderId: orders.id,
      linkedOrderStatus: orders.status,
      linkedOrderNumber: orders.orderNumber,
    })
    .from(customOrders)
    .leftJoin(orders, eq(orders.customOrderId, customOrders.id))
    .where(eq(customOrders.userId, session.user.id))
    .orderBy(desc(customOrders.createdAt));

  // fileUrl y quotePdfUrl pueden ser una key de MinIO -- resolver a URL
  // firmada aca (ver resolveFileUrl en lib/storage), mismo criterio que
  // listOrdersForAdmin en orders/actions.ts.
  return Promise.all(
    rows.map(async (row) => ({
      ...row.customOrder,
      fileUrl: (await resolveFileUrl(row.customOrder.fileUrl)) ?? row.customOrder.fileUrl,
      quotePdfUrl: row.customOrder.quotePdfUrl ? await resolveFileUrl(row.customOrder.quotePdfUrl) : null,
      linkedOrderId: row.linkedOrderId,
      linkedOrderStatus: row.linkedOrderStatus,
      linkedOrderNumber: row.linkedOrderNumber,
    })),
  );
}

export type CustomOrderRow = Awaited<ReturnType<typeof getMyCustomOrders>>[number];

// Lectura para el panel admin: pendientes + cotizados de la tienda del staff
// logueado. La pagina original solo traia "pendiente" directo con un select
// suelto (sin filtrar storeId); esto lo reemplaza siguiendo el mismo patron
// guardado que el resto de las lecturas de admin (listProductsForAdmin, etc).
export async function listCustomOrdersForAdmin() {
  const session = await requireStaff();

  // Mismo criterio que getMyCustomOrders: las cotizaciones vencidas de esta
  // tienda pasan a "vencido" antes de leer, asi salen solas de este listado
  // (que solo trae "pendiente"/"cotizado") sin que el admin tenga que hacer
  // nada.
  await expireStaleQuotes(session.user.storeId);

  const rows = await db
    .select()
    .from(customOrders)
    .where(
      and(
        eq(customOrders.storeId, session.user.storeId),
        inArray(customOrders.status, ["pendiente", "cotizado"]),
      ),
    )
    .orderBy(desc(customOrders.createdAt));

  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      fileUrl: (await resolveFileUrl(row.fileUrl)) ?? row.fileUrl,
      quotePdfUrl: row.quotePdfUrl ? await resolveFileUrl(row.quotePdfUrl) : null,
    })),
  );
}

// Tipo propio (distinto de CustomOrderRow): esta lectura no tiene el join a
// `orders` de getMyCustomOrders (pendiente/cotizado todavia no tienen una
// orden real vinculada), asi que no trae linkedOrderStatus/linkedOrderNumber.
export type AdminCustomOrderRow = Awaited<ReturnType<typeof listCustomOrdersForAdmin>>[number];

// PDF opcional: el precio (quotedPrice) sigue siendo el unico dato que el
// sistema usa para cobrar -- este archivo es solo el presupuesto detallado
// que el admin arma en ChickenHouseContab (otra app de facturacion), para
// que el cliente lo pueda ver/descargar junto a la cotizacion.
export async function quoteCustomOrder(
  id: string,
  input: z.infer<typeof quoteCustomOrderSchema>,
  quoteFile?: File | null,
) {
  const session = await requireStaff();
  const data = quoteCustomOrderSchema.parse(input);

  const [existing] = await db
    .select()
    .from(customOrders)
    .where(and(eq(customOrders.id, id), eq(customOrders.storeId, session.user.storeId)))
    .limit(1);
  if (!existing) throw new Error("Pedido a medida no encontrado.");

  // Solo se cotiza una vez desde "pendiente": evita pisar una cotizacion ya
  // hecha (o peor, una orden que ya esta pagada) con un click de mas.
  if (existing.status !== "pendiente") {
    throw new Error(`Este pedido ya esta en estado "${existing.status}", no se puede volver a cotizar.`);
  }

  // Plazo del presupuesto (task #152), opcional. Fin del dia elegido (23:59)
  // para que "valido hasta hoy" no venza apenas se guarda -- mismo criterio
  // que un vencimiento de tarjeta o cupon.
  let quoteValidUntil: Date | undefined;
  if (data.quoteValidUntil) {
    const parsed = new Date(`${data.quoteValidUntil}T23:59:59`);
    if (Number.isNaN(parsed.getTime())) throw new Error("Fecha de vencimiento invalida.");
    if (parsed.getTime() < Date.now()) throw new Error("La fecha de vencimiento no puede ser en el pasado.");
    quoteValidUntil = parsed;
  }

  let quotePdfUrl: string | undefined;
  let quotePdfName: string | undefined;
  if (quoteFile && quoteFile.size > 0) {
    const ext = quoteFile.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext !== "pdf") throw new Error("El presupuesto adjunto tiene que ser un PDF.");

    const maxSizeMb = Number(process.env.UPLOADS_MAX_SIZE_MB ?? 20);
    if (quoteFile.size > maxSizeMb * 1024 * 1024) {
      throw new Error(`El archivo supera el tamano maximo permitido (${maxSizeMb} MB).`);
    }

    // Key con el id del pedido como "carpeta", mismo criterio que fileUrl en
    // createCustomOrder de arriba.
    const objectKey = `custom-orders/${id}/quote-${randomUUID()}.pdf`;
    const buffer = Buffer.from(await quoteFile.arrayBuffer());
    await uploadToStorage(objectKey, buffer, contentTypeForExtension("pdf"));
    quotePdfUrl = objectKey;
    quotePdfName = quoteFile.name.slice(0, 255);
  }

  const [updated] = await db
    .update(customOrders)
    .set({
      quotedPrice: data.quotedPrice.toFixed(2),
      quotedNotes: data.quotedNotes,
      quotedAt: new Date(),
      status: "cotizado",
      quoteValidUntil: quoteValidUntil ?? null,
      ...(quotePdfUrl && { quotePdfUrl, quotePdfName }),
    })
    .where(eq(customOrders.id, id))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "quote",
    entityType: "custom_order",
    entityId: id,
    before: existing,
    after: updated,
  });

  revalidatePath("/mi-cuenta/pedidos");
  revalidatePath("/admin/pedidos-custom");

  // El mail es un efecto secundario: la cotizacion ya quedo guardada en la
  // DB arriba, asi que si el envio falla (SMTP no configurado, error de
  // conexion, lo que sea) no revierte ni bloquea la operacion — solo se
  // informa en el resultado para que el admin lo sepa.
  let emailSent = false;
  try {
    const [customer] = await db.select({ email: users.email }).from(users).where(eq(users.id, existing.userId)).limit(1);

    if (customer) {
      const myOrdersUrl = `${process.env.AUTH_URL ?? ""}/mi-cuenta/pedidos`;
      const notesLine = [
        updated.quotedNotes ? `Notas: ${updated.quotedNotes}` : null,
        updated.quotePdfUrl ? "Te dejamos el presupuesto detallado en PDF, disponible en tu cuenta." : null,
      ]
        .filter((line): line is string => Boolean(line))
        .join(" ");
      const vars = {
        fileName: updated.fileName,
        price: formatCurrency(Number(updated.quotedPrice)),
        notesLine,
        myOrdersUrl,
      };
      const rendered = await getEmailTemplateForSending(session.user.storeId, "custom_order_quoted", vars);

      if (rendered.enabled) {
        const result = await sendMail({
          storeId: session.user.storeId,
          to: customer.email,
          subject: rendered.subject,
          text: `Tu pedido a medida "${updated.fileName}" ya tiene cotizacion: ${vars.price}. ${notesLine} Ver en: ${myOrdersUrl}`,
          html: rendered.html,
        });
        emailSent = result.status === "sent";
      } else {
        emailSent = false;
      }
    }
  } catch {
    emailSent = false;
  }

  await notify({
    storeId: session.user.storeId,
    recipientUserId: existing.userId,
    type: "custom_order_quoted",
    title: `Tu pedido a medida "${updated.fileName}" ya tiene cotizacion`,
    link: "/mi-cuenta/pedidos",
  });

  return { ...updated, emailSent };
}

// El cliente decide activamente que no le interesa una cotizacion (boton
// "No me interesa" en /mi-cuenta/pedidos, task #152) -- distinto del
// vencimiento automatico por fecha (expireStaleQuotes), aunque ambos
// terminan en el mismo status "cancelado" (ver comentario en el enum,
// db/schema.ts): el admin ya puede distinguir por status "vencido" vs
// "cancelado" cual paso en cada caso.
export async function declineCustomOrderQuote(id: string) {
  const session = await requireUser();

  const [existing] = await db
    .select()
    .from(customOrders)
    .where(and(eq(customOrders.id, id), eq(customOrders.userId, session.user.id)))
    .limit(1);
  if (!existing) throw new Error("Pedido a medida no encontrado.");

  if (existing.status !== "cotizado") {
    throw new Error(`Este pedido esta en estado "${existing.status}", no se puede rechazar.`);
  }

  const [updated] = await db
    .update(customOrders)
    .set({ status: "cancelado" })
    .where(eq(customOrders.id, id))
    .returning();

  await logAudit({
    userId: session.user.id,
    storeId: session.user.storeId,
    action: "decline_quote",
    entityType: "custom_order",
    entityId: id,
    before: existing,
    after: updated,
  });

  await notifyStaff({
    storeId: session.user.storeId,
    type: "custom_order_declined",
    title: `El cliente rechazo la cotizacion de "${updated.fileName}"`,
    link: "/admin/pedidos-custom",
  });

  revalidatePath("/mi-cuenta/pedidos");
  revalidatePath("/admin/pedidos-custom");

  return updated;
}

// Paso 4 de docs/spec-ecommerce-base.md, extendido con medios de pago
// manuales (mismo criterio que checkoutCart en src/lib/orders/actions.ts):
// crea (o reutiliza) la orden source="pedido_custom" ligada a esta
// cotizacion. Con "mercado_pago" genera la preferencia y devuelve el link
// de pago; con un medio manual, la orden queda "pendiente_confirmacion"
// como orden de servicio y se manda el mail con instrucciones + numero de
// orden — un admin la confirma a mano cuando el pago llega.
export async function initiateCustomOrderPayment(id: string, paymentMethod: PaymentMethod = "mercado_pago") {
  const session = await requireUser();

  const vacation = await getVacationStatus();
  if (vacation.vacationMode) {
    throw new Error(vacation.vacationMessage || "La tienda no esta recibiendo pedidos en este momento.");
  }

  const [existing] = await db
    .select()
    .from(customOrders)
    .where(and(eq(customOrders.id, id), eq(customOrders.userId, session.user.id)))
    .limit(1);
  if (!existing) throw new Error("Pedido a medida no encontrado.");

  if (existing.status !== "cotizado") {
    throw new Error("Este pedido todavia no tiene una cotizacion lista para pagar.");
  }
  if (!existing.quotedPrice) {
    throw new Error("Este pedido no tiene un precio cotizado valido.");
  }
  // Defensa en profundidad (task #152): expireStaleQuotes ya deberia haber
  // pasado este pedido a "vencido" en la lectura previa (getMyCustomOrders),
  // pero esta accion se puede invocar directo -- nunca confiar solo en que
  // el cliente vio el estado actualizado antes de clickear "Pagar".
  if (existing.quoteValidUntil && existing.quoteValidUntil.getTime() < Date.now()) {
    await db.update(customOrders).set({ status: "vencido" }).where(eq(customOrders.id, id));
    throw new Error("Esta cotizacion vencio. Pedile al admin que te cotice de nuevo.");
  }

  let manualMethod: { value: ManualPaymentMethod; label: string; instructions: string } | undefined;
  if (paymentMethod !== "mercado_pago") {
    const available = await getAvailableManualPaymentMethods(session.user.storeId);
    manualMethod = available.find((method) => method.value === paymentMethod);
    if (!manualMethod) throw new Error("Ese medio de pago no esta disponible.");
  }

  // Si el cliente ya habia clickeado "Pagar" antes sin completar el pago,
  // reutiliza esa misma orden pendiente en vez de crear una nueva cada vez
  // (evita acumular ordenes duplicadas por el mismo pedido). Si cambio de
  // medio de pago respecto del intento anterior, se sigue usando la orden
  // ya creada tal cual estaba (no se pisa el metodo elegido la primera vez).
  const [existingOrder] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.customOrderId, existing.id),
        inArray(orders.status, ["pendiente_pago", "pendiente_confirmacion"]),
      ),
    )
    .limit(1);

  const itemTitle = `Pedido a medida: ${existing.fileName}`;

  const order =
    existingOrder ??
    (
      await db
        .insert(orders)
        .values({
          storeId: session.user.storeId,
          userId: session.user.id,
          source: "pedido_custom",
          customOrderId: existing.id,
          status: manualMethod ? "pendiente_confirmacion" : "pendiente_pago",
          paymentMethod,
          total: existing.quotedPrice,
        })
        .returning()
    )[0];

  if (!existingOrder) {
    // quotedPrice es el precio total ya cotizado por el admin para todo el
    // pedido (no un precio unitario) — por eso quantity: 1 aca, aunque
    // existing.quantity sea otro numero (esa es la cantidad de piezas que
    // ya quedo reflejada en el precio cotizado).
    await db.insert(orderItems).values({
      orderId: order.id,
      variantId: null,
      productName: itemTitle,
      variantLabel: [existing.material, existing.color, existing.approxSize].filter(Boolean).join(" ") || null,
      unitPrice: existing.quotedPrice,
      quantity: 1,
    });

    await logAudit({
      userId: session.user.id,
      storeId: session.user.storeId,
      action: "create",
      entityType: "order",
      entityId: order.id,
      after: order,
    });

    await notifyStaff({
      storeId: session.user.storeId,
      type: manualMethod ? "new_service_order" : "new_order",
      title: manualMethod
        ? `Nueva orden de servicio #${order.orderNumber} (pedido a medida)`
        : `Nuevo pedido #${order.orderNumber} (pedido a medida)`,
      link: "/admin/pedidos",
    });
  }

  if (manualMethod) {
    // Mail con las instrucciones + numero de orden, mismo criterio de
    // resiliencia que el mail de cotizacion de arriba: si falla, no
    // bloquea nada (la orden ya quedo guardada). Solo se manda la primera
    // vez (orden nueva), no en cada click de "Pagar" sobre la misma orden
    // ya existente.
    if (!existingOrder && session.user.email) {
      try {
        // Link directo al comprobante (mismo criterio que getReceiptUrl en
        // receipt/pdf.ts): antes esta orden no tenia ninguna pagina donde
        // subir el comprobante (getReceiptData excluia source=pedido_custom
        // a proposito), asi que el mail solo decia "anda a /mi-cuenta/pedidos"
        // sin explicar el siguiente paso. Ahora /mi-cuenta/compras/[id] ya
        // acepta esta orden y tiene el widget de subida (ver ReceiptUpload).
        const receiptLink = `${process.env.AUTH_URL ?? ""}/mi-cuenta/compras/${order.id}`;
        const vars = {
          orderNumber: String(order.orderNumber),
          total: formatCurrency(Number(order.total)),
          methodLabel: manualMethod.label,
          instructions: manualMethod.instructions,
          receiptUrl: receiptLink,
        };
        const rendered = await getEmailTemplateForSending(session.user.storeId, "manual_payment_instructions", vars);

        if (rendered.enabled) {
          await sendMail({
            storeId: session.user.storeId,
            to: session.user.email,
            subject: rendered.subject,
            text: `Orden #${order.orderNumber} por ${vars.total}. ${manualMethod.instructions} Subi el comprobante en: ${receiptLink}`,
            html: rendered.html,
          });
        }
      } catch {
        // No se relanza: un mail que falla no puede tirar abajo la orden.
      }
    }

    return {
      type: "manual" as const,
      orderId: order.id,
      orderNumber: order.orderNumber,
      methodLabel: manualMethod.label,
      instructions: manualMethod.instructions,
    };
  }

  const preference = await createPreference({
    orderId: order.id,
    storeId: session.user.storeId,
    items: [{ title: itemTitle, quantity: 1, unitPrice: Number(existing.quotedPrice) }],
    payerEmail: session.user.email ?? undefined,
  });

  const initPoint = preference.init_point ?? preference.sandbox_init_point;
  if (!initPoint) throw new Error("No se pudo generar el link de pago.");

  await db.update(orders).set({ mpPreferenceId: preference.id }).where(eq(orders.id, order.id));

  return { type: "mercado_pago" as const, initPoint };
}

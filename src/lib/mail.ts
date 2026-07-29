import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";

export type SendMailResult = { status: "sent" } | { status: "not_configured" } | { status: "error"; error: string };

/**
 * Helper compartido de mail: arma el transporter leyendo la config SMTP de
 * la tienda (misma logica que antes vivia duplicada en sendTestEmail de
 * settings/actions.ts). Cualquier flujo que quiera mandar un mail (el test
 * de configuracion, la notificacion de cotizacion, lo que venga despues)
 * pasa por aca.
 *
 * Nunca tira excepcion por falta de config: devuelve "not_configured" para
 * que quien llama (ej. quoteCustomOrder) pueda seguir su flujo principal
 * sin que un email opcional lo rompa.
 */
export async function sendMail(params: {
  storeId: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  // Adjuntos opcionales (ej. el PDF del comprobante de compra, ver
  // src/lib/receipt/pdf.ts) — content en Buffer, nodemailer lo maneja
  // directo sin pasar por disco.
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}): Promise<SendMailResult> {
  const [store] = await db.select().from(stores).where(eq(stores.id, params.storeId)).limit(1);
  if (!store) {
    return { status: "error", error: "Tienda no encontrada." };
  }

  if (!store.smtpHost || !store.smtpPort || !store.smtpUser || !store.smtpPasswordEncrypted || !store.smtpFromEmail) {
    return { status: "not_configured" };
  }

  let password: string;
  try {
    password = decrypt(store.smtpPasswordEncrypted);
  } catch {
    // No se loguea el error real: podria arrastrar detalles del payload
    // encriptado. La contrasena nunca sale de esta funcion en texto plano.
    return { status: "error", error: "No se pudo desencriptar la contrasena SMTP guardada." };
  }

  const transporter = nodemailer.createTransport({
    host: store.smtpHost,
    port: store.smtpPort,
    secure: store.smtpSecure,
    auth: { user: store.smtpUser, pass: password },
  });

  try {
    await transporter.sendMail({
      from: store.smtpFromName ? `"${store.smtpFromName}" <${store.smtpFromEmail}>` : store.smtpFromEmail,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      attachments: params.attachments,
    });
    return { status: "sent" };
  } catch (error) {
    // Se devuelve solo el mensaje (nunca el objeto de error completo ni la
    // config del transporter) — nada de esto se loguea con console.*, asi
    // que la contrasena nunca queda en ningun log del server.
    const message = error instanceof Error ? error.message : "Error desconocido al enviar el email.";
    return { status: "error", error: message };
  }
}

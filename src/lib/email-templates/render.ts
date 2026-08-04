// Sin "use server": a diferencia de actions.ts (que expone el CRUD
// admin-gated para /admin/configuracion), esto es un modulo de servidor
// interno -- lo importan mark-paid.ts, orders/actions.ts, custom-orders/actions.ts
// e inquiries/actions.ts para resolver que HTML/subject mandar en cada mail,
// sin exponer un endpoint RPC nuevo que devuelva el HTML de las plantillas
// sin pasar por el guard de admin (mismo criterio que markOrderAsPaid en
// orders/mark-paid.ts).
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import { EMAIL_EVENT_TYPES, renderEmailTemplate, type EmailEventType } from "./event-types";

// Resuelve el subject+html ya renderizados (placeholders reemplazados) para
// un evento puntual. Si la tienda todavia no tiene esa fila en
// email_templates (nunca abrio el editor, o es un evento nuevo agregado
// despues), usa el default hardcodeado de EMAIL_EVENT_TYPES -- nunca falla
// por falta de config, mismo espiritu que sendMail() con SMTP no configurado.
export async function getEmailTemplateForSending(
  storeId: string,
  eventType: EmailEventType,
  vars: Record<string, string>,
): Promise<{ enabled: boolean; subject: string; html: string }> {
  const def = EMAIL_EVENT_TYPES.find((d) => d.type === eventType);
  if (!def) throw new Error(`Tipo de evento de mail desconocido: ${eventType}`);

  const [row] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.storeId, storeId), eq(emailTemplates.eventType, eventType)))
    .limit(1);

  const enabled = row?.enabled ?? def.defaultEnabled;
  const subjectTemplate = row?.subject ?? def.defaultSubject;
  const htmlTemplate = row?.html ?? def.defaultHtml;

  return {
    enabled,
    subject: renderEmailTemplate(subjectTemplate, vars),
    html: renderEmailTemplate(htmlTemplate, vars),
  };
}

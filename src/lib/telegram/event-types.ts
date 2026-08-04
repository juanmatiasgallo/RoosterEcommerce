// Sin "use server": son definiciones puras (const array + una funcion sin
// efectos secundarios), no algo que el cliente invoque como Server Action.
// Mismo criterio que src/lib/orders/receipt-eligibility.ts.
import { escapeHtml } from "@/lib/mail-template";

// Los primeros 5 tipos son exactamente los `type` que ya usan los 5
// call sites existentes de notifyStaff() (ver notify.ts) -- asi sumar
// Telegram no requiere tocar esos call sites. payment_rejected es una
// sugerencia nuestra: hoy el webhook de Mercado Pago no avisa nada cuando
// un pago se rechaza/cancela, y eso puede ser una señal util (varios
// rechazos seguidos = puede haber un problema con el medio de pago, no solo
// con la tarjeta del cliente puntual). Arranca apagado porque puede ser
// ruidoso -- es normal que pase seguido en cualquier ecommerce.
export type TelegramEventType =
  | "new_order"
  | "new_service_order"
  | "receipt_uploaded"
  | "new_custom_order"
  | "product_question"
  | "payment_rejected";

export type TelegramEventTypeDef = {
  type: TelegramEventType;
  label: string;
  description: string;
  defaultEnabled: boolean;
  defaultTemplate: string;
};

export const TELEGRAM_EVENT_TYPES: TelegramEventTypeDef[] = [
  {
    type: "new_order",
    label: "Pedido nuevo (Mercado Pago)",
    description: "Se crea la orden y el pago queda pendiente de confirmar por webhook.",
    defaultEnabled: true,
    defaultTemplate: '🛒 <b>{{title}}</b>\n{{body}}\n\n<a href="{{link}}">Ver en el panel</a>',
  },
  {
    type: "new_service_order",
    label: "Pedido nuevo (pago manual)",
    description: "Transferencia, Abitab, Red Pagos, etc. -- todavia sin confirmar.",
    defaultEnabled: true,
    defaultTemplate: '🧾 <b>{{title}}</b>\n{{body}}\n\n<a href="{{link}}">Ver en el panel</a>',
  },
  {
    type: "receipt_uploaded",
    label: "Comprobante subido",
    description: "El cliente subio el comprobante de un pago manual, falta verificarlo.",
    defaultEnabled: true,
    defaultTemplate: '📎 <b>{{title}}</b>\n\n<a href="{{link}}">Verificar pago</a>',
  },
  {
    type: "new_custom_order",
    label: "Pedido a medida enviado",
    description: "El cliente subio un archivo 3D pidiendo cotizacion.",
    defaultEnabled: true,
    defaultTemplate: '🧊 <b>{{title}}</b>\n\n<a href="{{link}}">Cotizar</a>',
  },
  {
    type: "product_question",
    label: "Pregunta de cliente sobre un producto",
    description: "Consulta privada de un cliente sobre un producto puntual.",
    defaultEnabled: true,
    defaultTemplate: '❓ <b>{{title}}</b>\n{{body}}\n\n<a href="{{link}}">Responder</a>',
  },
  {
    type: "payment_rejected",
    label: "Pago rechazado o cancelado (Mercado Pago)",
    description:
      "Sugerencia agregada por Claude, no pedida explicitamente. Puede ser ruidoso (pasa seguido en cualquier ecommerce), por eso arranca apagado -- pero sirve para detectar patrones si se repite mucho en poco tiempo.",
    defaultEnabled: false,
    defaultTemplate: "⚠️ <b>{{title}}</b>\n{{body}}",
  },
];

export const TELEGRAM_PLACEHOLDER_HELP =
  'Variables disponibles: {{title}}, {{body}}, {{link}}, {{storeName}}. HTML soportado por Telegram: <b>negrita</b>, <i>cursiva</i>, <u>subrayado</u>, <a href="">link</a>, <code>codigo</code>.';

// Reemplazo simple de placeholders, sin libreria de templating -- alcanza
// para el caso de uso (4 variables fijas) y evita sumar una dependencia
// nueva (CLAUDE.md: gastos operativos = solo el VPS).
//
// Auditoria de seguridad (#184): se manda con parse_mode "HTML" (ver
// send.ts / actions.ts) y la plantilla en si puede traer tags reales
// (<b>, <a href="">, etc. -- ver TELEGRAM_PLACEHOLDER_HELP). {{body}} en
// particular puede venir de texto que escribio un cliente (ej. el mensaje
// de una pregunta de producto, ver notifyStaff en inquiries/actions.ts) --
// sin escapar, un cliente podia mandar HTML/tags invalidos ahi y romper el
// aviso al staff, o meter un link con texto enganoso tipo phishing dirigido
// al empleado que lee la notificacion. Se escapa igual que en los mails
// (mismo escapeHtml).
export function renderTelegramTemplate(
  template: string,
  vars: { title: string; body?: string | null; link?: string | null; storeName: string },
): string {
  return template
    .replaceAll("{{title}}", escapeHtml(vars.title))
    .replaceAll("{{body}}", escapeHtml(vars.body ?? ""))
    .replaceAll("{{link}}", escapeHtml(vars.link ?? ""))
    .replaceAll("{{storeName}}", escapeHtml(vars.storeName));
}

// Sin "use server": definiciones puras, mismo criterio que
// src/lib/telegram/event-types.ts (que este archivo copia el patron de casi
// al pie de la letra).
//
// Cada tipo de evento define su HTML por default llamando a los mismos
// helpers de src/lib/mail-template.ts que ya se usaban hardcodeados en cada
// call site (mark-paid.ts, orders/actions.ts, etc.) -- pero en vez de pasar
// datos reales, se pasan los placeholders {{...}} como si fueran el string
// real. El resultado es un HTML ya armado y con la identidad visual de
// marca, con los tokens en el lugar exacto donde van a quedar los datos
// reales al mandar el mail -- asi el admin ve/edita exactamente el mismo
// tipo de HTML crudo que ya uso en Listmonk, sin tener que armarlo de cero.
import { buildTransactionalEmailHtml } from "@/lib/mail-template";

export type EmailEventType =
  | "order_paid"
  | "order_status_changed"
  | "order_delivered"
  | "order_tracking_set"
  | "manual_payment_instructions"
  | "custom_order_quoted"
  | "product_question_reply";

export type EmailEventTypeDef = {
  type: EmailEventType;
  label: string;
  description: string;
  defaultEnabled: boolean;
  defaultSubject: string;
  defaultHtml: string;
  // Documentacion de que variables acepta cada plantilla -- se muestra en el
  // editor del admin como ayuda, no se valida en runtime (si el admin borra
  // un placeholder del HTML, ese dato simplemente no aparece en el mail).
  placeholders: string[];
};

export const EMAIL_EVENT_TYPES: EmailEventTypeDef[] = [
  {
    type: "order_paid",
    label: "Pago confirmado",
    description: "Se manda apenas se confirma el pago de una compra (Mercado Pago o manual). Incluye el comprobante en PDF adjunto -- eso no se edita aca, solo el cuerpo del mail.",
    defaultEnabled: true,
    defaultSubject: "Comprobante de tu compra #{{orderNumber}}",
    placeholders: ["customerName", "orderNumber", "total", "receiptUrl"],
    defaultHtml: buildTransactionalEmailHtml({
      heading: "¡Gracias por tu compra, {{customerName}}!",
      text: [
        "Confirmamos el pago de tu compra #{{orderNumber}} por {{total}}.",
        "Te dejamos el comprobante adjunto en PDF, con codigo QR para ver el estado del pedido en cualquier momento.",
        "",
        "Tambien podes verlo online aca: {{receiptUrl}}",
      ].join("\n"),
      highlightRows: [
        { label: "Orden", value: "#{{orderNumber}}" },
        { label: "Total", value: "{{total}}" },
      ],
      ctaUrl: "{{receiptUrl}}",
      ctaLabel: "Ver estado de mi pedido",
    }),
  },
  {
    type: "order_status_changed",
    label: "Cambio de estado del pedido",
    description: "Se manda en cada paso del pipeline de impresion (en cola, imprimiendo, postprocesado, enviado) -- no se usa para \"entregado\", que tiene su propio template mas abajo.",
    defaultEnabled: true,
    defaultSubject: "Tu pedido #{{orderNumber}} {{statusLabel}}",
    placeholders: ["orderNumber", "statusLabel", "receiptUrl"],
    defaultHtml: buildTransactionalEmailHtml({
      heading: "Tu pedido #{{orderNumber}} {{statusLabel}}",
      text: ["Tu pedido #{{orderNumber}} {{statusLabel}}.", "", "Segui el estado completo desde tu cuenta: {{receiptUrl}}"].join("\n"),
      highlightRows: [{ label: "Orden", value: "#{{orderNumber}}" }],
      ctaUrl: "{{receiptUrl}}",
      ctaLabel: "Ver estado de mi pedido",
    }),
  },
  {
    type: "order_delivered",
    label: "Pedido entregado",
    description: "Ultimo paso del pipeline: va con todos los datos de la compra y el comprobante en PDF adjunto (eso no se edita aca), a diferencia del resto de los cambios de estado que son un aviso mas corto.",
    defaultEnabled: true,
    defaultSubject: "Tu pedido #{{orderNumber}} fue entregado",
    placeholders: ["customerName", "orderNumber", "total", "trackingLine", "receiptUrl"],
    defaultHtml: buildTransactionalEmailHtml({
      heading: "¡Tu pedido #{{orderNumber}} llego a destino!",
      text: ["Tu pedido #{{orderNumber}} fue entregado.", "", "Segui el estado completo desde tu cuenta: {{receiptUrl}}"].join("\n"),
      highlightRows: [
        { label: "Orden", value: "#{{orderNumber}}" },
        { label: "Total", value: "{{total}}" },
        { label: "Seguimiento", value: "{{trackingLine}}" },
      ],
      ctaUrl: "{{receiptUrl}}",
      ctaLabel: "Ver el detalle completo",
    }),
  },
  {
    type: "order_tracking_set",
    label: "Código de seguimiento cargado",
    description: "Se manda apenas el admin carga el transportista y codigo de un pedido (DAC u otro), en cualquier momento del pipeline.",
    defaultEnabled: true,
    defaultSubject: "Codigo de seguimiento de tu pedido #{{orderNumber}}",
    placeholders: ["orderNumber", "carrier", "code", "receiptUrl"],
    defaultHtml: buildTransactionalEmailHtml({
      heading: "Tu pedido #{{orderNumber}} ya tiene seguimiento",
      text: "Ya podes seguir tu pedido #{{orderNumber}} con el siguiente codigo:",
      highlightRows: [{ label: "{{carrier}}", value: "{{code}}" }],
      ctaUrl: "{{receiptUrl}}",
      ctaLabel: "Ver estado general del pedido",
    }),
  },
  {
    type: "manual_payment_instructions",
    label: "Instrucciones de pago manual",
    description: "Se manda al crear una orden con un medio de pago manual (transferencia, Abitab, Red Pagos, etc.), tanto de catalogo como de pedido a medida.",
    defaultEnabled: true,
    defaultSubject: "Orden de servicio #{{orderNumber}} — instrucciones de pago",
    placeholders: ["orderNumber", "total", "methodLabel", "instructions", "receiptUrl"],
    defaultHtml: buildTransactionalEmailHtml({
      heading: "Orden de servicio #{{orderNumber}}",
      text: [
        "Tu orden de servicio #{{orderNumber}} quedo registrada por {{total}}.",
        "Medio de pago elegido: {{methodLabel}}.",
        "",
        "{{instructions}}",
        "",
        "Una vez que hagas el pago, subi el comprobante desde: {{receiptUrl}}",
      ].join("\n"),
      highlightRows: [
        { label: "Total", value: "{{total}}" },
        { label: "Medio de pago", value: "{{methodLabel}}" },
      ],
      ctaUrl: "{{receiptUrl}}",
      ctaLabel: "Subir mi comprobante",
    }),
  },
  {
    type: "custom_order_quoted",
    label: "Cotización de pedido a medida lista",
    description: "Se manda cuando el admin carga el precio de un pedido a medida.",
    defaultEnabled: true,
    defaultSubject: "Tu cotizacion esta lista",
    placeholders: ["fileName", "price", "notesLine", "myOrdersUrl"],
    defaultHtml: buildTransactionalEmailHtml({
      heading: "Tu cotizacion esta lista",
      text: [
        'Tu pedido a medida ("{{fileName}}") ya tiene una cotizacion lista.',
        "{{notesLine}}",
        "Podes verlo en tu cuenta: {{myOrdersUrl}}",
      ].join("\n\n"),
      highlightRows: [{ label: "Precio", value: "{{price}}" }],
      ctaUrl: "{{myOrdersUrl}}",
      ctaLabel: "Ver mi pedido a medida",
    }),
  },
  {
    type: "product_question_reply",
    label: "Respuesta a una pregunta de producto",
    description: "Se manda cuando vos o un empleado responden una consulta de un cliente sobre un producto.",
    defaultEnabled: true,
    defaultSubject: 'Te respondieron sobre "{{productName}}"',
    placeholders: ["productName", "message", "inquiryUrl"],
    defaultHtml: buildTransactionalEmailHtml({
      heading: 'Te respondieron sobre "{{productName}}"',
      text: "{{message}}",
      ctaUrl: "{{inquiryUrl}}",
      ctaLabel: "Ver la conversacion completa",
    }),
  },
];

export const EMAIL_PLACEHOLDER_HELP =
  "Cada plantilla tiene sus propias variables (ver la lista debajo de cada una). Se reemplazan tal cual aparecen, con dobles llaves: {{ejemplo}}. Si borras una variable del HTML, ese dato simplemente no va a aparecer en el mail.";

// Reemplazo simple de placeholders, sin libreria de templating -- mismo
// criterio que renderTelegramTemplate (src/lib/telegram/event-types.ts).
export function renderEmailTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

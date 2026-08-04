// Envoltorio HTML compartido para todos los mails transaccionales (pago
// confirmado, cambio de estado, codigo de seguimiento, respuesta a una
// pregunta). Antes cada sendMail() mandaba solo `text` -- este modulo agrega
// una version `html` con la misma identidad visual que ya usamos en el mail
// de bienvenida del newsletter (topbar carbon + wordmark cobre, fondo crema,
// boton solido), asi el pedido de "un boton para ver el estado" queda
// resuelto una sola vez en vez de repetido a mano en cada mail.
//
// Colores tomados de src/app/globals.css (--color-accent, --color-neutral-*)
// en vez de inventados -- ver comentario ahi. Todo con estilos inline: los
// clientes de correo no confian en <style> de forma pareja, mismo criterio
// que ya se uso para el template base de Listmonk.
//
// Acento actualizado a "Indigo de estudio" (#4338ca, ver globals.css #174) --
// antes cobre/naranja. Los neutros tambien se sincronizaron con la rampa
// actual (post #169), quedaron desactualizados cuando ese refinamiento se
// hizo solo en globals.css y no se propago aca.

const COLOR_ACCENT = "#4338ca";
const COLOR_ACCENT_HOVER = "#3730a3";
const COLOR_CARBON = "#1a1712";
const COLOR_CREAM_BG = "#f2f1ec";
const COLOR_CREAM_CARD = "#fafaf8";
const COLOR_MUTED = "#7d7666";
const COLOR_BORDER = "#e4e1d8";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Convierte texto plano (el que ya arma cada mail para el fallback `text`)
// en parrafos HTML, respetando saltos de linea simples como <br> -- evita
// tener que escribir el cuerpo dos veces (texto y html) en cada call site.
export function textToHtmlParagraphs(text: string): string {
  return text
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;color:${COLOR_CARBON};">${escapeHtml(block).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

export function emailButton(url: string, label: string): string {
  return `
    <div style="text-align:center;margin:28px 0;">
      <a href="${url}" style="background:${COLOR_ACCENT};border-radius:4px;text-decoration:none;color:#ffffff;font-weight:bold;padding:12px 32px;display:inline-block;font-family:'Helvetica Neue','Segoe UI',Helvetica,sans-serif;">
        ${escapeHtml(label)} &rarr;
      </a>
    </div>`;
}

// Caja destacada para datos puntuales (ej. codigo de seguimiento) -- mismo
// criterio visual que las cards de la home, para que resalte del texto
// alrededor sin depender de color de fondo distinto (algunos clientes de
// correo recortan backgrounds no blancos en preview).
export function emailHighlightBox(rows: { label: string; value: string }[]): string {
  const rowsHtml = rows
    .map(
      (row) => `
      <tr>
        <td style="padding:6px 0;color:${COLOR_MUTED};font-size:13px;">${escapeHtml(row.label)}</td>
        <td style="padding:6px 0;color:${COLOR_CARBON};font-size:14px;font-weight:700;text-align:right;">${escapeHtml(row.value)}</td>
      </tr>`,
    )
    .join("");

  return `
    <table role="presentation" style="width:100%;border:1px solid ${COLOR_BORDER};border-radius:6px;margin:20px 0;background:${COLOR_CREAM_BG};">
      <tr><td style="padding:14px 18px;">
        <table role="presentation" style="width:100%;border:none;">${rowsHtml}</table>
      </td></tr>
    </table>`;
}

export function wrapEmailHtml(params: { heading: string; bodyHtml: string }): string {
  return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1">
  </head>
  <body style="background-color:${COLOR_CREAM_BG};font-family:'Helvetica Neue','Segoe UI',Helvetica,sans-serif;font-size:15px;line-height:26px;margin:0;color:${COLOR_CARBON};">
    <div style="background-color:${COLOR_CARBON};padding:18px 30px;text-align:center;">
      <span style="color:${COLOR_CREAM_CARD};font-size:18px;font-weight:700;letter-spacing:0.5px;">
        Tienda<span style="color:#d97a2b;">3D</span>
      </span>
    </div>
    <div style="background-color:${COLOR_CREAM_CARD};padding:30px;max-width:525px;margin:0 auto;border-radius:0 0 8px 8px;">
      <h1 style="font-size:20px;line-height:28px;margin:0 0 16px;color:${COLOR_CARBON};">${escapeHtml(params.heading)}</h1>
      ${params.bodyHtml}
    </div>
    <div style="text-align:center;font-size:12px;color:${COLOR_MUTED};padding:20px 30px 0;">
      Tienda3D — impresion 3D en Uruguay
    </div>
    <div style="padding:20px;">&nbsp;</div>
  </body>
</html>`;
}

// Helper "todo en uno" para el caso comun: texto ya armado (parrafos) + un
// boton de accion opcional + una caja de datos opcional (ej. tracking).
export function buildTransactionalEmailHtml(params: {
  heading: string;
  text: string;
  highlightRows?: { label: string; value: string }[];
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const parts = [textToHtmlParagraphs(params.text)];
  if (params.highlightRows?.length) parts.push(emailHighlightBox(params.highlightRows));
  if (params.ctaUrl && params.ctaLabel) parts.push(emailButton(params.ctaUrl, params.ctaLabel));
  return wrapEmailHtml({ heading: params.heading, bodyHtml: parts.join("") });
}

export { COLOR_ACCENT, COLOR_ACCENT_HOVER };

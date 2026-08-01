const currencyFormatter = new Intl.NumberFormat("es-UY", {
  style: "currency",
  currency: "UYU",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

// Fecha de referencia (GlitchTip issue "Minified React error #418" — mismatch
// de hidratacion): toLocaleDateString/toLocaleString sin `timeZone` explicito
// usa la zona horaria del entorno donde corre, que en SSR es la del
// contenedor (UTC en EasyPanel/Docker por defecto) y en el cliente es la del
// navegador (America/Montevideo). Mismo valor de fecha, texto distinto entre
// server y client -> hydration mismatch. Fijar `timeZone` explicito acá
// garantiza el mismo resultado sin importar en que TZ corra el contenedor.
const TZ = "America/Montevideo";

const dateFormatter = new Intl.DateTimeFormat("es-UY", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: TZ,
});

const dateFormatterFull = new Intl.DateTimeFormat("es-UY", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: TZ,
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-UY", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});

const dateTimeFormatterFull = new Intl.DateTimeFormat("es-UY", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});

/** Fecha corta, sin hora: "15 ene 2026". */
export function formatDate(date: Date | string): string {
  return dateFormatter.format(new Date(date));
}

/** Fecha larga, sin hora: "15 de enero de 2026". */
export function formatDateFull(date: Date | string): string {
  return dateFormatterFull.format(new Date(date));
}

/** Fecha corta con hora: "15 ene, 14:30". */
export function formatDateTime(date: Date | string): string {
  return dateTimeFormatter.format(new Date(date));
}

/** Fecha larga con hora: "15 de enero de 2026, 14:30". */
export function formatDateTimeFull(date: Date | string): string {
  return dateTimeFormatterFull.format(new Date(date));
}

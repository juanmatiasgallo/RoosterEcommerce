// Sin "use server": helper puro y sincrono, reusado tanto por
// requestPasswordReset (el propio usuario, "olvide mi contrasena") como por
// adminResetUserPassword (un admin reseteando la de otro usuario) — un
// archivo "use server" solo puede exportar funciones async, por eso vive
// aparte (mismo patron que receipt-eligibility.ts / event-types.ts).
import { randomBytes } from "node:crypto";

export const TEMP_PASSWORD_VALID_HOURS = 24;

// Sin 0/O/1/l/I: evita que una contrasena generada al azar sea imposible de
// tipear a mano si hace falta (aunque el flujo esperado es copiar/pegar
// desde el mail).
const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generateTempPassword(length = 12): string {
  const bytes = randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length];
  }
  return password;
}

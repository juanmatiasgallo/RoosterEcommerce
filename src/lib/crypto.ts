import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // tamano recomendado de IV para GCM
const KEY_LENGTH_BYTES = 32; // AES-256

/**
 * Secretos reales (ej. contrasena SMTP) nunca se guardan en texto plano en
 * la DB, mismo criterio que CLAUDE.md pide para MP_ACCESS_TOKEN y datos de
 * pago. La clave sale de SETTINGS_ENCRYPTION_KEY (32 bytes en hex, ej.
 * `openssl rand -hex 32`) — si no esta seteada o no tiene el largo
 * correcto, esto falla fuerte y claro, nunca cae a una clave por defecto.
 */
function getKey(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY no esta definida. Genera una con `openssl rand -hex 32` y agregala a tu .env.",
    );
  }

  const key = Buffer.from(raw, "hex");
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `SETTINGS_ENCRYPTION_KEY debe ser ${KEY_LENGTH_BYTES} bytes en hexadecimal (${KEY_LENGTH_BYTES * 2} caracteres). Genera una con: openssl rand -hex 32`,
    );
  }

  return key;
}

// Formato de salida: "iv.authTag.ciphertext", todo en hex, concatenado en
// un solo string para poder guardarlo en una columna text.
export function encrypt(plainText: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH_BYTES);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}.${authTag.toString("hex")}.${encrypted.toString("hex")}`;
}

export function decrypt(payload: string): string {
  const key = getKey();
  const [ivHex, authTagHex, dataHex] = payload.split(".");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Formato de dato encriptado invalido.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString("utf8");
}

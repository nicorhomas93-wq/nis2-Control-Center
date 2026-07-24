import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * Real AES-256-GCM encryption for OAuth tokens/client secrets, replacing the
 * reversible-Base64 placeholder in secret-store.ts. A Microsoft Graph refresh
 * token grants broad, long-lived access to a customer's whole directory and
 * SharePoint, so it needs more than RLS-only protection at rest.
 */

const ALGO = "aes-256-gcm";

function deriveKey(): Buffer {
  const secret = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY fehlt. Ein zufaelliger, langer Wert muss in .env.local gesetzt sein."
    );
  }
  return scryptSync(secret, "tknd-integration-secrets", 32);
}

export function encryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ["ENCV1", iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "ENCV1") return null;
  const [, ivB64, authTagB64, ciphertextB64] = parts;
  const key = deriveKey();
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

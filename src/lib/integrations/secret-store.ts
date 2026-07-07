/**
 * TODO Security-Hardening:
 * Diese Platzhalterkodierung ist KEINE echte Verschlüsselung.
 * In Produktion durch KMS/Vault-basierte Verschlüsselung ersetzen.
 */
const PREFIX = "ENC::";

export function encodeSecretPlaceholder(value: string | null | undefined): string | null {
  if (!value) return null;
  return `${PREFIX}${Buffer.from(value, "utf8").toString("base64")}`;
}

export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 6) return "******";
  return `${value.slice(0, 2)}******${value.slice(-2)}`;
}

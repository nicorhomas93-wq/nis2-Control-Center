export const DUPLICATE_CONNECTION_CONSTRAINT = "integration_connections_tenant_id_name_key";

export interface IntegrationTechnicalError {
  error_code: string;
  constraint: string;
  message: string;
}

export interface DuplicateConnectionErrorPayload {
  errorType: "duplicate_connection_name";
  title: string;
  message: string;
  shortMessage: string;
  existingConnection: {
    id: string;
    name: string;
    status?: string;
    providerName?: string;
  } | null;
  suggestedNames: string[];
  technical: IntegrationTechnicalError;
}

type DbErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function isDuplicateConnectionNameError(error: DbErrorLike | null): boolean {
  if (!error || error.code !== "23505") return false;
  const blob = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;
  return blob.includes(DUPLICATE_CONNECTION_CONSTRAINT);
}

export function buildTechnicalError(
  error: DbErrorLike | null,
  fallbackMessage: string
): IntegrationTechnicalError {
  const blob = `${error?.message ?? ""} ${error?.details ?? ""}`;
  const constraintMatch = blob.match(/"([^"]+)"/);
  return {
    error_code: error?.code ?? "validation",
    constraint: constraintMatch?.[1]?.includes("integration_connections")
      ? DUPLICATE_CONNECTION_CONSTRAINT
      : constraintMatch?.[1] ?? DUPLICATE_CONNECTION_CONSTRAINT,
    message: error?.message ?? fallbackMessage,
  };
}

export function suggestConnectionNames(baseName: string, existingNames: string[]): string[] {
  const trimmed = baseName.trim() || "Integration";
  const candidates = [
    `${trimmed} (2)`,
    `${trimmed} Test`,
    `${trimmed} Produktion`,
    `${trimmed} Demo`,
  ];
  const existing = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  return candidates.filter((c) => !existing.has(c.toLowerCase()));
}

export function buildDuplicateConnectionPayload(
  name: string,
  existingConnection: DuplicateConnectionErrorPayload["existingConnection"],
  existingNames: string[],
  technical: IntegrationTechnicalError
): DuplicateConnectionErrorPayload {
  return {
    errorType: "duplicate_connection_name",
    title: "Verbindung bereits vorhanden",
    message: "Für diesen Mandanten existiert bereits eine Integration mit diesem Namen.",
    shortMessage: "Dieser Name wird bereits verwendet.",
    existingConnection,
    suggestedNames: suggestConnectionNames(name, existingNames),
    technical,
  };
}

export function logIntegrationTechnicalError(
  context: string,
  technical: IntegrationTechnicalError
): void {
  console.error("[integrations]", context, technical);
}

const TECHNICAL_ERROR_PATTERNS = [
  /unique constraint/i,
  /duplicate key/i,
  /postgresql/i,
  /sqlstate/i,
  /\b23505\b/,
  /integration_connections_tenant_id_name_key/i,
];

export function sanitizeUserFacingError(message: string): string {
  if (TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return "Die Verbindung konnte nicht gespeichert werden. Bitte prüfen Sie den Namen oder wenden Sie sich an Ihre IT.";
  }
  return message;
}

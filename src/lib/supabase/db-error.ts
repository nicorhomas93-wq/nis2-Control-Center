export function isMissingTableError(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("does not exist") === true ||
    error.message?.includes("schema cache") === true
  );
}

export function isMissingColumnError(
  error: { code?: string; message?: string } | null,
  column?: string
): boolean {
  if (!error) return false;
  const missingColumn =
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes("Could not find") === true ||
    error.message?.includes("column") === true;
  if (!missingColumn) return false;
  if (!column) return true;
  return error.message?.includes(column) === true;
}

export const DB_SETUP_HINT =
  "Bitte führen Sie supabase/setup-complete.sql im Supabase SQL Editor aus. Bei bestehender Datenbank reicht supabase/migrations/patch-existing-db.sql.";

export function getDbErrorMessage(
  error: { code?: string; message?: string; details?: string; hint?: string } | null
): string {
  if (isMissingTableError(error)) {
    return `Datenbanktabellen fehlen. ${DB_SETUP_HINT}`;
  }
  if (isMissingColumnError(error)) {
    return `Datenbankschema veraltet. ${DB_SETUP_HINT}`;
  }
  const parts: string[] = [];
  if (error?.message) parts.push(error.message);
  if (error?.details) parts.push(error.details);
  if (error?.hint) parts.push(`Hinweis: ${error.hint}`);
  if (error?.code) parts.push(`Code: ${error.code}`);
  return parts.join(" — ") || "Ein Datenbankfehler ist aufgetreten.";
}

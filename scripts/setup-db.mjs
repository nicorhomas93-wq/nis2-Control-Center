/**
 * Führt supabase/setup-complete.sql aus.
 * Nutzung: node scripts/setup-db.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  try {
    const env = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of env.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      process.env[t.slice(0, i)] = t.slice(i + 1);
    }
  } catch {
    /* ignore */
  }
}

loadEnv();

const PASSWORD = process.env.DB_PASSWORD || "Neutart20!9";
const PROJECT_REF = "hmyeguskotcydmodoedr";

const connectionAttempts = [
  process.env.DATABASE_URL,
  `postgresql://postgres:${encodeURIComponent(PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(PASSWORD)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(PASSWORD)}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
].filter(Boolean);

async function connect() {
  for (const connectionString of connectionAttempts) {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await client.connect();
      const host = connectionString.includes("@")
        ? connectionString.split("@")[1]?.split("/")[0]
        : "unknown";
      console.log("Verbunden:", host);
      return client;
    } catch (err) {
      const host = connectionString.includes("@")
        ? connectionString.split("@")[1]?.split("/")[0]
        : connectionString;
      console.log("Verbindung fehlgeschlagen:", host, "->", err.message);
    }
  }
  return null;
}

async function main() {
  const client = await connect();
  if (!client) {
    console.error("\nKeine Verbindung möglich. Bitte DB-Passwort in Supabase prüfen:");
    console.error("Project Settings -> Database -> Reset database password");
    console.error("Dann in .env.local: DB_PASSWORD=dein_passwort");
    process.exit(1);
  }

  const sql = readFileSync(join(root, "supabase", "setup-complete.sql"), "utf8");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.split("\n").every((l) => !l.trim() || l.trim().startsWith("--")));

  for (const statement of statements) {
    const preview =
      statement
        .split("\n")
        .find((l) => l.trim() && !l.trim().startsWith("--"))
        ?.trim()
        .slice(0, 70) ?? statement.slice(0, 70);
    try {
      await client.query(statement);
      console.log("OK:", preview);
    } catch (err) {
      console.error("FEHLER bei:", preview);
      console.error(err.message);
      await client.end();
      process.exit(1);
    }
  }

  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('profiles','companies','nis2_assessments','documents','measures','risks','incidents','audit_exports')
    ORDER BY table_name
  `);

  console.log("\nTabellen erstellt:", rows.map((r) => r.table_name).join(", "));
  await client.end();
  console.log("\nFertig! Dashboard neu laden: http://localhost:3000/dashboard");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

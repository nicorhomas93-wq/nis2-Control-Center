import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

const ORDER = [
  "add_stripe_billing.sql",
  "add_pilot_setup_paid.sql",
  "add_pilot_phase_completed.sql",
  "add_access_enabled.sql",
  "add_acquisition_system.sql",
  "add_follow_up_lifecycle.sql",
  "add_consultant_mandanten.sql",
  "add_b2b_outreach.sql",
  "add_b2b_outreach_nis2_score.sql",
  "add_b2b_outreach_location.sql",
  "add_b2b_outreach_web_presence.sql",
  "add_customer_messages.sql",
  "add_customer_message_automation.sql",
  "add_compliance_engine.sql",
  "add_risk_quality_fields.sql",
  "add_company_assets.sql",
  "add_compliance_events.sql",
  "add_risk_treatment_status.sql",
  "add_incident_response_fields.sql",
  "add_consultant_white_label.sql",
  "add_team_compliance_system.sql",
  "add_team_invite_accept_policy.sql",
  "add_team_invitation_email_rls.sql",
  "add_team_invitation_rpc.sql",
  "fix_handle_new_user_trigger.sql",
  "fix_profiles_missing_plan_role.sql",
  "add_team_data_access_rls.sql",
  "add_company_vendors.sql",
  "add_vendor_applicability_na.sql",
  "add_vendor_categories_providers.sql",
  "add_compliance_evidence_module.sql",
  "add_compliance_evidence_center.sql",
  "add_jarvis_partner_scoring.sql",
  "add_jarvis_lead_finder_fields.sql",
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL fehlt (.env.local)");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS _schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  );
`);

const { rows: applied } = await client.query("SELECT filename FROM _schema_migrations");
const done = new Set(applied.map((r) => r.filename));

const migrationsDir = join(root, "supabase", "migrations");

for (const file of ORDER) {
  if (done.has(file)) {
    console.log(`skip  ${file}`);
    continue;
  }

  const sql = readFileSync(join(migrationsDir, file), "utf8");
  console.log(`apply ${file} ...`);
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO _schema_migrations (filename) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log(`ok    ${file}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`fail  ${file}:`, err.message);
    process.exit(1);
  }
}

const checks = [
  ["companies.access_enabled", "SELECT access_enabled FROM companies LIMIT 0"],
  ["acquisition_visitors", "SELECT 1 FROM acquisition_visitors LIMIT 0"],
  ["acquisition_leads", "SELECT 1 FROM acquisition_leads LIMIT 0"],
  ["b2b_outreach_leads", "SELECT 1 FROM b2b_outreach_leads LIMIT 0"],
];

for (const [name, q] of checks) {
  try {
    await client.query(q);
    console.log(`check ok ${name}`);
  } catch (err) {
    console.error(`check fail ${name}:`, err.message);
  }
}

await client.end();
console.log("Migrations abgeschlossen.");

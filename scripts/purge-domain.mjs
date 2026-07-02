import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");
const domainArgs = process.argv.slice(2).filter((a) => a !== "--dry-run");
const domains = domainArgs.map((d) => d.trim().toLowerCase()).filter(Boolean);

if (domains.length === 0) {
  console.error("Usage: node scripts/purge-domain.mjs <domain|email> [more...] [--dry-run]");
  process.exit(1);
}

function domainPatterns(input) {
  const patterns = new Set([`%${input}%`]);
  if (!input.includes("@") && input.endsWith("web.de") && input.length > "web.de".length) {
    const local = input.slice(0, -"web.de".length);
    if (local) patterns.add(`%${local}@web.de%`);
  }
  return [...patterns];
}

const likePatterns = [...new Set(domains.flatMap(domainPatterns))];
const patternParams = [likePatterns];

function likeAny(fields) {
  return fields.map((f) => `lower(coalesce(${f}, '')) LIKE ANY($1::text[])`).join(" OR ");
}

function loadEnvLocal() {
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
}

loadEnvLocal();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

async function selectIds(table, whereSql, params = patternParams) {
  const { rows } = await client.query(
    `SELECT id::text AS id FROM ${table} WHERE ${whereSql}`,
    params
  );
  return rows.map((r) => r.id);
}

async function countRows(sql, params) {
  const { rows } = await client.query(sql, params);
  return rows[0]?.c ?? 0;
}

async function countAndMaybeDelete(label, deleteSql, params = patternParams) {
  const countSql = deleteSql.replace(/^DELETE FROM/i, "SELECT COUNT(*)::int AS c FROM");
  const count = await countRows(countSql, params);
  if (count === 0) {
    console.log(`skip  ${label}`);
    return 0;
  }
  if (dryRun) {
    console.log(`dry   ${label}: ${count}`);
    return count;
  }
  const res = await client.query(deleteSql, params);
  console.log(`done  ${label}: ${res.rowCount}`);
  return res.rowCount;
}

console.log(`${dryRun ? "DRY RUN" : "PURGE"} für: ${domains.join(", ")}`);
console.log(`Suchmuster: ${likePatterns.join(", ")}`);

const leadIds = await selectIds(
  "leads",
  likeAny(["email", "website", "company_name"])
);
const acquisitionLeadIds = await selectIds(
  "acquisition_leads",
  likeAny(["email", "company_name"])
);
const profileRows = (
  await client.query(`SELECT id::text AS id, email FROM profiles WHERE ${likeAny(["email"])}`, patternParams)
).rows;
const authRows = (
  await client.query(
    `SELECT id::text AS id, email FROM auth.users WHERE ${likeAny(["email"])}`,
    patternParams
  )
).rows;
const invitationIds = await selectIds("company_invitations", likeAny(["email"]));

console.log("Gefunden:", {
  leads: leadIds.length,
  acquisitionLeads: acquisitionLeadIds.length,
  profiles: profileRows.length,
  authUsers: authRows.length,
  invitations: invitationIds.length,
});

await client.query("BEGIN");

try {
  if (leadIds.length > 0) {
    await countAndMaybeDelete(
      "jarvis_events (leads)",
      `DELETE FROM jarvis_events WHERE entity_type = 'lead' AND entity_id = ANY($1::uuid[])`,
      [leadIds]
    );
  }

  if (acquisitionLeadIds.length > 0) {
    await countAndMaybeDelete(
      "acquisition_email_queue",
      `DELETE FROM acquisition_email_queue WHERE acquisition_lead_id = ANY($1::uuid[])`,
      [acquisitionLeadIds]
    );
  }

  await countAndMaybeDelete(
    "acquisition_leads",
    `DELETE FROM acquisition_leads WHERE ${likeAny(["email", "company_name"])}`
  );

  await countAndMaybeDelete(
    "leads",
    `DELETE FROM leads WHERE ${likeAny(["email", "website", "company_name"])}`
  );

  await countAndMaybeDelete(
    "b2b_outreach_leads",
    `DELETE FROM b2b_outreach_leads WHERE ${likeAny(["contact_email", "website", "company_name"])}`
  );

  await countAndMaybeDelete(
    "pilot_requests",
    `DELETE FROM pilot_requests WHERE ${likeAny(["email"])}`
  );

  await countAndMaybeDelete(
    "company_invitations",
    `DELETE FROM company_invitations WHERE ${likeAny(["email"])}`
  );

  await countAndMaybeDelete(
    "email_notifications",
    `DELETE FROM email_notifications WHERE ${likeAny(["recipient_email", "subject"])}`
  );

  const userIds = [...new Set([...profileRows.map((r) => r.id), ...authRows.map((r) => r.id)])];
  if (userIds.length > 0) {
    await countAndMaybeDelete(
      "company_members",
      `DELETE FROM company_members WHERE user_id = ANY($1::uuid[])`,
      [userIds]
    );
  }

  if (profileRows.length > 0) {
    await countAndMaybeDelete(
      "profiles",
      `DELETE FROM profiles WHERE ${likeAny(["email"])}`
    );
  }

  if (dryRun) {
    await client.query("ROLLBACK");
    console.log("Dry run — keine Änderungen geschrieben.");
  } else {
    await client.query("COMMIT");
  }
} catch (err) {
  await client.query("ROLLBACK");
  console.error("Fehler:", err.message);
  process.exit(1);
}

await client.end();

if (!dryRun && authRows.length > 0) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn("Auth-User konnten nicht gelöscht werden: SUPABASE_SERVICE_ROLE_KEY fehlt.");
  } else {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    for (const user of authRows) {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`auth delete ${user.email}:`, error.message);
      } else {
        console.log(`done  auth user: ${user.email}`);
      }
    }
  }
}

console.log("Fertig.");

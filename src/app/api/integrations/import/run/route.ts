import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantForUser } from "@/lib/integrations/tenant";
import { requiredFieldsForImport } from "@/lib/integrations/csv-import";
import type { CsvImportType } from "@/lib/integrations/types";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

function pick(source: Record<string, string>, mapping: Record<string, string>, target: string): string {
  const sourceField = Object.entries(mapping).find(([, mapped]) => mapped === target)?.[0] ?? target;
  return (source[sourceField] ?? "").trim();
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const tenant = await resolveTenantForUser(user.id, body.tenantId);
  if (!tenant) return NextResponse.json({ error: "Mandant nicht gefunden" }, { status: 404 });

  const importType = body.importType as CsvImportType;
  const rows = (body.rows ?? []) as Record<string, string>[];
  const mapping = (body.mapping ?? {}) as Record<string, string>;

  if (!importType || !rows.length) {
    return NextResponse.json({ error: "importType und rows sind erforderlich" }, { status: 400 });
  }

  const required = requiredFieldsForImport(importType);
  const missing = required.filter((field) => !Object.values(mapping).includes(field));
  if (missing.length) {
    return NextResponse.json({ error: `Pflichtfelder nicht zugeordnet: ${missing.join(", ")}` }, { status: 400 });
  }

  const { data: csvProvider } = await supabase
    .from("integration_providers")
    .select("id")
    .eq("key", "csv_excel")
    .maybeSingle();
  const providerId = csvProvider?.id;
  if (!providerId) {
    return NextResponse.json(
      { error: "Provider 'CSV / Excel Import' nicht gefunden. Bitte Migration erneut ausführen." },
      { status: 500 }
    );
  }

  const { data: connection } = await supabase
    .from("integration_connections")
    .insert({
      tenant_id: tenant.id,
      provider_id: providerId,
      name: `CSV Import ${new Date().toLocaleString("de-DE")}`,
      status: "active",
      auth_type: "file_import",
      config_json: { importType },
      created_by: user.id,
    })
    .select("id")
    .single();

  const { data: run } = await supabase
    .from("integration_sync_runs")
    .insert({
      tenant_id: tenant.id,
      connection_id: connection?.id ?? null,
      sync_type: `csv_import_${importType}`,
      direction: "inbound",
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let recordsFailed = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    recordsProcessed++;
    try {
      if (importType === "suppliers") {
        const name = pick(row, mapping, "name");
        if (!name) throw new Error("name fehlt");
        const { data: existing } = await supabase
          .from("company_vendors")
          .select("id")
          .eq("company_id", tenant.id)
          .eq("name", name)
          .maybeSingle();
        if (existing?.id) {
          await supabase
            .from("company_vendors")
            .update({
              contact_email: pick(row, mapping, "contact_email") || null,
              website: pick(row, mapping, "website") || null,
              notes: pick(row, mapping, "notes") || null,
            })
            .eq("id", existing.id);
          recordsUpdated++;
        } else {
          await supabase.from("company_vendors").insert({
            company_id: tenant.id,
            name,
            contact_email: pick(row, mapping, "contact_email") || null,
            website: pick(row, mapping, "website") || null,
            criticality: (pick(row, mapping, "criticality") || "medium").toLowerCase(),
            status: "active",
          });
          recordsCreated++;
        }
      } else if (importType === "assets") {
        const name = pick(row, mapping, "name");
        if (!name) throw new Error("name fehlt");
        const { data: existing } = await supabase
          .from("company_assets")
          .select("id")
          .eq("company_id", tenant.id)
          .eq("name", name)
          .maybeSingle();
        const payload = {
          category: pick(row, mapping, "category") || "organization",
          description: pick(row, mapping, "description") || null,
          criticality: (pick(row, mapping, "criticality") || "medium").toLowerCase(),
        };
        if (existing?.id) {
          await supabase.from("company_assets").update(payload).eq("id", existing.id);
          recordsUpdated++;
        } else {
          await supabase.from("company_assets").insert({ company_id: tenant.id, name, ...payload });
          recordsCreated++;
        }
      } else if (importType === "risks") {
        await supabase.from("risks").insert({
          company_id: tenant.id,
          asset: pick(row, mapping, "asset"),
          threat: pick(row, mapping, "threat"),
          vulnerability: pick(row, mapping, "vulnerability") || null,
          risk_level: (pick(row, mapping, "risk_level") || "medium").toLowerCase(),
          measure: pick(row, mapping, "measure") || null,
          business_impact: pick(row, mapping, "business_impact") || null,
          is_mandatory: true,
          criticality: "medium",
          escalation_level: 0,
        });
        recordsCreated++;
      } else if (importType === "measures") {
        await supabase.from("measures").insert({
          company_id: tenant.id,
          title: pick(row, mapping, "title"),
          description: pick(row, mapping, "description") || null,
          priority: (pick(row, mapping, "priority") || "medium").toLowerCase(),
          criticality: (pick(row, mapping, "criticality") || "medium").toLowerCase(),
          responsible: pick(row, mapping, "responsible") || null,
          status: "open",
        });
        recordsCreated++;
      } else if (importType === "evidence") {
        await supabase.from("compliance_evidence_entries").insert({
          company_id: tenant.id,
          title: pick(row, mapping, "title"),
          category: pick(row, mapping, "category") || "allgemein",
          entry_type: pick(row, mapping, "entry_type") || "dokument",
          description: pick(row, mapping, "description") || null,
          status: "nachweis_fehlt",
          mandatory_relevance: "required",
          created_by: user.id,
        });
        recordsCreated++;
      } else {
        recordsFailed++;
        errors.push(`Zeile ${index + 1}: Importtyp ${importType} ist vorbereitet, aber noch nicht aktiv.`);
      }
    } catch (err) {
      recordsFailed++;
      errors.push(`Zeile ${index + 1}: ${err instanceof Error ? err.message : "Fehler"}`);
    }
  }

  const status = recordsFailed === 0 ? "success" : recordsCreated + recordsUpdated > 0 ? "partial" : "failed";
  if (run?.id) {
    const { error } = await supabase
      .from("integration_sync_runs")
      .update({
        status,
        finished_at: new Date().toISOString(),
        records_processed: recordsProcessed,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        records_failed: recordsFailed,
        error_message: errors[0] ?? null,
        details_json: { importType, errors: errors.slice(0, 20) },
      })
      .eq("id", run.id);
    if (error) {
      return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
    }
  }

  return NextResponse.json({
    importType,
    status,
    runId: run?.id ?? null,
    recordsProcessed,
    recordsCreated,
    recordsUpdated,
    recordsFailed,
    errors: errors.slice(0, 20),
  });
}

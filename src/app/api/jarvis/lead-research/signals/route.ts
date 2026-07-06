import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import type { ResearchSignalType } from "@/lib/jarvis/lead-research/constants";
import { qualifyResearchLead, MIN_LEAD_SCORE } from "@/lib/jarvis/lead-research/lead-qualification";
import { DEMO_RESEARCH_SIGNALS } from "@/lib/jarvis/lead-research/seed-signals";

function toRow(
  demo: (typeof DEMO_RESEARCH_SIGNALS)[number],
  qualified: ReturnType<typeof qualifyResearchLead>
) {
  return {
    company_name: demo.company_name,
    signal_type: demo.signal_type,
    source_platform: demo.source_platform,
    source_url: demo.source_url ?? null,
    title: demo.title,
    description: demo.description,
    region: demo.region,
    industry: demo.industry,
    industry_priority: qualified.industry_priority,
    research_score: qualified.research_score,
    score_reason: qualified.score_reason,
    keywords_matched: qualified.keywords_matched,
    lead_type: qualified.lead_type,
    lead_priority: qualified.lead_priority,
    demand_signal: qualified.demand_signal,
    signal_art: qualified.signal_art,
    tknd_modules: qualified.tknd_modules,
    recommended_action: qualified.recommended_action,
    relevance_note: qualified.relevance_note,
    status: "new",
  };
}

export async function GET() {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jarvis_lead_research_signals")
    .select("*")
    .gte("research_score", MIN_LEAD_SCORE)
    .order("research_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ signals: data ?? [] });
}

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();

  if (body.mode === "seed_demo") {
    const supabase = await createClient();
    const rows = DEMO_RESEARCH_SIGNALS.map((demo) => {
      const qualified = qualifyResearchLead({
        company_name: demo.company_name,
        signal_type: demo.signal_type,
        title: demo.title,
        description: demo.description,
        industry: demo.industry,
        source_platform: demo.source_platform,
        source_url: demo.source_url,
      });
      return toRow(demo, qualified);
    }).filter((row) => row.research_score >= MIN_LEAD_SCORE);

    const { data, error } = await supabase.from("jarvis_lead_research_signals").insert(rows).select();

    if (error) {
      return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
    }

    return NextResponse.json({ signals: data, count: data?.length ?? 0 });
  }

  const company_name = typeof body.company_name === "string" ? body.company_name.trim() : "";
  const signal_type = body.signal_type as ResearchSignalType;

  if (!company_name || !signal_type) {
    return NextResponse.json({ error: "Firma und Signal-Typ sind erforderlich" }, { status: 400 });
  }

  const qualified = qualifyResearchLead({
    company_name,
    signal_type,
    title: body.title,
    description: body.description,
    industry: body.industry,
    employee_count: body.employee_count,
    source_url: body.source_url,
    source_platform: body.source_platform,
  });

  if (!qualified.accepted) {
    return NextResponse.json(
      { error: qualified.reject_reason ?? "Lead erfüllt Qualitätskriterien nicht" },
      { status: 422 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jarvis_lead_research_signals")
    .insert({
      company_name,
      signal_type,
      source_platform: body.source_platform?.trim() || null,
      source_url: body.source_url?.trim() || null,
      title: body.title?.trim() || null,
      description: body.description?.trim() || null,
      region: body.region?.trim() || null,
      industry: body.industry?.trim() || null,
      industry_priority: qualified.industry_priority,
      research_score: qualified.research_score,
      score_reason: qualified.score_reason,
      keywords_matched: qualified.keywords_matched,
      lead_type: qualified.lead_type,
      lead_priority: qualified.lead_priority,
      demand_signal: qualified.demand_signal,
      signal_art: qualified.signal_art,
      tknd_modules: qualified.tknd_modules,
      recommended_action: qualified.recommended_action,
      relevance_note: qualified.relevance_note,
      status: "new",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ signal: data });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import type { ResearchSignalType } from "@/lib/jarvis/lead-research/constants";
import { scoreResearchSignal } from "@/lib/jarvis/lead-research/signal-scoring";
import { DEMO_RESEARCH_SIGNALS } from "@/lib/jarvis/lead-research/seed-signals";

export async function GET() {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jarvis_lead_research_signals")
    .select("*")
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
      const scored = scoreResearchSignal({
        company_name: demo.company_name,
        signal_type: demo.signal_type,
        title: demo.title,
        description: demo.description,
        industry: demo.industry,
      });
      return {
        company_name: demo.company_name,
        signal_type: demo.signal_type,
        source_platform: demo.source_platform,
        title: demo.title,
        description: demo.description,
        region: demo.region,
        industry: demo.industry,
        industry_priority: scored.industry_priority,
        research_score: scored.research_score,
        score_reason: scored.score_reason,
        keywords_matched: scored.keywords_matched,
        status: "new",
      };
    });

    const { data, error } = await supabase
      .from("jarvis_lead_research_signals")
      .insert(rows)
      .select();

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

  const scored = scoreResearchSignal({
    company_name,
    signal_type,
    title: body.title,
    description: body.description,
    industry: body.industry,
    employee_count: body.employee_count,
  });

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
      industry_priority: scored.industry_priority,
      research_score: scored.research_score,
      score_reason: scored.score_reason,
      keywords_matched: scored.keywords_matched,
      status: "new",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ signal: data });
}

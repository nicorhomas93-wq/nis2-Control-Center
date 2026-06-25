import type { SupabaseClient } from "@supabase/supabase-js";
import { logJarvisEvent } from "@/lib/jarvis/jarvis-events";

const DEFAULT_TARGET_GROUPS = [
  {
    name: "IT-Systemhäuser",
    description: "MSP-artige IT-Dienstleister mit KMU-Kunden",
    industry: "IT-Systemhaus",
    company_size: "10–250 MA",
    pain_points:
      "NIS2-Dokumentation für Kunden, Audit-Vorbereitung, fehlende Compliance-Templates",
    value_proposition:
      "White-Label-fähiges NIS2 Control Center für Kundenprojekte",
    priority: "high",
  },
  {
    name: "MSPs",
    description: "Managed Service Provider mit Microsoft-365-Fokus",
    industry: "MSP",
    company_size: "10–500 MA",
    pain_points:
      "Skalierbare Compliance-Dokumentation, wiederkehrende Audit-Anforderungen",
    value_proposition:
      "Schnelle NIS2-Dokumente + Audit-Ordner-Export für Kunden",
    priority: "high",
  },
  {
    name: "Datenschutzberater",
    description: "Externe DSB und Datenschutz-Consultants",
    industry: "Datenschutz",
    company_size: "1–50 MA",
    pain_points: "NIS2-Überschneidung mit DSGVO, fehlende IT-Security-Dokumente",
    value_proposition:
      "Ergänzung zum Datenschutz-Portfolio mit NIS2-Dokumentgenerator",
    priority: "high",
  },
  {
    name: "Compliance-Berater",
    description: "GRC- und Compliance-Beratung",
    industry: "Compliance",
    company_size: "5–100 MA",
    pain_points: "Kunden brauchen NIS2-Nachweise, manuelle Dokumentenerstellung",
    value_proposition:
      "Strukturierte Audit-Ordner und Compliance-Score für Beratungsmandate",
    priority: "high",
  },
  {
    name: "Mittelstand mit Microsoft 365",
    description: "KMU mit M365, oft ohne dedizierte IT-Security",
    industry: "Allgemein",
    company_size: "50–500 MA",
    pain_points: "Unklare NIS2-Betroffenheit, fehlende Policies, Audit-Druck",
    value_proposition:
      "Betroffenheitscheck + Dokumente + Audit-Paket aus einer Hand",
    priority: "medium",
  },
  {
    name: "ICT-Dienstleister",
    description: "Telekommunikation und ICT nach NIS2",
    industry: "ICT-Dienstleistungen",
    company_size: "100+ MA",
    pain_points: "Meldepflichten, Risikoanalyse, Lieferketten-Themen",
    value_proposition: "NIS2 Control Center für ICT-relevante Dokumentation",
    priority: "high",
  },
  {
    name: "Produktionsunternehmen",
    description: "Industrie mit OT/IT-Schnittstelle",
    industry: "Industrie",
    company_size: "100–1000 MA",
    pain_points: "KRITIS-Nähe, Lieferanten-Compliance, Incident-Prozesse",
    value_proposition: "Incident-Response-Plan, Risikoanalyse, Audit-Ordner",
    priority: "medium",
  },
  {
    name: "Logistikunternehmen",
    description: "Transport und Logistik mit digitalen Systemen",
    industry: "Logistik",
    company_size: "50–500 MA",
    pain_points: "Lieferketten-Sicherheit, NIS2-Betroffenheit unklar",
    value_proposition: "Betroffenheitscheck und Maßnahmenplan für Logistik",
    priority: "medium",
  },
  {
    name: "Gesundheitsnahe Dienstleister",
    description: "Gesundheitswesen und nahe Branchen",
    industry: "Gesundheitswesen",
    company_size: "20–500 MA",
    pain_points: "Hohe Regulierungsdichte, Datenschutz + NIS2",
    value_proposition: "Dokumentation für Gesundheits-IT und Compliance",
    priority: "medium",
  },
];

const DEFAULT_SEARCH_PROFILES = [
  {
    groupMatch: "IT-Systemhäuser",
    name: "IT-Systemhaus Deutschland LinkedIn",
    platform: "LinkedIn",
    search_query: "IT-Systemhaus NIS2 OR IT-Sicherheit Managed Services",
    location: "Deutschland",
    notes: "Manuell suchen — keine Automation. Profile merken, nicht scrapen.",
  },
  {
    groupMatch: "MSPs",
    name: "MSP Microsoft 365 Partner",
    platform: "Google",
    search_query: "MSP Microsoft 365 NIS2 Compliance Deutschland",
    location: "DE",
    notes: "Websites manuell prüfen, Kontaktformular nutzen.",
  },
  {
    groupMatch: "Datenschutzberater",
    name: "Datenschutzberater IHK",
    platform: "IHK-Verzeichnis",
    search_query: "Datenschutzberatung IT-Sicherheit",
    location: "Regional",
    notes: "IHK-Mitgliederverzeichnis manuell durchsuchen.",
  },
];

const DEFAULT_OUTREACH = [
  {
    groupMatch: "IT-Systemhäuser",
    channel: "linkedin",
    purpose: "first_contact",
    subject: null,
    tone: "professionell, partnerschaftlich",
    body: `Hallo {{name}},

ich sehe, dass Sie als IT-Systemhaus KMU-Kunden in Sachen IT betreuen. Viele Ihrer Kunden fragen aktuell nach NIS2-Dokumentation und Audit-Vorbereitung.

Wir haben das TKND NIS2 Control Center entwickelt — ein Tool für Betroffenheitscheck, Dokumentgenerierung und Audit-Ordner-Export.

Hätten Sie Interesse an einem kurzen Austausch oder Pilotzugang?

Hinweis: Keine Rechtsberatung. Unterstützung bei Dokumentation und Organisation.

Freundliche Grüße
TKND Unity GbR`,
  },
  {
    groupMatch: "MSPs",
    channel: "email",
    purpose: "pilot_offer",
    subject: "Pilotzugang TKND NIS2 Control Center für MSPs",
    tone: "sachlich, B2B",
    body: `Guten Tag {{name}},

für MSPs mit Microsoft-365-Kunden bieten wir einen Pilotzugang zum TKND NIS2 Control Center an.

Funktionen: Betroffenheitscheck, NIS2-Dokumente als PDF, Audit-Ordner-ZIP.

Gerne stellen wir Ihnen einen Demo-Termin vor.

Hinweis: Unterstützungstool — keine Garantie auf vollständige Compliance.

Freundliche Grüße
TKND Unity GbR`,
  },
];

const DEFAULT_CONTENT = [
  {
    title: "NIS2-Audit-Ordner in 10 Minuten",
    platform: "LinkedIn",
    content_type: "post",
    hook: "Audit kommt? Die meisten KMU haben die Dokumente verstreut.",
    outline:
      "1. Problem: verstreute Dokumente\n2. Lösung: strukturierter Audit-Ordner\n3. Demo-Hinweis TKND NIS2\n4. CTA: Pilotanfrage",
    call_to_action: "Pilotzugang anfragen — Link in Bio/Kommentar",
  },
  {
    title: "NIS2-Checkliste für IT-Systemhäuser",
    platform: "Website",
    content_type: "checklist",
    hook: "5 Punkte, die Ihre Kunden vor dem NIS2-Audit prüfen sollten",
    outline:
      "Betroffenheit, Dokumentation, Maßnahmenplan, Incident-Prozess, Lieferanten",
    call_to_action: "Kostenlosen Betroffenheitscheck testen",
  },
];

export async function seedTrafficDefaults(
  supabase: SupabaseClient
): Promise<{ groups: number; profiles: number; outreach: number; content: number }> {
  const result = { groups: 0, profiles: 0, outreach: 0, content: 0 };

  const { count } = await supabase
    .from("traffic_target_groups")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) === 0) {
    const { data: inserted } = await supabase
      .from("traffic_target_groups")
      .insert(DEFAULT_TARGET_GROUPS)
      .select();
    result.groups = inserted?.length ?? 0;
  }

  const { data: groups } = await supabase.from("traffic_target_groups").select("id, name");
  const groupMap = new Map((groups ?? []).map((g) => [g.name, g.id]));

  const { count: profileCount } = await supabase
    .from("traffic_search_profiles")
    .select("id", { count: "exact", head: true });

  if ((profileCount ?? 0) === 0) {
    const profiles = DEFAULT_SEARCH_PROFILES.map((p) => ({
      target_group_id: groupMap.get(p.groupMatch) ?? null,
      name: p.name,
      platform: p.platform,
      search_query: p.search_query,
      location: p.location,
      notes: p.notes,
    }));
    const { data } = await supabase.from("traffic_search_profiles").insert(profiles).select();
    result.profiles = data?.length ?? 0;
  }

  const { count: outreachCount } = await supabase
    .from("outreach_drafts")
    .select("id", { count: "exact", head: true });

  if ((outreachCount ?? 0) === 0) {
    const drafts = DEFAULT_OUTREACH.map((o) => ({
      target_group_id: groupMap.get(o.groupMatch) ?? null,
      channel: o.channel,
      purpose: o.purpose,
      subject: o.subject,
      body: o.body,
      tone: o.tone,
      status: "draft",
    }));
    const { data } = await supabase.from("outreach_drafts").insert(drafts).select();
    result.outreach = data?.length ?? 0;
  }

  const { count: contentCount } = await supabase
    .from("content_ideas")
    .select("id", { count: "exact", head: true });

  if ((contentCount ?? 0) === 0) {
    const ideas = DEFAULT_CONTENT.map((c) => ({ ...c, status: "idea" }));
    const { data } = await supabase.from("content_ideas").insert(ideas).select();
    result.content = data?.length ?? 0;
  }

  const { count: campaignCount } = await supabase
    .from("traffic_campaigns")
    .select("id", { count: "exact", head: true });

  if ((campaignCount ?? 0) === 0 && groupMap.has("IT-Systemhäuser")) {
    const { data: campaign } = await supabase
      .from("traffic_campaigns")
      .insert({
        name: "IT-Systemhaus Outreach Q2",
        target_group_id: groupMap.get("IT-Systemhäuser"),
        goal: "20 qualifizierte Gespräche mit IT-Systemhäusern",
        weekly_target: 20,
        status: "active",
        notes: "Manuelle Recherche + LinkedIn/E-Mail — kein Massenversand",
      })
      .select()
      .single();

    if (campaign) {
      const weekTasks = [
        {
          title: "10 IT-Systemhäuser recherchieren",
          description: "LinkedIn/Google manuell — Suchprofile nutzen",
          priority: "high",
          due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
        },
        {
          title: "5 Erstkontakt-Entwürfe anpassen",
          description: "Outreach-Entwürfe personalisieren, nicht massenhaft senden",
          priority: "medium",
          due_date: new Date(Date.now() + 4 * 86400000).toISOString(),
        },
        {
          title: "LinkedIn-Post veröffentlichen",
          description: 'Content-Idee "NIS2-Audit-Ordner" manuell posten',
          priority: "medium",
          due_date: new Date(Date.now() + 5 * 86400000).toISOString(),
        },
      ].map((t) => ({
        ...t,
        campaign_id: campaign.id,
        status: "open",
      }));
      await supabase.from("traffic_tasks").insert(weekTasks);
    }
  }

  await logJarvisEvent(supabase, {
    event_type: "traffic_seed",
    entity_type: "traffic",
    summary: `Traffic-Defaults geladen (${result.groups} Zielgruppen)`,
    details: result,
  });

  return result;
}

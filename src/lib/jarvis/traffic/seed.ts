import type { SupabaseClient } from "@supabase/supabase-js";
import { logJarvisEvent } from "@/lib/jarvis/jarvis-events";

const DEFAULT_TARGET_GROUPS = [
  {
    name: "IT-Systemhäuser",
    description: "Systemhäuser und IT-Dienstleister mit KMU-Kunden",
    industry: "IT-Systemhaus",
    company_size: "10–250 MA",
    pain_points: "Kunden fragen nach NIS2-Nachweisen, wiederkehrende Audit-Vorbereitung",
    value_proposition: "Partner-Modell für skalierbare NIS2-Nachweise bei Kunden",
    priority: "high",
  },
  {
    name: "MSPs",
    description: "Managed Service Provider mit Microsoft-365-Fokus",
    industry: "MSP",
    company_size: "10–500 MA",
    pain_points: "NIS2-Anfragen von Kunden, fehlende wiederholbare Struktur",
    value_proposition: "Ergänzendes Angebot neben Managed Services",
    priority: "high",
  },
  {
    name: "Cybersecurity-Beratung",
    description: "IT-Sicherheits- und Cybersecurity-Berater",
    industry: "Cybersecurity",
    company_size: "5–100 MA",
    pain_points: "Nachweise und Reviews für Kundenprojekte",
    value_proposition: "Partner für strukturierte Kunden-Nachweise",
    priority: "high",
  },
  {
    name: "Datenschutzberater",
    description: "Externe DSB und Datenschutz-Consultants",
    industry: "Datenschutz",
    company_size: "1–50 MA",
    pain_points: "NIS2-Überschneidung mit DSGVO bei Kunden",
    value_proposition: "Ergänzung zum Datenschutz-Portfolio",
    priority: "high",
  },
  {
    name: "Compliance-/NIS2-Beratung",
    description: "GRC-, Compliance- und NIS2-Beratung",
    industry: "Compliance",
    company_size: "5–100 MA",
    pain_points: "Kunden brauchen wiederholbare Nachweisstruktur",
    value_proposition: "Skalierbare Umsetzung in Beratungsmandaten",
    priority: "high",
  },
  {
    name: "Cloud-/Microsoft-365-Beratung",
    description: "Cloud- und M365-Berater für KMU",
    industry: "Cloud / M365",
    company_size: "10–200 MA",
    pain_points: "Zugriffssicherheit und NIS2-Nachweise bei M365-Kunden",
    value_proposition: "Logische Erweiterung der Cloud-Betreuung",
    priority: "high",
  },
  {
    name: "Backup-/Notfallmanagement",
    description: "Backup, BCM und Notfallmanagement-Dienstleister",
    industry: "Backup & BCM",
    company_size: "10–200 MA",
    pain_points: "Wiederherstellungsnachweise für Audits",
    value_proposition: "Strukturierte Nachweisablage für Kunden",
    priority: "medium",
  },
  {
    name: "Sonstiger Partner",
    description: "Digitalisierungspartner und verwandte B2B-Anbieter",
    industry: "B2B-Dienstleistung",
    company_size: "5–250 MA",
    pain_points: "NIS2 wird über Kundenanfragen relevant",
    value_proposition: "Partner-Prüfung im Einzelfall",
    priority: "low",
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

ich sehe, dass Sie als IT-Systemhaus KMU-Kunden betreuen. Aktuell fragen viele Kunden nach NIS2-Nachweisen — oft ohne klare interne Struktur beim Dienstleister.

Ist das bei Ihnen gerade ein Thema bei Kundenanfragen — oder eher nicht?

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

bei MSPs mit Microsoft-365-Kunden höre ich gerade oft: NIS2-Nachweise werden angefragt, bevor intern eine wiederholbare Antwort da ist.

Wie lösen Sie das heute bei Ihren Kunden — oder ist das noch kein Schwerpunkt?

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
      "Kundenanfragen, Dokumentation, Maßnahmenplan, Incident-Prozess, Lieferanten",
    call_to_action: "Partner-Pilot anfragen",
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

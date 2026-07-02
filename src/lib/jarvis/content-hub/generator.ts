import {
  ALLOWED_CTAS,
  type ContentCategory,
  type ContentFormat,
  type ContentHubArea,
} from "@/lib/jarvis/content-hub/constants";
import type { GeneratedPost } from "@/lib/jarvis/content-hub/templates";
import {
  CEO_POSTS,
  MINI_CASE_TEMPLATE,
  POLL_TEMPLATES,
  PRODUCT_INSIGHT_SNIPPETS,
  SEED_POST_BODIES,
  SYSTEMHAUS_POSTS,
} from "@/lib/jarvis/content-hub/templates";

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function pickCta(index = 0): string {
  return ALLOWED_CTAS[index % ALLOWED_CTAS.length];
}

function expandToFormat(body: string, format: ContentFormat): string {
  if (format === "short_post" || format === "tip_week") {
    return body.split("\n\n").slice(0, 2).join("\n\n");
  }
  if (format === "expert_post") {
    return `${body}\n\nPraxis-Tipp: Struktur schlägt Vollständigkeit. Lieber wenige, gepflegte Nachweise als dutzende veraltete Dokumente.\n\nIm Audit zählt nicht nur was geplant wurde — sondern was nachweisbar umgesetzt ist.`;
  }
  return body;
}

const SERIES_TOPIC_BODIES: Record<string, string> = {
  risks: `Tag 1 — Risiken\n\nOhne priorisierte Risiken fehlt die Grundlage für sinnvolle Maßnahmen.\n\nFrage fürs Audit: Welche Risiken sind dokumentiert — und wer ist verantwortlich?`,
  measures: `Tag 2 — Maßnahmen\n\nMaßnahmenpläne gibt es oft.\n\nSchwieriger: Status, Verantwortliche und Nachweis je Maßnahme.`,
  vendors: `Tag 3 — Lieferanten\n\nKritische Lieferanten identifizieren ist Schritt eins.\n\nSchritt zwei: Bewertung nachvollziehbar dokumentieren.`,
  training: `Tag 4 — Schulungen\n\nSchulungen durchgeführt?\n\nZeigen Sie Nachweise — Teilnehmer, Datum, Inhalt, Wiederholung.`,
  evidence_audit: `Tag 5 — Nachweise & Audit\n\nDer Audit-Moment zeigt, ob Struktur oder Chaos herrscht.\n\nZentrale Ablage spart Tage — nicht Minuten.`,
  no_evidence: `Häufiger NIS2-Fehler #1: Maßnahmen ohne Nachweis.\n\nIm Audit reicht „haben wir gemacht" selten.`,
  no_owners: `Fehler #2: Keine klaren Verantwortlichkeiten.\n\nRisiken und Maßnahmen ohne Owner werden im Ernstfall niemandes Problem.`,
  audit_structure: `Fehler #5: Keine Auditstruktur.\n\nWenn jedes Audit eine neue Schatzsuche ist, fehlt das System.`,
  tasks: `Fehler #6: Maßnahmen nicht verfolgt.\n\nOffene Punkte ohne Aufgabensteuerung veralten still.`,
  outdated_docs: `Fehler #7: Dokumente nicht aktuell.\n\nEin veralteter Nachweis ist im Audit oft schlimmer als keiner.`,
};

export function generatePostFromSeed(
  seedIndex: number,
  format: ContentFormat = "standard_post"
): GeneratedPost {
  const seed = SEED_POST_BODIES[seedIndex % SEED_POST_BODIES.length];
  const body = expandToFormat(seed.body, format);
  return {
    title: seed.title,
    category: seed.category,
    hub_area: seed.hub_area,
    format,
    hook: seed.hook ?? null,
    body,
    call_to_action: seed.cta ?? pickCta(seedIndex),
    word_count: wordCount(body),
    tags: [seed.category, seed.hub_area],
  };
}

export function generatePoll(pollIndex = 0): GeneratedPost {
  const poll = POLL_TEMPLATES[pollIndex % POLL_TEMPLATES.length];
  const body = `${poll.question}\n\nOptionen:\n${poll.options.map((o) => `• ${o}`).join("\n")}`;
  return {
    title: poll.title,
    category: poll.category,
    hub_area: "polls",
    format: "poll",
    hook: null,
    body,
    call_to_action: pickCta(2),
    poll_question: poll.question,
    poll_options: poll.options,
    word_count: wordCount(body),
    tags: ["poll", poll.category],
  };
}

export function generateMiniCase(): GeneratedPost {
  const c = MINI_CASE_TEMPLATE;
  const body = `Ausgangssituation\n${c.situation}\n\nProblem\n${c.problem}\n\nLösung\n${c.solution}\n\nErgebnis\n${c.outcome}`;
  return {
    title: c.title,
    category: c.category,
    hub_area: c.hub_area,
    format: "story",
    hook: "Mini Case aus der Praxis",
    body,
    call_to_action: pickCta(3),
    word_count: wordCount(body),
    tags: ["mini_case", "evidence"],
  };
}

export function generateByCategory(
  category: ContentCategory,
  format: ContentFormat = "standard_post",
  hub_area: ContentHubArea = "linkedin_posts"
): GeneratedPost {
  const categorySeeds = SEED_POST_BODIES.filter((s) => s.category === category);
  if (categorySeeds.length > 0) {
    const seed = categorySeeds[Math.floor(Math.random() * categorySeeds.length)];
    const body = expandToFormat(seed.body, format);
    return {
      title: seed.title,
      category,
      hub_area,
      format,
      hook: seed.hook ?? null,
      body,
      call_to_action: seed.cta ?? pickCta(0),
      word_count: wordCount(body),
      tags: [category],
    };
  }

  if (category === "systemhaus") {
    const s = SYSTEMHAUS_POSTS[0];
    const body = expandToFormat(s.body, format);
    return {
      title: s.title,
      category,
      hub_area: "industry",
      format: "msp_perspective",
      hook: null,
      body,
      call_to_action: pickCta(1),
      word_count: wordCount(body),
      tags: ["systemhaus", "msp"],
    };
  }

  if (category === "management") {
    const s = CEO_POSTS[0];
    const body = expandToFormat(s.body, format);
    return {
      title: s.title,
      category,
      hub_area: "ceo_content",
      format: "ceo_perspective",
      hook: null,
      body,
      call_to_action: pickCta(4),
      word_count: wordCount(body),
      tags: ["ceo", "management"],
    };
  }

  const insight = PRODUCT_INSIGHT_SNIPPETS[Math.floor(Math.random() * PRODUCT_INSIGHT_SNIPPETS.length)];
  const body = expandToFormat(`${insight}\n\nKein Buzzword-Marketing — echte Situationen aus Audits und Beratungsmandaten.`, format);
  return {
    title: `Einblick — ${category}`,
    category,
    hub_area,
    format,
    hook: null,
    body,
    call_to_action: pickCta(0),
    word_count: wordCount(body),
    tags: [category, "product_insight"],
  };
}

export function generateSeriesDayPost(
  seriesSlug: string,
  day: number,
  topic: string,
  title: string,
  category: ContentCategory
): GeneratedPost {
  const body = SERIES_TOPIC_BODIES[topic] ?? `${title}\n\n${topic}`;
  return {
    title,
    category,
    hub_area: "campaign_series",
    format: "standard_post",
    hook: `Serie: ${seriesSlug} — Tag ${day}`,
    body,
    call_to_action: pickCta(day),
    word_count: wordCount(body),
    tags: ["series", seriesSlug, `day_${day}`],
  };
}

export function generateBatch(count: number): GeneratedPost[] {
  const posts: GeneratedPost[] = [];
  for (let i = 0; i < count; i++) {
    if (i % 10 === 7) posts.push(generatePoll(i % POLL_TEMPLATES.length));
    else if (i % 10 === 4) posts.push(generateMiniCase());
    else posts.push(generatePostFromSeed(i, i % 3 === 0 ? "short_post" : "standard_post"));
  }
  return posts;
}

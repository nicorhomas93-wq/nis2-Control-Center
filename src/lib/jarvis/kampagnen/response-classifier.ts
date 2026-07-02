import type { LinkedInResponseType } from "@/lib/jarvis/kampagnen/constants";

export type ExtendedResponseType =
  | LinkedInResponseType
  | "technical_question"
  | "security_question"
  | "management_review"
  | "wrong_contact"
  | "unclear"
  | "purchase_intent";

export interface ClassificationResult {
  response_type: ExtendedResponseType;
  confidence: "high" | "medium" | "low";
  matched_signals: string[];
}

const RULES: Array<{
  type: ExtendedResponseType;
  patterns: RegExp[];
}> = [
  {
    type: "no_interest",
    patterns: [
      /kein interesse/i,
      /nicht interessiert/i,
      /nicht relevant/i,
      /kein bedarf/i,
      /bitte nicht mehr/i,
      /abmelden/i,
    ],
  },
  {
    type: "demo_requested",
    patterns: [
      /demo/i,
      /termin/i,
      /live zeigen/i,
      /kurz zeigen/i,
      /präsentation/i,
      /meeting/i,
      /call/i,
      /gespräch/i,
    ],
  },
  {
    type: "pricing_question",
    patterns: [
      /preis/i,
      /kosten/i,
      /was kostet/i,
      /lizenz/i,
      /angebot/i,
      /kostenlos/i,
      /monatlich/i,
      /€|euro/i,
    ],
  },
  {
    type: "purchase_intent",
    patterns: [
      /angebot schicken/i,
      /einführung/i,
      /wie läuft/i,
      /welche lizenz/i,
      /kaufen/i,
      /beauftragen/i,
    ],
  },
  {
    type: "security_question",
    patterns: [
      /datenschutz/i,
      /dsgvo/i,
      /security/i,
      /sicherheit/i,
      /mandantentrennung/i,
      /hosting/i,
      /serverstandort/i,
      /iso\s*27001/i,
    ],
  },
  {
    type: "technical_question",
    patterns: [
      /technisch/i,
      /integration/i,
      /api/i,
      /schnittstelle/i,
      /microsoft/i,
      /m365/i,
      /export/i,
      /funktioniert/i,
    ],
  },
  {
    type: "management_review",
    patterns: [
      /geschäftsführung/i,
      /geschaeftsfuehrung/i,
      /intern prüfen/i,
      /intern klären/i,
      /vorstand/i,
      /leitung/i,
      /entscheidung/i,
      /intern besprechen/i,
    ],
  },
  {
    type: "wrong_contact",
    patterns: [
      /falscher ansprechpartner/i,
      /nicht zuständig/i,
      /nicht zustaendig/i,
      /weiterleiten/i,
      /kollege/i,
      /andere abteilung/i,
    ],
  },
  {
    type: "contact_later",
    patterns: [
      /später/i,
      /spaeter/i,
      /nächstes quartal/i,
      /in einigen wochen/i,
      /melden mich/i,
      /aktuell kein/i,
      /jetzt nicht/i,
    ],
  },
  {
    type: "info_requested",
    patterns: [
      /infos/i,
      /informationen/i,
      /unterlagen/i,
      /pdf/i,
      /broschüre/i,
      /mehr details/i,
      /zusenden/i,
      /schicken sie/i,
    ],
  },
  {
    type: "internal_forward",
    patterns: [/weiterleitung intern/i, /an kollegen/i, /an unser team/i],
  },
  {
    type: "interest",
    patterns: [
      /interessant/i,
      /interesse/i,
      /klingt gut/i,
      /gerne/i,
      /spannend/i,
      /hört sich gut an/i,
    ],
  },
];

export function classifyResponseText(text: string): ClassificationResult {
  const normalized = text.trim();
  if (!normalized) {
    return { response_type: "unclear", confidence: "low", matched_signals: [] };
  }

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(normalized)) {
        return {
          response_type: rule.type,
          confidence: "high",
          matched_signals: [pattern.source],
        };
      }
    }
  }

  if (normalized.length < 40) {
    return { response_type: "unclear", confidence: "low", matched_signals: ["Kurze Antwort"] };
  }

  return { response_type: "interest", confidence: "medium", matched_signals: ["Standard: Interesse"] };
}

export function normalizeResponseType(
  manual: string | undefined,
  classified: ExtendedResponseType
): ExtendedResponseType {
  if (manual && manual !== "auto" && manual !== "unclear") {
    return manual as ExtendedResponseType;
  }
  return classified;
}

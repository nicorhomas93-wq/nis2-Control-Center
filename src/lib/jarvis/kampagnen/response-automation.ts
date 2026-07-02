import type { LinkedInCampaignLeadStatus } from "@/lib/jarvis/kampagnen/constants";
import {
  classifyResponseText,
  normalizeResponseType,
  type ExtendedResponseType,
} from "@/lib/jarvis/kampagnen/response-classifier";
import {
  buildReplySuggestion,
  followUpDaysForType,
  offerNotesForType,
  suggestLicense,
} from "@/lib/jarvis/kampagnen/reply-suggestions";
import { followUpInDays } from "@/lib/jarvis/kampagnen/lead-actions";

export interface ProcessResponseInput {
  response_text: string;
  manual_type?: string;
  contact_name?: string | null;
  company_name: string;
  channel?: string;
}

export interface CampaignTaskDraft {
  title: string;
  description: string;
  task_type: string;
  due_at: string | null;
}

export interface ProcessResponseResult {
  response_type: ExtendedResponseType;
  classification_confidence: string;
  lead_status: LinkedInCampaignLeadStatus;
  next_step: string;
  suggested_reply: string;
  follow_up_at: string | null;
  reminder_type: string | null;
  offer_notes: string | null;
  suggested_license: string | null;
  task: CampaignTaskDraft | null;
  create_demo: boolean;
  demo_notes: string | null;
  management_review_at: string | null;
}

function mapTypeToLeadStatus(type: ExtendedResponseType): LinkedInCampaignLeadStatus {
  switch (type) {
    case "demo_requested":
      return "demo_scheduled";
    case "pricing_question":
    case "purchase_intent":
      return "quote_requested";
    case "management_review":
      return "management_review";
    case "no_interest":
      return "lost";
    case "contact_later":
    case "wrong_contact":
      return "follow_up_later";
    default:
      return "replied";
  }
}

function taskForType(
  type: ExtendedResponseType,
  company_name: string,
  due_at: string | null
): CampaignTaskDraft | null {
  const base = { due_at };

  switch (type) {
    case "interest":
      return {
        ...base,
        title: "Demo anbieten",
        description: `${company_name} — Interesse bestätigt, Demo-Termin vorschlagen`,
        task_type: "demo_offer",
      };
    case "demo_requested":
      return {
        ...base,
        title: "Demo-Termin abstimmen",
        description: `${company_name} — Terminvorschläge senden (manuell)`,
        task_type: "demo_schedule",
      };
    case "info_requested":
      return {
        ...base,
        title: "Infos / PDF senden",
        description: `${company_name} — Übersicht senden, dann Follow-Up`,
        task_type: "send_info",
      };
    case "pricing_question":
    case "purchase_intent":
      return {
        ...base,
        title: "Angebot vorbereiten",
        description: `${company_name} — Lizenzmodell klären und Angebot vorbereiten`,
        task_type: "prepare_offer",
      };
    case "management_review":
      return {
        ...base,
        title: "Follow-up Geschäftsführung",
        description: `${company_name} — in 5–7 Tagen nachfassen`,
        task_type: "management_follow_up",
      };
    case "security_question":
    case "technical_question":
      return {
        ...base,
        title: "Fachfrage beantworten",
        description: `${company_name} — Demo oder Detailantwort vorbereiten`,
        task_type: "answer_question",
      };
    case "contact_later":
      return {
        ...base,
        title: "Wiedervorlage",
        description: `${company_name} — später erneut kontaktieren`,
        task_type: "follow_up_later",
      };
    case "wrong_contact":
      return {
        ...base,
        title: "Richtigen Ansprechpartner ermitteln",
        description: `${company_name} — neuen Kontakt erfragen`,
        task_type: "find_contact",
      };
    case "unclear":
      return {
        ...base,
        title: "Antwort klären",
        description: `${company_name} — Rückfrage zur Klärung senden (manuell)`,
        task_type: "clarify",
      };
    case "no_interest":
      return null;
    default:
      return {
        ...base,
        title: "Follow-up",
        description: `${company_name} — nächsten Schritt manuell senden`,
        task_type: "follow_up",
      };
  }
}

function nextStepForType(type: ExtendedResponseType): string {
  switch (type) {
    case "interest":
      return "Demo anbieten — Antwortvorschlag prüfen und manuell senden";
    case "demo_requested":
      return "Demo-Termin abstimmen — Kalender vorbereiten";
    case "info_requested":
      return "Informationen/PDF senden — Antwort manuell versenden";
    case "pricing_question":
    case "purchase_intent":
      return "Preisstruktur erklären — ggf. Angebot vorbereiten";
    case "management_review":
      return "Geschäftsführung prüft — Follow-up in 5–7 Tagen";
    case "security_question":
      return "Datenschutz/Security erläutern — Demo anbieten";
    case "technical_question":
      return "Technische Frage beantworten — Demo optional";
    case "contact_later":
      return "Später erneut prüfen — Wiedervorlage gesetzt";
    case "wrong_contact":
      return "Richtigen Ansprechpartner erfragen";
    case "no_interest":
      return "Kein weiteres Follow-up";
    case "unclear":
      return "Klärungsfrage senden (manuell)";
    default:
      return "Antwort manuell prüfen und senden";
  }
}

export function processIncomingResponse(input: ProcessResponseInput): ProcessResponseResult {
  const classified = classifyResponseText(input.response_text);
  const response_type = normalizeResponseType(input.manual_type, classified.response_type);
  const followDays = followUpDaysForType(response_type);
  const follow_up_at = followDays != null ? followUpInDays(followDays) : null;

  const suggested_reply = buildReplySuggestion({
    response_type,
    contact_name: input.contact_name,
    company_name: input.company_name,
  });

  const task = taskForType(response_type, input.company_name, follow_up_at);

  return {
    response_type,
    classification_confidence: classified.confidence,
    lead_status: mapTypeToLeadStatus(response_type),
    next_step: nextStepForType(response_type),
    suggested_reply,
    follow_up_at,
    reminder_type:
      response_type === "pricing_question" || response_type === "purchase_intent"
        ? "offer_open"
        : response_type === "management_review"
          ? "follow_up_7d"
          : follow_up_at
            ? "follow_up_7d"
            : null,
    offer_notes: offerNotesForType(response_type, input.company_name),
    suggested_license: suggestLicense(response_type),
    task,
    create_demo: response_type === "demo_requested",
    demo_notes:
      response_type === "demo_requested"
        ? `Demo gewünscht von ${input.company_name} — Termin mit Nico abstimmen`
        : null,
    management_review_at:
      response_type === "management_review" ? new Date().toISOString() : null,
  };
}

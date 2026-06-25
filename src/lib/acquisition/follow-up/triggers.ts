import type { AcquisitionEventType } from "@/lib/acquisition/types";

export type FollowUpTrigger = "A" | "B" | "C" | "D";

export type LifecycleStatus =
  | "check_complete"
  | "awaiting_email"
  | "nurturing"
  | "high_intent"
  | "converted"
  | "paused";

export type SequenceId = "standard_nurture" | "high_intent";

export interface TriggerDefinition {
  id: FollowUpTrigger;
  name: string;
  event: AcquisitionEventType | AcquisitionEventType[];
  condition: string;
  action: string;
}

export const FOLLOW_UP_TRIGGERS: TriggerDefinition[] = [
  {
    id: "A",
    name: "Check abgeschlossen, kein Upgrade",
    event: "check_completed",
    condition: "Kein upgrade_click, kein converted_at",
    action: "Lead anlegen, lifecycle=check_complete, Sequenz vorbereiten",
  },
  {
    id: "B",
    name: "Result Page verlassen",
    event: "result_page_leave",
    condition: "page_path=/result, kein upgrade_click",
    action: "Trigger B: E-Mail-Sequenz starten (wenn E-Mail) oder Retargeting",
  },
  {
    id: "C",
    name: "E-Mail hinterlegt",
    event: "email_captured",
    condition: "Gültige E-Mail auf Result Page",
    action: "5-E-Mail-Sequenz sofort planen (Tag 0–7)",
  },
  {
    id: "D",
    name: "Wiederkehr auf Site",
    event: "site_return",
    condition: "visit_count ≥ 2 und check_completed",
    action: "strong_cta=true, stärkeres Angebot in UI",
  },
];

export const BEHAVIOR_RULES = {
  emailLinkClick: {
    condition: "email_link_click Event",
    actions: [
      "Standard-Sequenz pausieren (pending → paused)",
      "lifecycle_status → high_intent",
      "High-Intent-Sequenz planen",
    ],
  },
  siteRevisit: {
    condition: "site_return oder visit_count ≥ 2",
    actions: ["strong_cta=true", "strong_offer_eligible beibehalten"],
  },
  upgradePageLeave: {
    condition: "upgrade_page_leave ohne Checkout",
    actions: [
      "Sofort-E-Mail: high_intent_abandon",
      "lifecycle_status → high_intent",
    ],
  },
  converted: {
    condition: "Stripe checkout success oder upgrade_click mit Session",
    actions: ["lifecycle_status → converted", "Alle pending E-Mails canceln"],
  },
} as const;

export type FollowUpEventType =
  | AcquisitionEventType
  | "result_page_leave"
  | "upgrade_page_leave"
  | "email_link_click"
  | "site_return"
  | "nurture_started"
  | "sequence_paused"
  | "sequence_switched";

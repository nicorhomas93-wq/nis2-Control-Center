import type { CampaignTemplate } from "@/lib/jarvis/kampagnen/templates";

export function buildLinkedInMessageSuggestion(input: {
  company_name: string;
  contact_name?: string | null;
  target_group?: string | null;
  campaign_goal?: string | null;
}): string {
  const greeting = input.contact_name?.trim()
    ? `Hallo ${input.contact_name.trim().split(" ")[0]},`
    : "Hallo,";

  const group = input.target_group?.trim() || "IT-Dienstleister";
  const goal =
    input.campaign_goal?.trim() ||
    "NIS2-Dokumentation und Auditmanagement für KMU-Mandanten";

  return `${greeting}

ich bin auf ${input.company_name} aufmerksam geworden — spannend, was ihr im Bereich ${group} macht.

Wir haben mit dem TKND NIS2 Control Center eine Plattform gebaut, mit der Partner wie ihr ${goal} strukturiert abbilden können — white-label-fähig, ohne euer Portfolio zu verkomplizieren.

Hättet ihr grundsätzlich Interesse an einem kurzen Austausch (15 Min.), ob das für eure Mandanten relevant sein könnte?

Beste Grüße
Nico`;
}

export function buildMessageFromTemplate(
  template: CampaignTemplate,
  companyName: string,
  contactName?: string | null
): string {
  return buildLinkedInMessageSuggestion({
    company_name: companyName,
    contact_name: contactName,
    target_group: template.target_group,
    campaign_goal: template.goal,
  });
}

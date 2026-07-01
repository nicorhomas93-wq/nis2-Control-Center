"use client";

import { Badge } from "@/components/ui/Badge";
import {
  LEAD_STATUS_LABELS,
} from "@/lib/jarvis/constants";
import {
  calculateLeadScore,
  getLeadScoreCategoryColor,
} from "@/lib/jarvis/lead-scoring";
import { CustomerMessageSection } from "@/components/jarvis/customer-message/CustomerMessageSection";
import { customerMessageTargetFromLead } from "@/lib/jarvis/customer-message/targets";
import type { Lead } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function LeadScoreBadge({ lead }: { lead: Lead }) {
  const scoring = calculateLeadScore(lead);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-900">{scoring.score}</span>
        <Badge className={getLeadScoreCategoryColor(scoring.category)}>
          {scoring.categoryLabel}
        </Badge>
      </div>
      <ul className="text-xs text-slate-500">
        {scoring.reasons.slice(0, 3).map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Noch keine Leads. Synchronisieren Sie Pilotanfragen oder legen Sie Leads manuell an.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-3 pr-4 font-medium">Unternehmen</th>
            <th className="py-3 pr-4 font-medium">Kontakt</th>
            <th className="py-3 pr-4 font-medium">Status</th>
            <th className="py-3 pr-4 font-medium">Score</th>
            <th className="py-3 pr-4 font-medium">Quelle</th>
            <th className="py-3 pr-4 font-medium">Erstellt</th>
            <th className="py-3 font-medium">Nachrichten</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-slate-100">
              <td className="py-3 pr-4 font-medium text-slate-900">
                {lead.company_name ?? "—"}
              </td>
              <td className="py-3 pr-4">
                <div>{lead.contact_name ?? "—"}</div>
                <div className="text-xs text-slate-500">{lead.email ?? "—"}</div>
              </td>
              <td className="py-3 pr-4">
                <Badge className="bg-slate-100 text-slate-700">
                  {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                </Badge>
              </td>
              <td className="py-3 pr-4">
                <LeadScoreBadge lead={lead} />
              </td>
              <td className="py-3 pr-4 text-slate-600">{lead.source ?? "—"}</td>
              <td className="py-3 pr-4 text-slate-500">{formatDate(lead.created_at)}</td>
              <td className="py-3">
                <CustomerMessageSection
                  target={customerMessageTargetFromLead(lead)}
                  compact
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { Badge } from "@/components/ui/Badge";
import { LEAD_STATUS_LABELS } from "@/lib/jarvis/constants";
import { getLeadScoreCategory, getLeadScoreCategoryColor } from "@/lib/jarvis/lead-scoring";
import type { Lead } from "@/lib/types";

const PIPELINE_COLUMNS = [
  "new",
  "qualified",
  "contacted",
  "replied",
  "demo_scheduled",
  "proposal_sent",
  "won",
  "lost",
] as const;

export function SalesPipeline({ leads }: { leads: Lead[] }) {
  return (
    <div className="grid gap-4 grid-cols-4">
      {PIPELINE_COLUMNS.map((status) => {
        const columnLeads = leads.filter((l) => l.status === status);
        return (
          <div
            key={status}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                {LEAD_STATUS_LABELS[status]}
              </h3>
              <Badge className="bg-white text-slate-600">{columnLeads.length}</Badge>
            </div>
            <div className="space-y-2">
              {columnLeads.length === 0 ? (
                <p className="text-xs text-slate-400">Leer</p>
              ) : (
                columnLeads.map((lead) => {
                  const category = getLeadScoreCategory(lead.lead_score);
                  return (
                    <div
                      key={lead.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <p className="font-medium text-slate-900">
                        {lead.company_name ?? "Unbekannt"}
                      </p>
                      <p className="text-xs text-slate-500">{lead.contact_name}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs font-semibold">{lead.lead_score}</span>
                        <Badge className={getLeadScoreCategoryColor(category)}>
                          {category}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

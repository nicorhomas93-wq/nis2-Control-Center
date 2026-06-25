import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/jarvis/traffic/constants";
import type { TrafficCampaign } from "@/lib/types";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  planned: "bg-sky-100 text-sky-800",
  paused: "bg-amber-100 text-amber-800",
  completed: "bg-slate-100 text-slate-600",
};

export function CampaignsList({ campaigns }: { campaigns: TrafficCampaign[] }) {
  if (campaigns.length === 0) {
    return <p className="text-sm text-slate-500">Keine Kampagnen angelegt.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {campaigns.map((campaign) => (
        <Card key={campaign.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
            <CardTitle className="text-base">{campaign.name}</CardTitle>
            <Badge className={statusColors[campaign.status] ?? statusColors.planned}>
              {CAMPAIGN_STATUS_LABELS[campaign.status] ?? campaign.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            {campaign.target_group?.name && (
              <p>Zielgruppe: {campaign.target_group.name}</p>
            )}
            {campaign.goal && <p>Ziel: {campaign.goal}</p>}
            <p className="font-medium text-slate-900">
              Wochenziel: {campaign.weekly_target} manuelle Kontakte
            </p>
            {campaign.notes && (
              <p className="text-xs text-slate-500">{campaign.notes}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

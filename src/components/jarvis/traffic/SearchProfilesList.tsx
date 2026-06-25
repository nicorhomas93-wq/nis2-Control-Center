import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { TrafficSearchProfile } from "@/lib/types";

export function SearchProfilesList({
  profiles,
}: {
  profiles: TrafficSearchProfile[];
}) {
  if (profiles.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Keine Suchprofile. Standard-Daten laden unter Zielgruppen.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {profiles.map((profile) => (
        <Card key={profile.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{profile.name}</CardTitle>
            <p className="text-xs text-slate-500">
              {profile.platform}
              {profile.target_group?.name ? ` · ${profile.target_group.name}` : ""}
              {profile.location ? ` · ${profile.location}` : ""}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {profile.search_query && (
              <div className="rounded-lg bg-slate-50 p-3 font-mono text-slate-800">
                {profile.search_query}
              </div>
            )}
            {profile.notes && (
              <p className="text-xs text-amber-800">{profile.notes}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

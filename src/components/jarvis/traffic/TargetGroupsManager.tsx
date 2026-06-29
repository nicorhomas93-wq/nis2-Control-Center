"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { SeedTrafficButton } from "@/components/jarvis/traffic/SeedTrafficButton";
import type { TrafficTargetGroup } from "@/lib/types";

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-600",
};

export function TargetGroupsManager({
  groups,
}: {
  groups: TrafficTargetGroup[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    industry: "",
    company_size: "",
    pain_points: "",
    value_proposition: "",
    priority: "medium",
  });

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/jarvis/traffic/target-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setShowForm(false);
      setForm({
        name: "",
        description: "",
        industry: "",
        company_size: "",
        pain_points: "",
        value_proposition: "",
        priority: "medium",
      });
      router.refresh();
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/jarvis/traffic/target-groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Abbrechen" : "Neue Zielgruppe"}
        </Button>
        {groups.length === 0 && <SeedTrafficButton />}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Zielgruppe anlegen</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createGroup} className="grid gap-4 grid-cols-2">
              <div>
                <Label htmlFor="tg-name">Name *</Label>
                <Input
                  id="tg-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tg-industry">Branche</Label>
                <Input
                  id="tg-industry"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="tg-desc">Beschreibung</Label>
                <Textarea
                  id="tg-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tg-size">Unternehmensgröße</Label>
                <Input
                  id="tg-size"
                  value={form.company_size}
                  onChange={(e) => setForm({ ...form, company_size: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tg-priority">Priorität</Label>
                <select
                  id="tg-priority"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="high">Hoch</option>
                  <option value="medium">Mittel</option>
                  <option value="low">Niedrig</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="tg-pain">Pain Points</Label>
                <Textarea
                  id="tg-pain"
                  value={form.pain_points}
                  onChange={(e) => setForm({ ...form, pain_points: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="tg-value">Value Proposition</Label>
                <Textarea
                  id="tg-value"
                  value={form.value_proposition}
                  onChange={(e) =>
                    setForm({ ...form, value_proposition: e.target.value })
                  }
                />
              </div>
              <div>
                <Button type="submit" disabled={loading}>
                  Speichern
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {groups.length === 0 ? (
        <p className="text-sm text-slate-500">
          Noch keine Zielgruppen. Laden Sie Standard-Daten oder legen Sie manuell an.
        </p>
      ) : (
        <div className="grid gap-4 grid-cols-2">
          {groups.map((group) => (
            <Card key={group.id} className={!group.active ? "opacity-60" : ""}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    {group.industry} · {group.company_size}
                  </p>
                </div>
                <Badge className={priorityColors[group.priority] ?? priorityColors.medium}>
                  {group.priority}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {group.description && (
                  <p className="text-slate-600">{group.description}</p>
                )}
                {group.pain_points && (
                  <div>
                    <p className="font-medium text-slate-700">Pain Points</p>
                    <p className="text-slate-600">{group.pain_points}</p>
                  </div>
                )}
                {group.value_proposition && (
                  <div>
                    <p className="font-medium text-slate-700">Value Proposition</p>
                    <p className="text-slate-600">{group.value_proposition}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleActive(group.id, group.active)}
                >
                  {group.active ? "Deaktivieren" : "Aktivieren"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

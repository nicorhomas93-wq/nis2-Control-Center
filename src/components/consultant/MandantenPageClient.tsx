"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Plus } from "lucide-react";
import type { Company } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

interface MandantenPageClientProps {
  mandanten: Company[];
  activeCompanyId: string | null;
  ownCompanyId: string;
}

export function MandantenPageClient({
  mandanten,
  activeCompanyId,
  ownCompanyId,
}: MandantenPageClientProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectMandant(companyId: string | null) {
    setLoadingId(companyId ?? "own");
    setError(null);
    try {
      const res = await fetch("/api/consultant/select-mandant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Auswahl fehlgeschlagen");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auswahl fehlgeschlagen");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/consultant/mandanten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyName, industry }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Mandant konnte nicht angelegt werden");
      }
      setCompanyName("");
      setIndustry("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anlegen fehlgeschlagen");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Eigenes Profil</CardTitle>
          <CardDescription>
            Ihr Consultant-Konto — Abrechnung und Einstellungen beziehen sich auf dieses Profil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant={!activeCompanyId || activeCompanyId === ownCompanyId ? "primary" : "outline"}
            onClick={() => selectMandant(null)}
            disabled={loadingId !== null}
          >
            {!activeCompanyId || activeCompanyId === ownCompanyId ? (
              <Check className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            Eigenes Unternehmen öffnen
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Mandanten</h2>
          <p className="text-sm text-slate-500">
            Wählen Sie einen Mandanten — Dashboard, Dokumente und Audit beziehen sich dann auf diesen Kunden.
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          Mandant anlegen
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Neuer Mandant</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="mandant-name">
                  Firmenname
                </label>
                <input
                  id="mandant-name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="z. B. Müller GmbH"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="mandant-industry">
                  Branche (optional)
                </label>
                <input
                  id="mandant-industry"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="z. B. Maschinenbau"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? "Wird angelegt…" : "Mandant speichern"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Abbrechen
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 grid-cols-2">
        {mandanten.map((mandant) => {
          const isActive = activeCompanyId === mandant.id;
          return (
            <Card key={mandant.id} className={isActive ? "border-brand-300 ring-1 ring-brand-200" : undefined}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{mandant.company_name ?? "Unbenannt"}</CardTitle>
                    <CardDescription>{mandant.industry ?? "Branche nicht hinterlegt"}</CardDescription>
                  </div>
                  {isActive && (
                    <Badge className="bg-brand-100 text-brand-800">Aktiv</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant={isActive ? "primary" : "outline"}
                  onClick={() => selectMandant(mandant.id)}
                  disabled={loadingId !== null}
                >
                  {loadingId === mandant.id ? "Wird geöffnet…" : isActive ? "Im Dashboard öffnen" : "Mandant auswählen"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

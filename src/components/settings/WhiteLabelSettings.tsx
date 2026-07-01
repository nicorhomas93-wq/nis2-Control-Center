"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Palette, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Checkbox } from "@/components/ui/Checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import type { ConsultantSettings } from "@/lib/white-label/types";

interface WhiteLabelSettingsProps {
  allowed: boolean;
  companyId: string | null;
  initialSettings: ConsultantSettings | null;
  missingTable?: boolean;
}

export function WhiteLabelSettings({
  allowed,
  companyId,
  initialSettings,
  missingTable,
}: WhiteLabelSettingsProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    white_label_enabled: initialSettings?.white_label_enabled ?? false,
    display_name: initialSettings?.display_name ?? "",
    primary_color: initialSettings?.primary_color ?? "#2563eb",
    secondary_color: initialSettings?.secondary_color ?? "#dbeafe",
    accent_color: initialSettings?.accent_color ?? "#60a5fa",
    email_sender_name: initialSettings?.email_sender_name ?? "",
    support_email: initialSettings?.support_email ?? "",
    custom_domain: initialSettings?.custom_domain ?? "",
  });
  const [logoUrl, setLogoUrl] = useState(initialSettings?.logo_url ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    setForm({
      white_label_enabled: initialSettings?.white_label_enabled ?? false,
      display_name: initialSettings?.display_name ?? "",
      primary_color: initialSettings?.primary_color ?? "#2563eb",
      secondary_color: initialSettings?.secondary_color ?? "#dbeafe",
      accent_color: initialSettings?.accent_color ?? "#60a5fa",
      email_sender_name: initialSettings?.email_sender_name ?? "",
      support_email: initialSettings?.support_email ?? "",
      custom_domain: initialSettings?.custom_domain ?? "",
    });
    setLogoUrl(initialSettings?.logo_url ?? "");
  }, [initialSettings]);

  if (!allowed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>White-Label Einstellungen</CardTitle>
          <CardDescription>
            Eigenes Branding ist im Plan „Consultant / Systemhaus“ verfügbar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Nutzen Sie das System unter Ihrer Marke mit eigenem Logo, Farben und Domain-Hinweis.
            Upgraden Sie auf den Consultant-Plan, um White-Label zu aktivieren.
          </p>
        </CardContent>
      </Card>
    );
  }

  async function handleSave() {
    if (!companyId) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/consultant/white-label", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          logo_url: logoUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Speichern fehlgeschlagen");
      }
      setFeedback({ type: "success", text: "White-Label-Einstellungen gespeichert." });
      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Speichern fehlgeschlagen",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file: File) {
    setUploading(true);
    setFeedback(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/consultant/white-label/logo", {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Logo-Upload fehlgeschlagen");
      }
      setLogoUrl(data.logo_url);
      setFeedback({ type: "success", text: "Logo hochgeladen." });
      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Logo-Upload fehlgeschlagen",
      });
    } finally {
      setUploading(false);
    }
  }

  const showFields = form.white_label_enabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-brand-600" />
          White-Label Einstellungen
        </CardTitle>
        <CardDescription>
          Präsentieren Sie das Control Center unter Ihrer Marke — für Kunden und Mandanten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {missingTable && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Datenbank-Migration für White-Label fehlt. Bitte{" "}
            <code className="text-xs">add_consultant_white_label.sql</code> ausführen.
          </p>
        )}

        <Checkbox
          id="white-label-enabled"
          label="White-Label aktivieren"
          checked={form.white_label_enabled}
          onChange={(e) => setForm((prev) => ({ ...prev, white_label_enabled: e.target.checked }))}
        />

        {showFields && (
          <div className="space-y-5 border-t border-slate-100 pt-5">
            <div>
              <Label htmlFor="display_name">Firmenname (Anzeige)</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))}
                placeholder="z. B. Meine Firma Compliance"
              />
            </div>

            <div>
              <Label>Logo</Label>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="Logo"
                    width={80}
                    height={80}
                    className="h-16 w-auto max-w-[160px] object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
                    Kein Logo
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Lädt hoch…" : "Logo hochladen"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleLogoUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <p className="mt-1 text-xs text-slate-500">PNG, JPEG, WebP oder SVG, max. 2 MB</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="primary_color">Primärfarbe</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="primary_color"
                    type="color"
                    value={form.primary_color}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, primary_color: e.target.value }))
                    }
                    className="h-10 w-12 cursor-pointer rounded border border-slate-200"
                  />
                  <Input
                    value={form.primary_color}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, primary_color: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="secondary_color">Sekundärfarbe</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="secondary_color"
                    type="color"
                    value={form.secondary_color}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, secondary_color: e.target.value }))
                    }
                    className="h-10 w-12 cursor-pointer rounded border border-slate-200"
                  />
                  <Input
                    value={form.secondary_color}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, secondary_color: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="accent_color">Akzentfarbe</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="accent_color"
                    type="color"
                    value={form.accent_color}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, accent_color: e.target.value }))
                    }
                    className="h-10 w-12 cursor-pointer rounded border border-slate-200"
                  />
                  <Input
                    value={form.accent_color}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, accent_color: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email_sender_name">E-Mail Absendername</Label>
                <Input
                  id="email_sender_name"
                  value={form.email_sender_name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email_sender_name: e.target.value }))
                  }
                  placeholder="z. B. Meine Firma Support"
                />
              </div>
              <div>
                <Label htmlFor="support_email">Support E-Mail</Label>
                <Input
                  id="support_email"
                  type="email"
                  value={form.support_email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, support_email: e.target.value }))
                  }
                  placeholder="support@meinefirma.de"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="custom_domain">Domain / Subdomain</Label>
              <Input
                id="custom_domain"
                value={form.custom_domain}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, custom_domain: e.target.value }))
                }
                placeholder="compliance.meinefirma.de oder firma.tknd-nis2.de"
              />
              <p className="mt-1 text-xs text-slate-500">
                Für die vollständige Custom-Domain-Anbindung kontaktieren Sie uns — die Angabe wird
                bereits gespeichert und im System hinterlegt.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <Button type="button" onClick={handleSave} disabled={saving || uploading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Speichere…
              </>
            ) : (
              "Einstellungen speichern"
            )}
          </Button>
          {feedback && (
            <p
              className={`text-sm ${feedback.type === "success" ? "text-emerald-700" : "text-red-700"}`}
              role="alert"
            >
              {feedback.text}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

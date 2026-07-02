"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, ExternalLink, Link2, Unlink, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LINKEDIN_LOGIN_URL } from "@/lib/jarvis/linkedin-publishing/post-format";
import type { LinkedInPublishingAccount } from "@/lib/types";

interface LinkedInConnectionCardProps {
  account: LinkedInPublishingAccount | null;
  connected: boolean;
  oauthConfigured: boolean;
  loading: boolean;
  onDisconnect: () => void;
  onManualConnect: (payload: { profile_name: string; profile_headline?: string }) => Promise<void>;
}

export function LinkedInConnectionCard({
  account,
  connected,
  oauthConfigured,
  loading,
  onDisconnect,
  onManualConnect,
}: LinkedInConnectionCardProps) {
  const [profileName, setProfileName] = useState(account?.profile_name ?? "Nico Thomas");
  const [headline, setHeadline] = useState(account?.profile_headline ?? "");
  const [showManualForm, setShowManualForm] = useState(!connected);

  const isManual = account?.connection_mode === "manual";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" /> LinkedIn Profil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected && account ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {account.profile_picture_url ? (
                <Image
                  src={account.profile_picture_url}
                  alt={account.profile_name ?? "LinkedIn Profil"}
                  width={48}
                  height={48}
                  className="rounded-full border border-slate-200"
                  unoptimized
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold">
                  {account.profile_name?.charAt(0) ?? "N"}
                </div>
              )}
              <div>
                <p className="flex items-center gap-1.5 font-medium text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  LinkedIn verbunden
                </p>
                <p className="text-sm text-slate-700">{account.profile_name}</p>
                <p className="text-xs text-slate-500">
                  {isManual ? "Persönliches Profil (manuell)" : "API-Verbindung"} ·{" "}
                  {account.is_active ? "Aktiv" : "Inaktiv"}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onDisconnect} disabled={loading}>
              <Unlink className="h-4 w-4" />
              Trennen
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900">
              <strong>Kein Unternehmensaccount nötig.</strong> Ein normales persönliches LinkedIn-Profil
              reicht völlig aus. Jarvis bereitet Beiträge vor — du postest selbst mit einem Klick auf
              LinkedIn.
            </div>

            {showManualForm ? (
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <UserRound className="h-4 w-4" />
                  Persönliches Profil einrichten
                </p>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Dein Name (wie auf LinkedIn)</span>
                  <input
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="z.B. Nico Thomas"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Headline (optional)</span>
                  <input
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="z.B. IT-Security & NIS2"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={loading || !profileName.trim()}
                    onClick={() =>
                      onManualConnect({
                        profile_name: profileName.trim(),
                        profile_headline: headline.trim() || undefined,
                      })
                    }
                  >
                    Profil verknüpfen
                  </Button>
                  <a
                    href={LINKEDIN_LOGIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Bei LinkedIn anmelden
                  </a>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => setShowManualForm(true)}>
                Profil einrichten
              </Button>
            )}

            {oauthConfigured && (
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs text-slate-500">Optional: Direkt über LinkedIn API verbinden</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => {
                    window.location.href = "/api/jarvis/linkedin-publishing/oauth/start";
                  }}
                >
                  Mit LinkedIn API verbinden
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

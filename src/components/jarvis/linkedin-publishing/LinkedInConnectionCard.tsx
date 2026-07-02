"use client";

import Image from "next/image";
import { CheckCircle2, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { LinkedInPublishingAccount } from "@/lib/types";

interface LinkedInConnectionCardProps {
  account: LinkedInPublishingAccount | null;
  connected: boolean;
  oauthConfigured: boolean;
  loading: boolean;
  onDisconnect: () => void;
}

export function LinkedInConnectionCard({
  account,
  connected,
  oauthConfigured,
  loading,
  onDisconnect,
}: LinkedInConnectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" /> LinkedIn Publishing
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  LI
                </div>
              )}
              <div>
                <p className="flex items-center gap-1.5 font-medium text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  LinkedIn verbunden
                </p>
                <p className="text-sm text-slate-700">{account.profile_name}</p>
                <p className="text-xs text-slate-500">
                  Status: {account.is_active ? "Aktiv" : "Inaktiv"}
                  {account.connected_at
                    ? ` · verbunden seit ${new Date(account.connected_at).toLocaleDateString("de-DE")}`
                    : ""}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onDisconnect} disabled={loading}>
              <Unlink className="h-4 w-4" />
              Trennen
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Verbinden Sie Ihren LinkedIn-Account, um Beiträge vorzubereiten und per Klick zu
              veröffentlichen.
            </p>
            {oauthConfigured ? (
              <Button
                type="button"
                disabled={loading}
                onClick={() => {
                  window.location.href = "/api/jarvis/linkedin-publishing/oauth/start";
                }}
              >
                LinkedIn verbinden
              </Button>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                OAuth noch nicht konfiguriert. In <code>.env.local</code> setzen:
                <br />
                LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, NEXT_PUBLIC_APP_URL
                <br />
                Redirect-URI in der LinkedIn-App:{" "}
                <code>/api/jarvis/linkedin-publishing/oauth/callback</code>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

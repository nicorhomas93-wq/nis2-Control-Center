"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { INVITABLE_ROLES, ROLE_LABELS, type CompanyRole } from "@/lib/team/types";
import { canManageUsers } from "@/lib/team/permissions";

interface MemberRow {
  id: string;
  userId: string;
  role: CompanyRole;
  roleLabel: string;
  active: boolean;
  email: string | null;
  name: string | null;
  lastActiveAt: string | null;
}

interface InvitationRow {
  id: string;
  email: string;
  role: CompanyRole;
  roleLabel: string;
  status: string;
  inviteLink: string | null;
  expires_at: string;
}

interface TeamMembersSettingsProps {
  companyId: string | null;
  currentRole: CompanyRole | null;
}

export function TeamMembersSettings({ companyId, currentRole }: TeamMembersSettingsProps) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CompanyRole>("admin");
  const [inviting, setInviting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  const canManage = currentRole ? canManageUsers(currentRole) : false;

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [mRes, iRes] = await Promise.all([
        fetch(`/api/team/members?companyId=${companyId}`),
        fetch(`/api/team/invitations?companyId=${companyId}`),
      ]);
      if (mRes.ok) {
        const data = await mRes.json();
        setMembers(data.members ?? []);
      }
      if (iRes.ok) {
        const data = await iRes.json();
        setInvitations(data.invitations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !inviteEmail) return;
    setInviting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error ?? "Einladung fehlgeschlagen");
        return;
      }
      setLastInviteLink(data.invitation?.inviteLink ?? null);
      setInviteEmail("");
      if (data.emailSent) {
        setFeedback("Einladung erstellt und per E-Mail versendet.");
      } else if (data.emailError) {
        setFeedback(
          `Einladung erstellt, aber E-Mail konnte nicht gesendet werden: ${data.emailError}. Link kann kopiert werden.`
        );
      } else {
        setFeedback("Einladung erstellt. Link kann kopiert werden.");
      }
      void load();
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvitation(id: string) {
    if (!companyId) return;
    await fetch("/api/team/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, invitationId: id, action: "revoke" }),
    });
    void load();
  }

  async function resendInvitation(id: string) {
    if (!companyId) return;
    const res = await fetch("/api/team/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, invitationId: id, action: "resend" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback(data.error ?? "Erneutes Senden fehlgeschlagen");
      return;
    }
    if (data.invitation?.inviteLink) {
      setLastInviteLink(data.invitation.inviteLink);
    }
    if (data.emailSent) {
      setFeedback("Einladung erneut per E-Mail versendet.");
    } else if (data.emailError) {
      setFeedback(
        `Link erneuert, E-Mail fehlgeschlagen: ${data.emailError}. Link kann kopiert werden.`
      );
    } else {
      setFeedback("Einladungslink erneuert.");
    }
    void load();
  }

  async function updateMember(memberId: string, patch: { role?: CompanyRole; active?: boolean }) {
    if (!companyId) return;
    await fetch("/api/team/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, memberId, ...patch }),
    });
    void load();
  }

  function copyLink(link: string) {
    void navigator.clipboard.writeText(link);
    setFeedback("Link kopiert.");
  }

  if (!companyId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Benutzer & Rollen
        </CardTitle>
        <CardDescription>
          Teammitglieder einladen, Rollen vergeben und Zugriff verwalten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {canManage ? (
          <form onSubmit={handleInvite} className="space-y-3 rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-900">Benutzer einladen</p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <Label htmlFor="invite-email">E-Mail</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@unternehmen.de"
                  required
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Rolle</Label>
                <select
                  id="invite-role"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as CompanyRole)}
                >
                  {INVITABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="submit" disabled={inviting}>
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              <span className="ml-2">Einladen</span>
            </Button>
            {lastInviteLink ? (
              <div className="flex flex-wrap items-center gap-2 rounded bg-slate-50 p-2 text-xs">
                <span className="truncate text-slate-600">{lastInviteLink}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => copyLink(lastInviteLink)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            ) : null}
          </form>
        ) : (
          <p className="text-sm text-slate-600">
            Sie haben keine Berechtigung, Benutzer zu verwalten.
          </p>
        )}

        {feedback ? <p className="text-sm text-brand-700">{feedback}</p> : null}

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">E-Mail</th>
                    <th className="py-2 pr-4">Rolle</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Letzte Aktivität</th>
                    {canManage ? <th className="py-2">Aktionen</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4">{m.name ?? "—"}</td>
                      <td className="py-3 pr-4">{m.email ?? "—"}</td>
                      <td className="py-3 pr-4">{m.roleLabel}</td>
                      <td className="py-3 pr-4">
                        <Badge className={m.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>
                          {m.active ? "aktiv" : "deaktiviert"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {m.lastActiveAt
                          ? new Date(m.lastActiveAt).toLocaleDateString("de-DE")
                          : "—"}
                      </td>
                      {canManage && m.role !== "owner" ? (
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <select
                              className="rounded border border-slate-200 px-2 py-1 text-xs"
                              value={m.role}
                              onChange={(e) =>
                                void updateMember(m.id, { role: e.target.value as CompanyRole })
                              }
                            >
                              {INVITABLE_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void updateMember(m.id, { active: !m.active })}
                            >
                              {m.active ? "Deaktivieren" : "Aktivieren"}
                            </Button>
                          </div>
                        </td>
                      ) : canManage ? (
                        <td className="py-3 text-slate-400">—</td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invitations.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-900">Offene Einladungen</p>
                <div className="space-y-2">
                  {invitations
                    .filter((i) => i.status === "invited")
                    .map((i) => (
                      <div
                        key={i.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-100 p-3 text-sm"
                      >
                        <div>
                          <span className="font-medium">{i.email}</span>
                          <span className="ml-2 text-slate-500">{i.roleLabel}</span>
                          <Badge className="ml-2 bg-blue-100 text-blue-800">eingeladen</Badge>
                        </div>
                        {canManage ? (
                          <div className="flex gap-2">
                            {i.inviteLink ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => copyLink(i.inviteLink!)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void resendInvitation(i.id)}
                            >
                              Erneut senden
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void revokeInvitation(i.id)}
                            >
                              Widerrufen
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

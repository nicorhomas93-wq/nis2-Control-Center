"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  FileEdit,
  MessageSquare,
  Plus,
  Send,
  Share2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LinkedInConnectionCard } from "@/components/jarvis/linkedin-publishing/LinkedInConnectionCard";
import { LinkedInPostEditor } from "@/components/jarvis/linkedin-publishing/LinkedInPostEditor";
import {
  LINKEDIN_PUBLISHING_DISCLAIMER,
  LINKEDIN_PUBLISH_STATUS_LABELS,
  LINKEDIN_POST_TYPE_LABELS,
  type LinkedInPostType,
} from "@/lib/jarvis/linkedin-publishing/constants";
import type { PublishingDashboardStats } from "@/lib/jarvis/linkedin-publishing/stats";
import type {
  LinkedInCampaign,
  LinkedInPublishingAccount,
  LinkedInPublishingPost,
} from "@/lib/types";

interface LinkedInPublishingDashboardProps {
  account: LinkedInPublishingAccount | null;
  posts: LinkedInPublishingPost[];
  campaigns: LinkedInCampaign[];
  stats: PublishingDashboardStats;
  oauthConfigured: boolean;
}

export function LinkedInPublishingDashboard({
  account,
  posts,
  campaigns,
  stats,
  oauthConfigured,
}: LinkedInPublishingDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "overview";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LinkedInPublishingPost | null>(null);

  const connected = Boolean(account?.is_active && account?.profile_name);

  const filtered = useMemo(() => {
    if (view === "drafts") return posts.filter((p) => p.status === "draft");
    if (view === "scheduled") return posts.filter((p) => p.status === "scheduled");
    if (view === "published") return posts.filter((p) => p.status === "published");
    return posts;
  }, [posts, view]);

  async function apiCall(url: string, method: string, body?: unknown) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Anfrage fehlgeschlagen");
      router.refresh();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    if (!confirm("LinkedIn-Verbindung wirklich trennen?")) return;
    await apiCall("/api/jarvis/linkedin-publishing/account", "DELETE");
  }

  async function savePost(payload: Record<string, unknown>) {
    if (editing) {
      await apiCall(`/api/jarvis/linkedin-publishing/posts/${editing.id}`, "PATCH", payload);
      setEditing(null);
      router.push("/jarvis/linkedin-publishing");
    } else {
      await apiCall("/api/jarvis/linkedin-publishing/posts", "POST", payload);
      router.push("/jarvis/linkedin-publishing?view=drafts");
    }
  }

  async function publishPost(postId: string) {
    if (!confirm("Beitrag jetzt auf LinkedIn veröffentlichen?")) return;
    await apiCall(`/api/jarvis/linkedin-publishing/posts/${postId}/publish`, "POST");
    setEditing(null);
  }

  async function deletePost(postId: string) {
    if (!confirm("Beitrag löschen?")) return;
    await apiCall(`/api/jarvis/linkedin-publishing/posts/${postId}`, "DELETE");
  }

  if (view === "create" || editing) {
    return (
      <LinkedInPostEditor
        account={account}
        connected={connected}
        initial={editing}
        loading={loading}
        onSave={savePost}
        onPublish={editing ? publishPost : undefined}
        onClose={() => {
          setEditing(null);
          router.push("/jarvis/linkedin-publishing");
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <Send className="mb-1 inline h-4 w-4 text-brand-600" /> {LINKEDIN_PUBLISHING_DISCLAIMER}
      </div>

      {searchParams.get("connected") === "1" && (
        <p className="text-sm text-green-700">LinkedIn erfolgreich verbunden.</p>
      )}
      {searchParams.get("error") && (
        <p className="text-sm text-red-600">Fehler: {searchParams.get("error")}</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <LinkedInConnectionCard
        account={account}
        connected={connected}
        oauthConfigured={oauthConfigured}
        loading={loading}
        onDisconnect={disconnect}
      />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/jarvis/linkedin-publishing?view=create"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Neuen Beitrag erstellen
        </Link>
        <Link
          href="/jarvis/content-hub"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Aus Content Hub importieren
        </Link>
        <Link
          href="/jarvis/kampagnen"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Kampagnen
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={FileEdit} label="Entwürfe" value={stats.drafts} />
        <StatCard icon={CalendarClock} label="Geplant" value={stats.scheduled} />
        <StatCard icon={Send} label="Veröffentlicht" value={stats.published} />
        <StatCard icon={BarChart3} label="Reichweite" value={stats.reach} />
        <StatCard icon={MessageSquare} label="Antworten" value={stats.responses} />
        <StatCard icon={Share2} label="Kampagnen" value={stats.campaigns} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          {view === "overview" ? "Alle Beiträge" : LINKEDIN_PUBLISH_STATUS_LABELS[view as keyof typeof LINKEDIN_PUBLISH_STATUS_LABELS] ?? view}{" "}
          ({filtered.length})
        </h3>
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Beiträge in dieser Ansicht.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((post) => (
              <Card key={post.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{post.title}</CardTitle>
                    <Badge className="bg-slate-100 text-slate-700 shrink-0">
                      {LINKEDIN_PUBLISH_STATUS_LABELS[post.status as keyof typeof LINKEDIN_PUBLISH_STATUS_LABELS] ?? post.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {LINKEDIN_POST_TYPE_LABELS[post.post_type as LinkedInPostType] ?? post.post_type}
                    {post.scheduled_at
                      ? ` · geplant ${new Date(post.scheduled_at).toLocaleString("de-DE")}`
                      : ""}
                    {post.published_at
                      ? ` · veröffentlicht ${new Date(post.published_at).toLocaleString("de-DE")}`
                      : ""}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <pre className="line-clamp-6 whitespace-pre-wrap rounded bg-slate-50 p-2 text-slate-700">
                    {post.body_text}
                  </pre>
                  {post.publish_error && (
                    <p className="text-xs text-red-600">{post.publish_error}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditing(post)}>
                      Bearbeiten
                    </Button>
                    {post.status !== "published" && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={loading || !connected}
                        onClick={() => publishPost(post.id)}
                      >
                        Veröffentlichen
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={() => deletePost(post.id)}>
                      Löschen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {view === "overview" && campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aktive Kampagnen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {campaigns.slice(0, 5).map((c) => (
              <div key={c.id} className="flex justify-between gap-2">
                <Link href={`/jarvis/kampagnen/${c.id}`} className="text-brand-700 hover:underline">
                  {c.name}
                </Link>
                <span className="text-slate-500">{c.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-brand-50 p-2">
          <Icon className="h-5 w-5 text-brand-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

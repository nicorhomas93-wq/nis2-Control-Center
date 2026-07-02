"use client";

import { useState } from "react";
import { ImagePlus, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LinkedInPostPreview } from "@/components/jarvis/linkedin-publishing/LinkedInPostPreview";
import {
  ALLOWED_PUBLISH_CTAS,
  LINKEDIN_POST_TYPE_LABELS,
  TARGET_AUDIENCE_OPTIONS,
  type LinkedInPostType,
} from "@/lib/jarvis/linkedin-publishing/constants";
import type { LinkedInPublishingAccount, LinkedInPublishingPost } from "@/lib/types";

interface LinkedInPostEditorProps {
  account: LinkedInPublishingAccount | null;
  connected: boolean;
  initial?: LinkedInPublishingPost | null;
  loading: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onPublish?: (postId: string) => Promise<void>;
  onClose?: () => void;
}

export function LinkedInPostEditor({
  account,
  connected,
  initial,
  loading,
  onSave,
  onPublish,
  onClose,
}: LinkedInPostEditorProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [postType, setPostType] = useState<LinkedInPostType>(
    (initial?.post_type as LinkedInPostType) ?? "short_post"
  );
  const [bodyText, setBodyText] = useState(initial?.body_text ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [imageStoragePath, setImageStoragePath] = useState(initial?.image_storage_path ?? "");
  const [targetAudience, setTargetAudience] = useState(initial?.target_audience ?? "");
  const [callToAction, setCallToAction] = useState(initial?.call_to_action ?? ALLOWED_PUBLISH_CTAS[0]);
  const [hashtags, setHashtags] = useState(initial?.hashtags ?? "#NIS2 #Compliance #ITSecurity");
  const [scheduledAt, setScheduledAt] = useState(
    initial?.scheduled_at ? initial.scheduled_at.slice(0, 16) : ""
  );
  const [uploading, setUploading] = useState(false);

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/jarvis/linkedin-publishing/media", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload fehlgeschlagen");
      setImageUrl(data.image_url);
      setImageStoragePath(data.image_storage_path);
    } finally {
      setUploading(false);
    }
  }

  function buildPayload(status: "draft" | "scheduled") {
    return {
      title,
      post_type: postType,
      body_text: bodyText,
      image_url: imageUrl || null,
      image_storage_path: imageStoragePath || null,
      target_audience: targetAudience || null,
      call_to_action: callToAction || null,
      hashtags: hashtags || null,
      status,
      scheduled_at: status === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
    };
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {initial ? "Beitrag bearbeiten" : "Neuen Beitrag erstellen"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Titel (intern)</span>
            <input
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Nachweise im Audit"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Beitragstyp</span>
            <select
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
              value={postType}
              onChange={(e) => setPostType(e.target.value as LinkedInPostType)}
            >
              {Object.entries(LINKEDIN_POST_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Text</span>
            <textarea
              className="min-h-[180px] w-full rounded border border-slate-200 px-3 py-2 text-sm"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Beitragstext…"
            />
          </label>

          <div className="text-sm">
            <span className="mb-1 block text-slate-600">Bild (optional)</span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                <ImagePlus className="h-4 w-4" />
                {uploading ? "Lädt…" : "Bild hochladen"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleImageUpload(f);
                  }}
                />
              </label>
              {imageUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl("")}>
                  Bild entfernen
                </Button>
              )}
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Zielgruppe</span>
            <select
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            >
              <option value="">— wählen —</option>
              {TARGET_AUDIENCE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">CTA</span>
            <select
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
            >
              {ALLOWED_PUBLISH_CTAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Hashtags</span>
            <input
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Geplant für (optional)</span>
            <input
              type="datetime-local"
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading || !title || !bodyText}
              onClick={() => onSave(buildPayload("draft"))}
            >
              <Save className="h-4 w-4" />
              Als Entwurf speichern
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading || !title || !bodyText || !scheduledAt}
              onClick={() => onSave(buildPayload("scheduled"))}
            >
              Planen
            </Button>
            {initial && onPublish && (
              <Button
                type="button"
                disabled={loading || !connected}
                onClick={() => onPublish(initial.id)}
                title={connected ? "Jetzt auf LinkedIn veröffentlichen" : "LinkedIn zuerst verbinden"}
              >
                <Send className="h-4 w-4" />
                Veröffentlichen
              </Button>
            )}
            {onClose && (
              <Button type="button" variant="ghost" onClick={onClose}>
                Abbrechen
              </Button>
            )}
          </div>
          {!connected && (
            <p className="text-xs text-amber-700">
              Veröffentlichen erst nach LinkedIn-Verbindung möglich. Entwürfe können Sie trotzdem
              erstellen und planen.
            </p>
          )}
        </CardContent>
      </Card>

      <LinkedInPostPreview
        account={account}
        title={title}
        postType={postType}
        bodyText={bodyText}
        imageUrl={imageUrl || null}
        callToAction={callToAction}
        hashtags={hashtags}
        targetAudience={targetAudience}
      />
    </div>
  );
}

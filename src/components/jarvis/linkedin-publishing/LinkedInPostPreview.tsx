"use client";

import Image from "next/image";
import type { LinkedInPublishingAccount } from "@/lib/types";
import { LINKEDIN_POST_TYPE_LABELS, type LinkedInPostType } from "@/lib/jarvis/linkedin-publishing/constants";

interface LinkedInPostPreviewProps {
  account: LinkedInPublishingAccount | null;
  title: string;
  postType: LinkedInPostType;
  bodyText: string;
  imageUrl: string | null;
  callToAction: string;
  hashtags: string;
  targetAudience: string;
}

export function LinkedInPostPreview({
  account,
  title,
  postType,
  bodyText,
  imageUrl,
  callToAction,
  hashtags,
  targetAudience,
}: LinkedInPostPreviewProps) {
  const displayName = account?.profile_name ?? "Nico Thomas";
  const avatar = account?.profile_picture_url;

  const fullText = [bodyText, callToAction, hashtags].filter((s) => s.trim()).join("\n\n");

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">
        LinkedIn Vorschau · {LINKEDIN_POST_TYPE_LABELS[postType]}
        {targetAudience ? ` · Zielgruppe: ${targetAudience}` : ""}
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {avatar ? (
            <Image
              src={avatar}
              alt={displayName}
              width={40}
              height={40}
              className="rounded-full"
              unoptimized
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {displayName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900 text-sm">{displayName}</p>
            <p className="text-xs text-slate-500">Jetzt · 🌐</p>
          </div>
        </div>
        {title && <p className="mt-3 text-sm font-medium text-slate-800">{title}</p>}
        <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700 font-sans">{fullText}</pre>
        {imageUrl && (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
            <Image
              src={imageUrl}
              alt="Beitragsbild"
              width={1200}
              height={627}
              className="h-auto w-full object-cover"
              unoptimized
            />
          </div>
        )}
      </div>
    </div>
  );
}

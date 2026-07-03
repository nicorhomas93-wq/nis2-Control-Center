import { createClient } from "@/lib/supabase/server";
import { computePublishingStats } from "@/lib/jarvis/linkedin-publishing/stats";
import type {
  ContentHubPost,
  JarvisContentAuditLog,
  LinkedInCampaign,
  LinkedInPublishingAccount,
  LinkedInPublishingPost,
} from "@/lib/types";
import { isLinkedInOAuthConfigured } from "@/lib/jarvis/linkedin-publishing/linkedin-oauth";

export interface LinkedInPublishingPageData {
  account: LinkedInPublishingAccount | null;
  posts: LinkedInPublishingPost[];
  contentHubPosts: ContentHubPost[];
  campaigns: LinkedInCampaign[];
  auditLog: JarvisContentAuditLog[];
  stats: ReturnType<typeof computePublishingStats>;
  oauthConfigured: boolean;
  error: string | null;
  missingTable: boolean;
}

export async function loadLinkedInPublishingData(
  userId: string
): Promise<LinkedInPublishingPageData> {
  const supabase = await createClient();

  const [accountRes, postsRes, campaignsRes, hubRes, auditRes] = await Promise.all([
    supabase.from("linkedin_publishing_accounts").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("linkedin_publishing_posts")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase.from("linkedin_campaigns").select("id, name, status, approval_status, approved_at, approved_by").order("updated_at", {
      ascending: false,
    }),
    supabase
      .from("content_hub_posts")
      .select("id, title, body, hook, category, hub_area, format, status, call_to_action, tags, scheduled_date, poll_question, poll_options")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("jarvis_content_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const error =
    accountRes.error?.message ??
    postsRes.error?.message ??
    campaignsRes.error?.message ??
    hubRes.error?.message ??
    auditRes.error?.message ??
    null;

  const missingTable = Boolean(
    postsRes.error?.message?.includes("linkedin_publishing_posts") ||
      postsRes.error?.code === "42P01"
  );

  const posts = (postsRes.data ?? []) as LinkedInPublishingPost[];
  const campaigns = (campaignsRes.data ?? []) as LinkedInCampaign[];

  return {
    account: (accountRes.data as LinkedInPublishingAccount | null) ?? null,
    posts,
    contentHubPosts: (hubRes.data ?? []) as ContentHubPost[],
    campaigns,
    auditLog: (auditRes.data ?? []) as JarvisContentAuditLog[],
    stats: computePublishingStats(posts, campaigns),
    oauthConfigured: isLinkedInOAuthConfigured(),
    error,
    missingTable,
  };
}

import { createClient } from "@/lib/supabase/server";
import { computePublishingStats } from "@/lib/jarvis/linkedin-publishing/stats";
import type {
  LinkedInCampaign,
  LinkedInPublishingAccount,
  LinkedInPublishingPost,
} from "@/lib/types";
import { isLinkedInOAuthConfigured } from "@/lib/jarvis/linkedin-publishing/linkedin-oauth";

export interface LinkedInPublishingPageData {
  account: LinkedInPublishingAccount | null;
  posts: LinkedInPublishingPost[];
  campaigns: LinkedInCampaign[];
  stats: ReturnType<typeof computePublishingStats>;
  oauthConfigured: boolean;
  error: string | null;
  missingTable: boolean;
}

export async function loadLinkedInPublishingData(
  userId: string
): Promise<LinkedInPublishingPageData> {
  const supabase = await createClient();

  const [accountRes, postsRes, campaignsRes] = await Promise.all([
    supabase.from("linkedin_publishing_accounts").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("linkedin_publishing_posts")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase.from("linkedin_campaigns").select("id, name, status").order("updated_at", {
      ascending: false,
    }),
  ]);

  const error =
    accountRes.error?.message ?? postsRes.error?.message ?? campaignsRes.error?.message ?? null;

  const missingTable = Boolean(
    postsRes.error?.message?.includes("linkedin_publishing_posts") ||
      postsRes.error?.code === "42P01"
  );

  const posts = (postsRes.data ?? []) as LinkedInPublishingPost[];
  const campaigns = (campaignsRes.data ?? []) as LinkedInCampaign[];

  return {
    account: (accountRes.data as LinkedInPublishingAccount | null) ?? null,
    posts,
    campaigns,
    stats: computePublishingStats(posts, campaigns),
    oauthConfigured: isLinkedInOAuthConfigured(),
    error,
    missingTable,
  };
}

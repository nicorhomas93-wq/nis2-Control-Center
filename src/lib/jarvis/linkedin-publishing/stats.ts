import type { LinkedInCampaign, LinkedInPublishingPost } from "@/lib/types";

export interface PublishingDashboardStats {
  drafts: number;
  pendingApproval: number;
  approved: number;
  scheduled: number;
  published: number;
  responses: number;
  reach: number;
  campaigns: number;
}

export function computePublishingStats(
  posts: LinkedInPublishingPost[],
  campaigns: LinkedInCampaign[]
): PublishingDashboardStats {
  return {
    drafts: posts.filter((p) => p.status === "draft").length,
    pendingApproval: posts.filter((p) => p.status === "pending_approval").length,
    approved: posts.filter((p) => p.status === "approved").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter((p) => p.status === "published").length,
    responses: posts.reduce((sum, p) => sum + (p.response_count ?? 0), 0),
    reach: posts.reduce((sum, p) => sum + (p.reach_views ?? 0), 0),
    campaigns: campaigns.length,
  };
}

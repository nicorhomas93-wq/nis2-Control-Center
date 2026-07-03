import type { ContentHubPost } from "@/lib/types";
import type { LinkedInPostType } from "@/lib/jarvis/linkedin-publishing/constants";

export function mapContentHubToPostType(post: ContentHubPost): LinkedInPostType {
  if (post.format === "poll" || post.hub_area === "polls") return "poll";
  if (post.hub_area === "audit_tips") return "audit_tip";
  if (post.hub_area === "mini_cases" || post.format === "story") return "case_study";
  if (post.category === "vendor") return "vendor";
  if (post.category === "training") return "training_evidence";
  if (post.category === "problem_based" || post.hub_area === "nis2_myths") return "nis2_topic";
  if (post.format === "expert_post") return "expert_article";
  if (post.format === "short_post" || post.format === "tip_week") return "short_post";
  return "tip";
}

export function contentHubToPublishingBody(post: ContentHubPost): string {
  const parts: string[] = [];
  if (post.hook?.trim()) parts.push(post.hook.trim());
  parts.push(post.body.trim());
  if (post.poll_question && post.poll_options?.length) {
    parts.push(
      "",
      post.poll_question,
      post.poll_options.map((o) => `• ${o}`).join("\n")
    );
  }
  return parts.join("\n\n");
}

export function contentHubToHashtags(post: ContentHubPost): string {
  const tags = post.tags ?? [];
  if (tags.length === 0) return "#NIS2 #Compliance #ITSecurity";
  return tags
    .map((t) => (t.startsWith("#") ? t : `#${t.replace(/\s+/g, "")}`))
    .slice(0, 5)
    .join(" ");
}

export function contentHubToPublishingRow(
  post: ContentHubPost,
  userId: string
): Record<string, unknown> {
  const status = "draft";
  return {
    user_id: userId,
    content_hub_post_id: post.id,
    title: post.title,
    post_type: mapContentHubToPostType(post),
    body_text: contentHubToPublishingBody(post),
    call_to_action: post.call_to_action,
    hashtags: contentHubToHashtags(post),
    status,
    scheduled_at: post.scheduled_date ? `${post.scheduled_date}T09:00:00.000Z` : null,
  };
}

import type { LinkedInPublishingPost } from "@/lib/types";

export function formatLinkedInPostText(post: {
  body_text: string;
  call_to_action?: string | null;
  hashtags?: string | null;
}): string {
  const parts = [post.body_text.trim()];
  if (post.call_to_action?.trim()) parts.push("", post.call_to_action.trim());
  if (post.hashtags?.trim()) parts.push("", post.hashtags.trim());
  return parts.join("\n");
}

export function formatLinkedInPostFromRow(post: LinkedInPublishingPost): string {
  return formatLinkedInPostText(post);
}

export const LINKEDIN_FEED_URL = "https://www.linkedin.com/feed/";
export const LINKEDIN_LOGIN_URL = "https://www.linkedin.com/login";

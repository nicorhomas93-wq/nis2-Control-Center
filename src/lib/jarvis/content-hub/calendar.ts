import { CALENDAR_MIX } from "@/lib/jarvis/content-hub/constants";
import type { ContentCategory } from "@/lib/jarvis/content-hub/constants";
import {
  generateByCategory,
  generateMiniCase,
  generatePoll,
} from "@/lib/jarvis/content-hub/generator";
import type { GeneratedPost } from "@/lib/jarvis/content-hub/templates";

export interface CalendarPlanItem extends GeneratedPost {
  scheduled_date: string;
  day_offset: number;
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function categoryForSlot(
  dayIndex: number,
  totalDays: number
): "problem" | "tip" | "case" | "poll" | "product" {
  const ratio = dayIndex / totalDays;
  if (ratio < CALENDAR_MIX.problem_based) return "problem";
  if (ratio < CALENDAR_MIX.problem_based + 0.2) return "tip";
  if (ratio < CALENDAR_MIX.problem_based + 0.4) return "case";
  if (ratio < CALENDAR_MIX.problem_based + 0.5) return "poll";
  return "product";
}

const TIP_CATEGORIES: ContentCategory[] = ["audit", "training", "risk", "vendor"];
const PROBLEM_CATEGORIES: ContentCategory[] = ["problem_based", "evidence", "incident"];

export function buildContentCalendar(days: 7 | 14 | 30 | 90): CalendarPlanItem[] {
  const start = new Date();
  const items: CalendarPlanItem[] = [];

  for (let i = 0; i < days; i++) {
    const slot = categoryForSlot(i, days);
    let post: GeneratedPost;

    switch (slot) {
      case "poll":
        post = generatePoll(i % 3);
        break;
      case "case":
        post = generateMiniCase();
        break;
      case "tip":
        post = generateByCategory(TIP_CATEGORIES[i % TIP_CATEGORIES.length], "tip_week", "audit_tips");
        break;
      case "product":
        post = generateByCategory("evidence", "standard_post", "linkedin_posts");
        post.body = `${post.body}\n\n${["Aus Kundenfeedback heraus haben wir das Nachweiscenter weiter ausgebaut.", "Ein Mandant fragte nach zentraler Ablage für Phishing-Auswertungen — genau dafür ist es gedacht."][i % 2]}`;
        break;
      default:
        post = generateByCategory(PROBLEM_CATEGORIES[i % PROBLEM_CATEGORIES.length], i % 2 === 0 ? "short_post" : "standard_post");
    }

    items.push({
      ...post,
      scheduled_date: addDays(start, i),
      day_offset: i + 1,
      title: `${post.title} (Tag ${i + 1})`,
    });
  }

  return items;
}

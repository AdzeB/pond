import { buildTweetCardData, type TweetCardData } from "@shared/tweet-card";
import type { Save } from "@/lib/types";

export type {
  TweetCardAuthor,
  TweetCardData,
  TweetCardLink,
  TweetCardMedia,
  TweetCardMetrics,
} from "@shared/tweet-card";

// Build card data from a captured save, delegating to the shared adapter so the
// preview, live card, and offscreen cover render all agree.
export function toTweetCardData(save: Save): TweetCardData | null {
  return buildTweetCardData(save.rawJson?.capture, save.author);
}

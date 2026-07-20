import type { AskStage } from "@/stores/ask-store";

/** Rotating narration for each live pipeline stage. */
export const STAGE_LABELS: Record<NonNullable<AskStage>, string> = {
  compiling: "Understanding your question",
  planning: "Planning your search",
  searching: "Searching your library",
  executing: "Working through your library",
  ranking: "Ranking matches",
  summarizing: "Summarizing results",
};

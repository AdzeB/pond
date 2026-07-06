import type { AskStage } from "@/stores/ask-store";

// Human phrasing for each live pipeline stage — the rotating narration that
// mirrors the reference's "Reading…/Determining…/Making changes…".
export const STAGE_LABELS: Record<NonNullable<AskStage>, string> = {
  compiling: "Understanding your question…",
  planning: "Planning your search…",
  searching: "Searching your library…",
  executing: "Working through your library…",
  ranking: "Ranking matches…",
  summarizing: "Summarizing results…",
};

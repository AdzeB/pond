import {
  autoTag,
  backfillColors,
  rebuildVisualIndex,
  recaption,
  reembed,
  reocr,
  retranscribe,
  runEnrichment,
  type TaskResult,
  type TaskScope,
} from "@/lib/enrichment/tasks";
import { fuzzyRank } from "@/lib/util/fuzzy";

export type { TaskResult, TaskScope } from "@/lib/enrichment/tasks";

export type TaskGroup = "tagging" | "enrichment" | "reprocess";

export interface LibraryTask {
  id: string;
  label: string;
  description: string;
  // Verb shown on the settings run button (Run / Apply / Rebuild / Re-run).
  action: string;
  group: TaskGroup;
  // Extra terms matched by the composer slash-skill menu.
  keywords: string[];
  // Whether the task can run on a selection subset (and so appears in the
  // selection menu). Library-wide-only tasks are false.
  selectable: boolean;
  run: (ids?: TaskScope) => TaskResult | Promise<TaskResult>;
}

export const TASKS: readonly LibraryTask[] = [
  {
    id: "auto-tag",
    label: "Auto-tag",
    description: "Apply each item's AI-suggested tags. Existing tags are kept.",
    action: "Apply",
    group: "tagging",
    keywords: ["autotag", "tag", "tags"],
    selectable: true,
    run: autoTag,
  },
  {
    id: "run-enrichment",
    label: "Run enrichment",
    description: "Retry failed runs and process newly eligible items.",
    action: "Run",
    group: "enrichment",
    keywords: ["enrich", "sweep", "run"],
    selectable: false,
    run: runEnrichment,
  },
  {
    id: "backfill-colors",
    label: "Backfill colors",
    description: "Extract dominant colors for images missing a palette.",
    action: "Run",
    group: "enrichment",
    keywords: ["colors", "colours", "palette"],
    selectable: false,
    run: backfillColors,
  },
  {
    id: "caption",
    label: "Caption images",
    description: "Re-run captioning, overwriting existing captions.",
    action: "Re-run",
    group: "reprocess",
    keywords: ["caption", "alt", "describe"],
    selectable: true,
    run: recaption,
  },
  {
    id: "ocr",
    label: "Extract text (OCR)",
    description: "Re-read text from images, overwriting existing OCR.",
    action: "Re-run",
    group: "reprocess",
    keywords: ["ocr", "text"],
    selectable: true,
    run: reocr,
  },
  {
    id: "transcribe",
    label: "Transcribe media",
    description: "Re-transcribe audio and video, overwriting transcripts.",
    action: "Re-run",
    group: "reprocess",
    keywords: ["transcribe", "transcript", "whisper", "subtitle"],
    selectable: true,
    run: retranscribe,
  },
  {
    id: "re-embed",
    label: "Re-embed",
    description: "Rebuild the semantic-search index from scratch.",
    action: "Rebuild",
    group: "reprocess",
    keywords: ["embed", "embeddings", "semantic", "reindex"],
    selectable: true,
    run: reembed,
  },
  {
    id: "rebuild-visual",
    label: "Rebuild visual index",
    description: "Recompute CLIP vectors for visual similarity.",
    action: "Rebuild",
    group: "reprocess",
    keywords: ["clip", "visual", "similarity"],
    selectable: true,
    run: rebuildVisualIndex,
  },
];

export const TASK_GROUPS: readonly { id: TaskGroup; label: string }[] = [
  { id: "tagging", label: "Tagging" },
  { id: "enrichment", label: "Enrichment" },
  { id: "reprocess", label: "Reprocess" },
];

export function getTask(id: string): LibraryTask | undefined {
  return TASKS.find((t) => t.id === id);
}

export function selectableTasks(): LibraryTask[] {
  return TASKS.filter((t) => t.selectable);
}

// Composer slash-skill ranking: fuzzy-match the typed query against each task's
// id + label + keywords. An empty query lists everything.
export function matchTasks(query: string): LibraryTask[] {
  return fuzzyRank(TASKS, query, (t) =>
    [t.id, t.label, ...t.keywords].join(" "),
  );
}

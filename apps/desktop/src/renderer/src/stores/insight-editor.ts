import type { InsightConfig } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import type { Save } from "@/lib/types";

/**
 * The insight being edited; lives in a store so the editor overlay can render from anywhere — it opens whenever a draft exists.
 * @remarks The analytics page owns persistence: it registers a save handler while mounted and pushes the dashboard-filtered saves + window the editor works from.
 */
export interface InsightEditorState {
  draft: InsightConfig | null;
  /** True when the draft isn't on the dashboard yet. */
  isNew: boolean;
  saves: Save[];
  /** The dashboard's time window; the preview computes with it. */
  days: number;
}

const store = new Store<InsightEditorState>({
  draft: null,
  isNew: false,
  saves: [],
  days: 7,
});

let saveHandler: ((config: InsightConfig) => void) | null = null;

export const insightEditor = {
  open(draft: InsightConfig, isNew: boolean): void {
    store.setState((s) => ({ ...s, draft, isNew }));
  },
  patch(patch: Partial<InsightConfig>): void {
    store.setState((s) =>
      s.draft ? { ...s, draft: { ...s.draft, ...patch } } : s,
    );
  },
  /** Idempotent: dialog dismissals (Escape, backdrop) also land here. */
  cancel(): void {
    store.setState((s) => (s.draft ? { ...s, draft: null } : s));
  },
  save(): void {
    const { draft } = store.state;
    if (draft) saveHandler?.(draft);
    insightEditor.cancel();
  },
  setData(saves: Save[], days: number): void {
    store.setState((s) => ({ ...s, saves, days }));
  },
  registerSaveHandler(fn: (config: InsightConfig) => void): () => void {
    saveHandler = fn;
    return () => {
      if (saveHandler === fn) saveHandler = null;
    };
  },
};

export function useInsightEditorState(): InsightEditorState {
  return useSelector(store, (s) => s);
}

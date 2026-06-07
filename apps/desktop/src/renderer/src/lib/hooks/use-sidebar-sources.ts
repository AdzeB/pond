import type {
  SidebarSourceEntry,
  Source,
  SourceVisibility,
} from "@pond/schema/db";
import { isSource } from "@pond/schema/sources";
import { useParams } from "@tanstack/react-router";
import React from "react";
import { mergeSidebarSources } from "@/lib/sources/registry";
import { useSaves } from "@/pool/hooks";
import { usePrefs } from "@/pool/prefs";

export function useSourceCounts(): ReadonlyMap<string, number> {
  const saves = useSaves();
  return React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const save of saves) {
      if (save.deletedAt || save.status !== "complete") continue;
      const key = save.source.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [saves]);
}

function isPinned(entry: SidebarSourceEntry, count: number): boolean {
  if (entry.visibility === "always") return true;
  if (entry.visibility === "when-count") return count > 0;
  return false;
}

function promotionIndex(
  entries: ReadonlyArray<SidebarSourceEntry>,
  source: Source,
  pinned: ReadonlyArray<Source>,
): number {
  const order = entries.map((entry) => entry.source);
  const sourceIndex = order.indexOf(source);
  if (sourceIndex < 0) return pinned.length;

  let insertAt = 0;
  for (let i = 0; i < sourceIndex; i++) {
    if (pinned.includes(order[i]!)) insertAt++;
  }
  return insertAt;
}

function resolveSidebarLists(
  entries: ReadonlyArray<SidebarSourceEntry>,
  counts: ReadonlyMap<string, number>,
  activeSource: Source | null,
) {
  const pinned: Source[] = [];
  const hidden: Source[] = [];

  for (const entry of entries) {
    const count = counts.get(entry.source) ?? 0;
    if (isPinned(entry, count)) pinned.push(entry.source);
    else hidden.push(entry.source);
  }

  if (activeSource && hidden.includes(activeSource)) {
    pinned.splice(
      promotionIndex(entries, activeSource, pinned),
      0,
      activeSource,
    );
    hidden.splice(hidden.indexOf(activeSource), 1);
  }

  return { pinnedSources: pinned, moreSources: hidden };
}

export function useSidebarSources() {
  const [sidebarPrefs, patchSidebar] = usePrefs("sidebar");
  const counts = useSourceCounts();
  const params = useParams({ strict: false }) as { source?: string };
  const activeSource =
    params.source && isSource(params.source) ? params.source : null;

  const entries = React.useMemo(
    () => mergeSidebarSources(sidebarPrefs.sources),
    [sidebarPrefs.sources],
  );

  const { pinnedSources, moreSources } = React.useMemo(
    () => resolveSidebarLists(entries, counts, activeSource),
    [entries, counts, activeSource],
  );

  const setVisibility = React.useCallback(
    (source: Source, visibility: SourceVisibility) => {
      patchSidebar({
        sources: entries.map((entry) =>
          entry.source === source ? { ...entry, visibility } : entry,
        ),
      });
    },
    [entries, patchSidebar],
  );

  const reorderSources = React.useCallback(
    (order: Source[]) => {
      const bySource = new Map(entries.map((entry) => [entry.source, entry]));
      patchSidebar({
        sources: order
          .map((source) => bySource.get(source))
          .filter((entry): entry is SidebarSourceEntry => entry !== undefined),
      });
    },
    [entries, patchSidebar],
  );

  return {
    entries,
    pinnedSources,
    moreSources,
    showMore: moreSources.length > 0,
    activeSource,
    counts,
    setVisibility,
    reorderSources,
  };
}

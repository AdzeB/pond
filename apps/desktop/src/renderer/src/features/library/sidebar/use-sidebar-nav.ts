import React from "react";
import { useSaves } from "@/core/data/hooks";
import { pickPrimaryUnit } from "@/core/data/media";
import { useRecents } from "@/features/library/stores/recents";
import { type NavItem, navItems } from "./data";

interface SidebarNavEntry {
  item: NavItem;
  count: number;
}

interface SidebarNav {
  visibleItems: SidebarNavEntry[];
  counts: Record<NavItem["mode"], number>;
}

export function useSidebarNav(): SidebarNav {
  const saves = useSaves();
  const recents = useRecents();

  const recentsOrder = React.useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < recents.length; i++) {
      const entry = recents[i];
      if (entry) map.set(entry.saveId, i);
    }
    return map;
  }, [recents]);

  // Single pass over the pool (not one applyModeFilter per mode): untagged/recents are sub-counts of library's renderable gate.
  const counts = React.useMemo<Record<NavItem["mode"], number>>(() => {
    let library = 0;
    let untagged = 0;
    let recents = 0;
    let trash = 0;
    for (const save of saves) {
      if (save.deletedAt) {
        trash++;
        continue;
      }
      if (save.status !== "complete") continue;
      if (!pickPrimaryUnit(save)) continue;
      library++;
      if (save.tags.length === 0) untagged++;
      if (recentsOrder.has(save.id)) recents++;
    }
    return { library, untagged, recents, trash };
  }, [saves, recentsOrder]);

  const visibleItems = React.useMemo<SidebarNavEntry[]>(
    () => navItems.map((item) => ({ item, count: counts[item.mode] })),
    [counts],
  );

  return { visibleItems, counts };
}

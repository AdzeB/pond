import React from "react";
import { useSaves } from "@/core/data/hooks";
import { applyModeFilter } from "@/features/library/lib/save-list";
import { useRecents } from "@/features/library/stores/recents";
import { type NavItem, navItems } from "./data";

export interface SidebarNavEntry {
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

  const counts = React.useMemo<Record<NavItem["mode"], number>>(() => {
    const count = (mode: NavItem["mode"]) =>
      applyModeFilter(saves, {
        mode,
        sourceFilter: "",
        recentsOrder: mode === "recents" ? recentsOrder : null,
      }).length;

    return {
      library: count("library"),
      untagged: count("untagged"),
      recents: count("recents"),
      trash: count("trash"),
    };
  }, [saves, recentsOrder]);

  const visibleItems = React.useMemo<SidebarNavEntry[]>(
    () => navItems.map((item) => ({ item, count: counts[item.mode] })),
    [counts],
  );

  return { visibleItems, counts };
}

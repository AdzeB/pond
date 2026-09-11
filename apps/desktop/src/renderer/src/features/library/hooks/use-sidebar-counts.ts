import type { LibrarySidebarCounts } from "@shared/sidebar-counts";
import { useEffect, useState } from "react";

const EMPTY: LibrarySidebarCounts = {
  library: 0,
  uncategorized: 0,
  untagged: 0,
  trash: 0,
  folders: {},
};
export function useSidebarCounts(): LibrarySidebarCounts {
  const [counts, setCounts] = useState(EMPTY);
  useEffect(() => {
    let active = true;
    let pending = false;
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        void refresh();
      }, 150);
    };
    const refresh = async () => {
      if (pending) {
        dirty = true;
        return;
      }
      pending = true;
      dirty = false;
      try {
        const next = await window.pond.query("saves.sidebarCounts", {});
        if (active && next) setCounts(next);
      } catch (error) {
        console.warn("[pond] sidebar counts failed", error);
      } finally {
        pending = false;
        if (active && dirty) schedule();
      }
    };
    void refresh();
    const off = window.pond.onSyncAction(schedule);
    return () => {
      active = false;
      off();
      if (timer) clearTimeout(timer);
    };
  }, []);
  return counts;
}

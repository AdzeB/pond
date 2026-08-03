import { useSelector } from "@tanstack/react-store";
import { useEffect, useMemo } from "react";
import { openSave } from "@/lib/ui/save-nav";
import { pool, savesStore } from "@/stores/pool";
import { useRecents } from "@/stores/recents";

interface RecentMenuEntry {
  id: string;
  title: string;
}

function titleFor(id: string): string | null {
  const save = pool.get(id);
  if (!save) return null;
  const trimmed = save.title?.trim();
  if (trimmed) return trimmed;
  return save.url || "Untitled";
}

/** Mirrors recently-visited saves into the native History menu; choosing an entry comes back over `onMenuOpenSave` and opens the save like a card click. */
export function MenuRecentsBridge(): null {
  const recents = useRecents();
  /** Saves hydrate lazily; revision wakes when pool rows change without cloning the Map. */
  const revision = useSelector(savesStore, (s) => s.revision);

  const entries = useMemo<RecentMenuEntry[]>(() => {
    void revision;
    const out: RecentMenuEntry[] = [];
    for (const entry of recents) {
      const title = titleFor(entry.saveId);
      if (title) out.push({ id: entry.saveId, title });
    }
    return out;
  }, [recents, revision]);

  useEffect(() => {
    window.pond.sendMenuRecents(entries);
  }, [entries]);

  useEffect(() => {
    return window.pond.onMenuOpenSave((id) => {
      openSave(id);
    });
  }, []);

  return null;
}

import { useSelector } from "@tanstack/react-store";
import { useEffect, useMemo } from "react";
import { pool, savesStore } from "@/stores/pool";
import { useRecents } from "@/stores/recents";
import { primarySelection } from "@/stores/selection";

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
  /** Saves hydrate lazily; subscribing to the pool re-resolves titles as they arrive. */
  const byId = useSelector(savesStore, (s) => s.byId);

  const entries = useMemo<RecentMenuEntry[]>(() => {
    void byId;
    const out: RecentMenuEntry[] = [];
    for (const entry of recents) {
      const title = titleFor(entry.saveId);
      if (title) out.push({ id: entry.saveId, title });
    }
    return out;
  }, [recents, byId]);

  useEffect(() => {
    window.pond.sendMenuRecents(entries);
  }, [entries]);

  useEffect(() => {
    return window.pond.onMenuOpenSave((id) => {
      primarySelection.set(id);
    });
  }, []);

  return null;
}

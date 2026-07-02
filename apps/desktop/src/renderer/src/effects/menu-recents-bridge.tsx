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

// Mirrors the renderer's recently-visited saves into the native History menu.
// The recents list (ids) lives in localStorage; titles are resolved from the
// pool, so we re-push whenever either changes. Choosing an entry comes back over
// `onMenuOpenSave`, which opens the save the same way a card click does.
export function MenuRecentsBridge(): null {
  const recents = useRecents();
  // Re-resolve titles whenever the pool changes (saves hydrate lazily).
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

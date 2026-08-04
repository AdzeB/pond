import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { pondScopedKey } from "@/lib/pond-scope";

export interface Tab {
  id: string;
  path: string;
  pinned: boolean;
}

interface ClosedTab {
  path: string;
  index: number;
}

interface TabState {
  tabs: Tab[];
  activeId: string;
  recentlyClosed: ClosedTab[];
}

const STORAGE_KEY = pondScopedKey("pond.tabs");

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function findLastPinnedIndex(tabs: Tab[]): number {
  for (let i = tabs.length - 1; i >= 0; i--) {
    if (tabs[i]?.pinned) return i;
  }
  return -1;
}

function pinsFirst(list: Tab[]): Tab[] {
  const pinned: Tab[] = [];
  const unpinned: Tab[] = [];
  for (const tab of list) {
    if (tab.pinned) pinned.push(tab);
    else unpinned.push(tab);
  }
  return [...pinned, ...unpinned];
}

function rememberClosed(
  existing: ClosedTab[],
  ...entries: ClosedTab[]
): ClosedTab[] {
  return [...entries, ...existing].slice(0, 10);
}

function loadPersistedState(): TabState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TabState;
    if (!Array.isArray(parsed.tabs) || parsed.tabs.length === 0) return null;
    const tabs = parsed.tabs.map((t) => ({
      ...t,
      path: sanitizePath(t.path),
    }));
    const first = tabs[0];
    if (!first) return null;
    const activeId = tabs.find((t) => t.id === parsed.activeId)?.id ?? first.id;
    return { tabs, activeId, recentlyClosed: [] };
  } catch {
    return null;
  }
}

/** Settings lives in a modal now; old persisted tab paths would 404. */
function sanitizePath(path: string): string {
  const pathname = path.split("?")[0] ?? "/";
  if (pathname.startsWith("/settings")) return "/";
  return path || "/";
}

let pendingPersist: TabState | null = null;
let persistHandle: ReturnType<typeof setTimeout> | null = null;
const persistIdle: (cb: () => void) => unknown =
  typeof window !== "undefined" &&
  typeof (
    window as unknown as { requestIdleCallback?: (cb: () => void) => number }
  ).requestIdleCallback === "function"
    ? (cb) =>
        (
          window as unknown as {
            requestIdleCallback: (cb: () => void) => number;
          }
        ).requestIdleCallback(cb)
    : (cb) => setTimeout(cb, 100);

function writeNow(state: TabState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tabs: state.tabs,
        activeId: state.activeId,
      }),
    );
  } catch {
    /** Storage denied; tabs still work in-memory for the session. */
  }
}

function persist(state: TabState): void {
  pendingPersist = state;
  if (persistHandle !== null) return;
  persistHandle = setTimeout(() => {
    persistHandle = null;
    const next = pendingPersist;
    pendingPersist = null;
    if (next) persistIdle(() => writeNow(next));
  }, 0);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    if (pendingPersist) writeNow(pendingPersist);
  });
}

function defaultState(initialPath = "/"): TabState {
  const id = uid();
  return {
    tabs: [{ id, path: sanitizePath(initialPath), pinned: false }],
    activeId: id,
    recentlyClosed: [],
  };
}

function commit(next: TabState): void {
  persist(next);
  store.setState(() => next);
}

const store = new Store<TabState>(loadPersistedState() ?? defaultState());

export const tabs = {
  getState(): TabState {
    return store.state;
  },
  /** Seed the first tab when nothing was persisted; no-op once tabs exist. */
  ensureInitial(path: string): void {
    const s = store.state;
    if (s.tabs.length !== 1) return;
    const only = s.tabs[0];
    if (!only?.path || only.path !== "/" || path === "/") return;
    commit({
      ...s,
      tabs: [{ ...only, path: sanitizePath(path) }],
    });
  },
  open(path: string, opts?: { background?: boolean }): string {
    const id = uid();
    const tab: Tab = { id, path: sanitizePath(path), pinned: false };
    const s = store.state;
    commit({
      ...s,
      tabs: [...s.tabs, tab],
      activeId: opts?.background ? s.activeId : id,
    });
    return id;
  },
  close(id: string): void {
    const s = store.state;
    if (s.tabs.length <= 1) return;
    const idx = s.tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const tab = s.tabs[idx];
    if (!tab || tab.pinned) return;

    const nextTabs = s.tabs.filter((t) => t.id !== id);
    let nextActive = s.activeId;
    if (s.activeId === id) {
      const neighbor = nextTabs[Math.min(idx, nextTabs.length - 1)];
      if (!neighbor) return;
      nextActive = neighbor.id;
    }
    commit({
      tabs: nextTabs,
      activeId: nextActive,
      recentlyClosed: rememberClosed(s.recentlyClosed, {
        path: tab.path,
        index: idx,
      }),
    });
  },
  closeOthers(id: string): void {
    const s = store.state;
    const kept = s.tabs.filter((t) => t.id === id || t.pinned);
    if (kept.length === s.tabs.length) return;
    commit({ tabs: kept, activeId: id, recentlyClosed: s.recentlyClosed });
  },
  closeToRight(id: string): void {
    const s = store.state;
    const idx = s.tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const kept = s.tabs.filter((t, i) => i <= idx || t.pinned);
    let nextActive = s.activeId;
    if (!kept.find((t) => t.id === nextActive)) nextActive = id;
    commit({
      tabs: kept,
      activeId: nextActive,
      recentlyClosed: s.recentlyClosed,
    });
  },
  /** Close every unpinned tab; if none are pinned, leave a single Library tab. */
  closeAll(): void {
    const s = store.state;
    const pinned: Tab[] = [];
    const closedEntries: ClosedTab[] = [];
    for (let i = 0; i < s.tabs.length; i++) {
      const tab = s.tabs[i];
      if (!tab) continue;
      if (tab.pinned) pinned.push(tab);
      else closedEntries.push({ path: tab.path, index: i });
    }
    if (closedEntries.length === 0) return;

    const recentlyClosed = rememberClosed(s.recentlyClosed, ...closedEntries);
    if (pinned.length > 0) {
      const head = pinned[0];
      if (!head) return;
      const nextActive = pinned.find((t) => t.id === s.activeId)?.id ?? head.id;
      commit({ tabs: pinned, activeId: nextActive, recentlyClosed });
      return;
    }

    commit({ ...defaultState(), recentlyClosed });
  },
  activate(id: string): void {
    const s = store.state;
    if (!s.tabs.find((t) => t.id === id) || s.activeId === id) return;
    commit({ ...s, activeId: id });
  },
  activateByIndex(index: number): void {
    const tab = store.state.tabs[index];
    if (!tab) return;
    tabs.activate(tab.id);
  },
  activateNext(): void {
    const s = store.state;
    const idx = s.tabs.findIndex((t) => t.id === s.activeId);
    const nextIdx = (idx + 1) % s.tabs.length;
    const id = s.tabs[nextIdx]?.id;
    if (id) tabs.activate(id);
  },
  activatePrev(): void {
    const s = store.state;
    const idx = s.tabs.findIndex((t) => t.id === s.activeId);
    const prevIdx = (idx - 1 + s.tabs.length) % s.tabs.length;
    const id = s.tabs[prevIdx]?.id;
    if (id) tabs.activate(id);
  },
  pin(id: string): void {
    const s = store.state;
    const idx = s.tabs.findIndex((t) => t.id === id);
    const current = idx === -1 ? undefined : s.tabs[idx];
    if (!current || current.pinned) return;
    const tab = { ...current, pinned: true };
    const without = s.tabs.filter((_, i) => i !== idx);
    const insertAt = findLastPinnedIndex(without) + 1;
    commit({
      ...s,
      tabs: [...without.slice(0, insertAt), tab, ...without.slice(insertAt)],
    });
  },
  unpin(id: string): void {
    const s = store.state;
    const idx = s.tabs.findIndex((t) => t.id === id);
    const current = idx === -1 ? undefined : s.tabs[idx];
    if (!current?.pinned) return;
    const tab = { ...current, pinned: false };
    const without = s.tabs.filter((_, i) => i !== idx);
    const insertAt = findLastPinnedIndex(without) + 1;
    commit({
      ...s,
      tabs: [...without.slice(0, insertAt), tab, ...without.slice(insertAt)],
    });
  },
  setOrder(ids: string[]): void {
    const s = store.state;
    if (ids.length === 0) return;
    const byId = new Map(s.tabs.map((t) => [t.id, t]));
    const reordered: Tab[] = [];
    for (const id of ids) {
      const tab = byId.get(id);
      if (!tab) return;
      reordered.push(tab);
    }
    const subset = new Set(ids);
    const nextTabs: Tab[] = [];
    let cursor = 0;
    for (const t of s.tabs) {
      if (subset.has(t.id)) {
        const pick = reordered[cursor++];
        if (!pick) return;
        nextTabs.push(pick);
      } else {
        nextTabs.push(t);
      }
    }
    const bounded = pinsFirst(nextTabs);
    let changed = false;
    for (let i = 0; i < bounded.length; i++) {
      if (bounded[i] !== s.tabs[i]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    commit({ ...s, tabs: bounded });
  },
  duplicate(id: string): void {
    const tab = store.state.tabs.find((t) => t.id === id);
    if (!tab) return;
    tabs.open(tab.path);
  },
  reopenClosed(): void {
    const s = store.state;
    const [entry, ...rest] = s.recentlyClosed;
    if (!entry) return;
    const id = uid();
    const tab: Tab = { id, path: sanitizePath(entry.path), pinned: false };
    const insertAt = Math.min(entry.index, s.tabs.length);
    commit({
      tabs: [...s.tabs.slice(0, insertAt), tab, ...s.tabs.slice(insertAt)],
      activeId: id,
      recentlyClosed: rest,
    });
  },
  updatePath(id: string, path: string): void {
    const s = store.state;
    const idx = s.tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const nextPath = sanitizePath(path);
    if (s.tabs[idx]?.path === nextPath) return;
    commit({
      ...s,
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, path: nextPath } : t)),
    });
  },
  subscribe(fn: () => void): () => void {
    const sub = store.subscribe(fn);
    return () => sub.unsubscribe();
  },
};

export function useTabs(): Tab[] {
  return useSelector(store, (s) => s.tabs);
}

export function useActiveTabId(): string {
  return useSelector(store, (s) => s.activeId);
}

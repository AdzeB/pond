import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { beginLibraryLayoutTransition } from "@/features/library/lib/library-layout-transition";
import { navigationHistory } from "@/features/library/state/navigation-history";
import type { SaveInspectorTab } from "@/features/saves";
import type { LibraryNav } from "@/shared/lib/library-nav";

export type { LibraryNav } from "@/shared/lib/library-nav";

export const SIDEBAR_WIDTH_DEFAULT = 220;
export const SIDEBAR_WIDTH_MIN = 256;
export const SIDEBAR_WIDTH_MAX = 420;
export const AGENT_WIDTH_DEFAULT = 340;
export const AGENT_WIDTH_MIN = 280;
export const AGENT_WIDTH_MAX = 560;

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === "0") return false;
    if (stored === "1") return true;
  } catch {}
  return fallback;
}

function readWidth(
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored == null) return fallback;
    const next = Number.parseInt(stored, 10);
    if (!Number.isFinite(next)) return fallback;
    return Math.min(max, Math.max(min, next));
  } catch {
    return fallback;
  }
}

function writeWidth(key: string, width: number): void {
  try {
    window.localStorage.setItem(key, String(width));
  } catch {}
}

function writeFlag(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {}
}

export type LibraryRightPane = "agent" | "inspector" | null;

interface ChromeState {
  nav: LibraryNav;
  sidebarOpen: boolean;
  rightOpen: boolean;
  agentOpen: boolean;
  rightPane: LibraryRightPane;
  inspectorSaveId: string | null;
  inspectorTab: SaveInspectorTab;
  sidebarWidth: number;
  agentWidth: number;
}

function hasInspectorTarget(s: ChromeState): boolean {
  return s.inspectorSaveId != null;
}

function commitChrome(current: ChromeState, next: ChromeState): ChromeState {
  if (
    current.rightOpen === next.rightOpen &&
    current.rightPane === next.rightPane &&
    current.agentOpen === next.agentOpen &&
    current.inspectorSaveId === next.inspectorSaveId &&
    current.inspectorTab === next.inspectorTab
  ) {
    return current;
  }
  if ((current.rightPane === null) !== (next.rightPane === null)) {
    beginLibraryLayoutTransition();
  }
  if (current.rightOpen !== next.rightOpen) {
    writeFlag("pond.rightOpen", next.rightOpen);
  }
  if (current.agentOpen !== next.agentOpen) {
    writeFlag("pond.agent", next.agentOpen);
  }
  return next;
}

function restingPane(open: boolean): LibraryRightPane {
  return open ? "agent" : null;
}

function initialRightOpen(): boolean {
  try {
    const stored = window.localStorage.getItem("pond.rightOpen");
    if (stored === "0" || stored === "1") return stored === "1";
    if (window.localStorage.getItem("pond.agent") === "0") return false;
  } catch {}
  return true;
}

const initialAgentOpen = readFlag("pond.agent", false);
const rightOpenAtLaunch = initialRightOpen();

const store = new Store<ChromeState>({
  nav: { kind: "all" },
  sidebarOpen: readFlag("pond.sidebar", true),
  rightOpen: rightOpenAtLaunch,
  agentOpen: initialAgentOpen,
  rightPane: rightOpenAtLaunch ? "agent" : null,
  inspectorSaveId: null,
  inspectorTab: "organize",
  sidebarWidth: readWidth(
    "pond.sidebarWidth",
    SIDEBAR_WIDTH_DEFAULT,
    SIDEBAR_WIDTH_MIN,
    SIDEBAR_WIDTH_MAX,
  ),
  agentWidth: readWidth(
    "pond.agentWidth",
    AGENT_WIDTH_DEFAULT,
    AGENT_WIDTH_MIN,
    AGENT_WIDTH_MAX,
  ),
});

export const libraryChrome = {
  getState(): ChromeState {
    return store.state;
  },
  inspectSave(inspectorSaveId: string | null): void {
    store.setState((s) => {
      if (s.inspectorSaveId === inspectorSaveId) return s;
      return commitChrome(s, {
        ...s,
        inspectorSaveId,
        inspectorTab:
          inspectorSaveId === s.inspectorSaveId ? s.inspectorTab : "organize",
        rightPane: s.rightOpen
          ? inspectorSaveId
            ? "inspector"
            : "agent"
          : null,
      });
    });
  },
  openSaveDetails(
    inspectorSaveId: string,
    inspectorTab: SaveInspectorTab = "organize",
  ): void {
    store.setState((s) => {
      if (
        s.inspectorSaveId === inspectorSaveId &&
        s.inspectorTab === inspectorTab &&
        s.rightPane === "inspector" &&
        s.rightOpen
      )
        return s;
      return commitChrome(s, {
        ...s,
        inspectorSaveId,
        inspectorTab,
        rightOpen: true,
        rightPane: "inspector",
      });
    });
  },
  setInspectorTab(inspectorTab: SaveInspectorTab): void {
    store.setState((s) =>
      s.inspectorTab === inspectorTab ? s : { ...s, inspectorTab },
    );
  },
  setInspectorSaveId(inspectorSaveId: string | null): void {
    store.setState((s) =>
      s.inspectorSaveId === inspectorSaveId ? s : { ...s, inspectorSaveId },
    );
  },
  setNav(nav: LibraryNav): void {
    navigationHistory.record(nav);
    store.setState((s) => ({ ...s, nav }));
  },
  toggleSidebar(): void {
    beginLibraryLayoutTransition();
    store.setState((s) => {
      const sidebarOpen = !s.sidebarOpen;
      try {
        window.localStorage.setItem("pond.sidebar", sidebarOpen ? "1" : "0");
      } catch {}
      return { ...s, sidebarOpen };
    });
  },
  toggleAgent(): void {
    libraryChrome.setAgentOpen(store.state.rightPane !== "agent");
  },
  setAgentOpen(agentOpen: boolean): void {
    store.setState((s) => {
      const rightOpen = agentOpen
        ? true
        : hasInspectorTarget(s)
          ? s.rightOpen
          : false;
      const rightPane: LibraryRightPane = !rightOpen
        ? null
        : agentOpen
          ? "agent"
          : "inspector";
      return commitChrome(s, { ...s, agentOpen, rightOpen, rightPane });
    });
  },
  /** Hiding inspector content keeps the column width stable. */
  dismissInspector(): void {
    store.setState((s) => {
      if (s.rightPane !== "inspector") return s;
      return commitChrome(s, {
        ...s,
        rightPane: restingPane(s.rightOpen),
      });
    });
  },
  toggleInspector(): void {
    store.setState((s) => {
      if (!hasInspectorTarget(s)) return s;
      const opening = s.rightPane !== "inspector";
      return commitChrome(s, {
        ...s,
        rightOpen: opening,
        rightPane: opening ? "inspector" : null,
      });
    });
  },
  closeRightPane(): void {
    store.setState((s) => {
      if (!s.rightOpen && s.rightPane === null) return s;
      return commitChrome(s, {
        ...s,
        rightOpen: false,
        rightPane: null,
        agentOpen: s.rightPane === "agent" ? false : s.agentOpen,
      });
    });
  },
  toggleRightPane(): void {
    if (store.state.rightOpen) libraryChrome.closeRightPane();
    else if (hasInspectorTarget(store.state)) libraryChrome.toggleInspector();
    else libraryChrome.setAgentOpen(true);
  },
  setSidebarWidth(sidebarWidth: number): void {
    const next = Math.min(
      SIDEBAR_WIDTH_MAX,
      Math.max(SIDEBAR_WIDTH_MIN, Math.round(sidebarWidth)),
    );
    writeWidth("pond.sidebarWidth", next);
    store.setState((s) =>
      s.sidebarWidth === next ? s : { ...s, sidebarWidth: next },
    );
  },
  setAgentWidth(agentWidth: number): void {
    const next = Math.min(
      AGENT_WIDTH_MAX,
      Math.max(AGENT_WIDTH_MIN, Math.round(agentWidth)),
    );
    writeWidth("pond.agentWidth", next);
    store.setState((s) =>
      s.agentWidth === next ? s : { ...s, agentWidth: next },
    );
  },
};

export function useLibraryNav(): LibraryNav {
  return useSelector(store, (s) => s.nav);
}

export function useSidebarOpen(): boolean {
  return useSelector(store, (s) => s.sidebarOpen);
}

export function useRightPane(): LibraryRightPane {
  return useSelector(store, (s) => s.rightPane);
}

export function useInspectorSaveId(): string | null {
  return useSelector(store, (s) => s.inspectorSaveId);
}

export function useInspectorTab(): SaveInspectorTab {
  return useSelector(store, (s) => s.inspectorTab);
}

export function useSidebarWidth(): number {
  return useSelector(store, (s) => s.sidebarWidth);
}

export function useAgentWidth(): number {
  return useSelector(store, (s) => s.agentWidth);
}

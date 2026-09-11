import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { beginLibraryLayoutTransition } from "@/features/library/lib/library-layout-transition";

export type LibraryNav =
  | { kind: "all" }
  | { kind: "uncategorized" }
  | { kind: "folder"; id: string }
  | { kind: "tag"; name: string }
  | { kind: "trash" }
  | { kind: "downloads" }
  | { kind: "sources" };

export const SIDEBAR_WIDTH_DEFAULT = 220;
export const SIDEBAR_WIDTH_MIN = 220;
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

export type LibraryRightPane = "agent" | "inspector" | null;
export type LibraryInspectorMode = "save" | "download";

interface ChromeState {
  nav: LibraryNav;
  sidebarOpen: boolean;
  agentOpen: boolean;
  rightPane: LibraryRightPane;
  inspectorSaveId: string | null;
  inspectorMode: LibraryInspectorMode;
  sidebarWidth: number;
  agentWidth: number;
}

const initialAgentOpen = readFlag("pond.agent", false);

const store = new Store<ChromeState>({
  nav: { kind: "all" },
  sidebarOpen: readFlag("pond.sidebar", true),
  agentOpen: initialAgentOpen,
  rightPane: initialAgentOpen ? "agent" : null,
  inspectorSaveId: null,
  inspectorMode: "save",
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
      if (s.inspectorSaveId === inspectorSaveId && s.inspectorMode === "save")
        return s;
      beginLibraryLayoutTransition();
      return {
        ...s,
        inspectorSaveId,
        inspectorMode: "save",
        rightPane: inspectorSaveId ? "inspector" : s.agentOpen ? "agent" : null,
      };
    });
  },
  inspectDownload(inspectorSaveId: string): void {
    store.setState((s) => {
      if (
        s.inspectorSaveId === inspectorSaveId &&
        s.inspectorMode === "download" &&
        s.rightPane === "inspector"
      )
        return s;
      beginLibraryLayoutTransition();
      return {
        ...s,
        inspectorSaveId,
        inspectorMode: "download",
        rightPane: "inspector",
      };
    });
  },
  setInspectorSaveId(inspectorSaveId: string | null): void {
    store.setState((s) =>
      s.inspectorSaveId === inspectorSaveId && s.inspectorMode === "save"
        ? s
        : { ...s, inspectorSaveId, inspectorMode: "save" },
    );
  },
  setNav(nav: LibraryNav): void {
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
      const rightPane = agentOpen
        ? "agent"
        : s.inspectorSaveId
          ? "inspector"
          : null;
      if (s.agentOpen === agentOpen && s.rightPane === rightPane) return s;
      beginLibraryLayoutTransition();
      try {
        window.localStorage.setItem("pond.agent", agentOpen ? "1" : "0");
      } catch {}
      return { ...s, agentOpen, rightPane };
    });
  },
  toggleInspector(): void {
    store.setState((s) => {
      if (!s.inspectorSaveId) return s;
      beginLibraryLayoutTransition();
      return {
        ...s,
        rightPane: s.rightPane === "inspector" ? null : "inspector",
      };
    });
  },
  closeRightPane(): void {
    store.setState((s) => {
      if (s.rightPane === null) return s;
      beginLibraryLayoutTransition();
      if (s.rightPane !== "agent") return { ...s, rightPane: null };
      try {
        window.localStorage.setItem("pond.agent", "0");
      } catch {}
      return { ...s, rightPane: null, agentOpen: false };
    });
  },
  toggleRightPane(): void {
    if (store.state.rightPane !== null) libraryChrome.closeRightPane();
    else if (store.state.inspectorSaveId) libraryChrome.toggleInspector();
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

export function useInspectorMode(): LibraryInspectorMode {
  return useSelector(store, (s) => s.inspectorMode);
}

export function useSidebarWidth(): number {
  return useSelector(store, (s) => s.sidebarWidth);
}

export function useAgentWidth(): number {
  return useSelector(store, (s) => s.agentWidth);
}

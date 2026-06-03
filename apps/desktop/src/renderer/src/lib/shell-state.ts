import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import {
  readViewPref,
  type ViewPrefKey,
  writeViewPref,
} from "@/lib/view-prefs";

// Single source of truth for shell-level state: aside open/closed
// prefs (persisted), the live window width (resize-driven), and the
// derived grid width that the layout packers consume. Snapping the
// grid width to a discrete value the moment an aside toggles keeps
// the packers from running every frame while the CSS width animates;
// `motion.li layout="position"` interpolates the cards.

const SIDEBAR_PANE_WIDTH = 256;
const INSPECTOR_PANE_WIDTH = 256;
const SHELL_MAIN_PADDING = 12;

type PanePrefKey = Extract<ViewPrefKey, "sidebar" | "inspector">;

interface ShellState {
  readonly sidebarOpen: boolean;
  readonly inspectorOpen: boolean;
  readonly windowWidth: number;
}

function readOpen(key: PanePrefKey): boolean {
  const v = readViewPref(key);
  if (v === "closed") return false;
  if (v === "open") return true;
  return true;
}

const store = new Store<ShellState>({
  sidebarOpen: readOpen("sidebar"),
  inspectorOpen: readOpen("inspector"),
  windowWidth: window.innerWidth,
});

window.addEventListener("resize", () => {
  const next = window.innerWidth;
  store.setState((s) =>
    s.windowWidth === next ? s : { ...s, windowWidth: next },
  );
});

function setPane(
  key: PanePrefKey,
  field: "sidebarOpen" | "inspectorOpen",
  next: boolean,
): void {
  writeViewPref(key, next ? "open" : "closed");
  store.setState((s) => (s[field] === next ? s : { ...s, [field]: next }));
}

export function setSidebarOpen(next: boolean): void {
  setPane("sidebar", "sidebarOpen", next);
}

export function setInspectorOpen(next: boolean): void {
  setPane("inspector", "inspectorOpen", next);
}

export function toggleSidebar(): void {
  setSidebarOpen(!store.state.sidebarOpen);
}

export function toggleInspector(): void {
  setInspectorOpen(!store.state.inspectorOpen);
}

export interface PanePref {
  open: boolean;
  toggle: () => void;
  setOpen: (next: boolean) => void;
}

export function useSidebar(): PanePref {
  const open = useStore(store, (s) => s.sidebarOpen);
  return { open, toggle: toggleSidebar, setOpen: setSidebarOpen };
}

export function useInspector(): PanePref {
  const open = useStore(store, (s) => s.inspectorOpen);
  return { open, toggle: toggleInspector, setOpen: setInspectorOpen };
}

export function useGridWidth(): number {
  const windowWidth = useStore(store, (s) => s.windowWidth);
  const sidebarOpen = useStore(store, (s) => s.sidebarOpen);
  const inspectorOpen = useStore(store, (s) => s.inspectorOpen);

  const sidebarW = sidebarOpen ? SIDEBAR_PANE_WIDTH : 0;
  const inspectorW = inspectorOpen ? INSPECTOR_PANE_WIDTH : 0;

  return Math.max(
    0,
    windowWidth - sidebarW - inspectorW - SHELL_MAIN_PADDING * 2,
  );
}

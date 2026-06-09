import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useWindowSize } from "rooks";
import {
  readViewPref,
  type ViewPrefKey,
  writeViewPref,
} from "@/features/library/lib/view-prefs";

// Single source of truth for shell-level state: aside open/closed
// prefs (persisted) plus the derived grid width that the layout
// packers consume. The live window width comes from `useWindowSize`
// (a `useSyncExternalStore`-backed resize listener) rather than a
// hand-rolled listener. Snapping the grid width to a discrete value
// the moment an aside toggles keeps the packers from running every
// frame while the CSS width animates; `motion.li layout="position"`
// interpolates the cards.

const SIDEBAR_PANE_WIDTH = 256;
const SHELL_MAIN_PADDING = 12;

type PanePrefKey = Extract<ViewPrefKey, "sidebar">;

interface ShellState {
  readonly sidebarOpen: boolean;
}

function readOpen(key: PanePrefKey): boolean {
  const v = readViewPref(key);
  if (v === "closed") return false;
  if (v === "open") return true;
  return true;
}

const store = new Store<ShellState>({
  sidebarOpen: readOpen("sidebar"),
});

function setPane(
  key: PanePrefKey,
  field: "sidebarOpen",
  next: boolean,
): void {
  writeViewPref(key, next ? "open" : "closed");
  store.setState((s) => (s[field] === next ? s : { ...s, [field]: next }));
}

export function setSidebarOpen(next: boolean): void {
  setPane("sidebar", "sidebarOpen", next);
}

export function toggleSidebar(): void {
  setSidebarOpen(!store.state.sidebarOpen);
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

export function useGridWidth(): number {
  const { innerWidth } = useWindowSize();
  const sidebarOpen = useStore(store, (s) => s.sidebarOpen);

  // The save drawer is a floating overlay and no longer reserves grid
  // space, so only the sidebar affects the packed grid width.
  // `innerWidth` is null only during SSR snapshots; the Electron
  // renderer always has a real value on first client paint.
  const windowWidth = innerWidth ?? window.innerWidth;
  const sidebarW = sidebarOpen ? SIDEBAR_PANE_WIDTH : 0;

  return Math.max(0, windowWidth - sidebarW - SHELL_MAIN_PADDING * 2);
}

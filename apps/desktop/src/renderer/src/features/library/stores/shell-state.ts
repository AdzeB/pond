import { useWindowSize } from "rooks";

// The layout no longer has a left sidebar (navigation moved to the floating
// bottom dock), so the packed grid spans the full window width minus the
// shell's horizontal padding. The live window width comes from
// `useWindowSize` (a `useSyncExternalStore`-backed resize listener).

// Horizontal inset between the window edge and the packed grid's content box:
// `Shell.Main` pads by `--ds-mac-inset` (16px) and `LibraryGrid.Root` adds a
// further 4px, on each side. The packer positions cards absolutely, so this
// must match the real content width or columns overflow the right edge.
const SHELL_MAIN_PADDING = 16;
const GRID_ROOT_PADDING = 4;
const GRID_HORIZONTAL_INSET = (SHELL_MAIN_PADDING + GRID_ROOT_PADDING) * 2;

export function useGridWidth(): number {
  const { innerWidth } = useWindowSize();

  // `innerWidth` is null only during SSR snapshots; the Electron renderer
  // always has a real value on first client paint.
  const windowWidth = innerWidth ?? window.innerWidth;

  return Math.max(0, windowWidth - GRID_HORIZONTAL_INSET);
}

import { useWindowSize } from "rooks";

/** AppShell `--shell-inset` + library `Shell.Main` padding-inline; keep in sync with those styles. */
const SHELL_INSET = 12;
const MAIN_PADDING_INLINE = 20;
const GRID_HORIZONTAL_INSET = (SHELL_INSET + MAIN_PADDING_INLINE) * 2;

export function useGridWidth(): number {
  const { innerWidth } = useWindowSize();

  /** `innerWidth` is null only during SSR; the Electron renderer always has a real value. */
  const windowWidth = innerWidth ?? window.innerWidth;

  return Math.max(0, windowWidth - GRID_HORIZONTAL_INSET);
}

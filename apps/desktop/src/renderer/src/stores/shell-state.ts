import { useWindowSize } from "rooks";

// Horizontal inset per side: Shell.Main pads 16px. Must match real content width or absolutely-positioned columns overflow.
const SHELL_MAIN_PADDING = 16;
const GRID_HORIZONTAL_INSET = SHELL_MAIN_PADDING * 2;

export function useGridWidth(): number {
  const { innerWidth } = useWindowSize();

  // `innerWidth` is null only during SSR; the Electron renderer always has a real value.
  const windowWidth = innerWidth ?? window.innerWidth;

  return Math.max(0, windowWidth - GRID_HORIZONTAL_INSET);
}

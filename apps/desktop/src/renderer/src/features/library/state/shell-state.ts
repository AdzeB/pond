import { useLayoutEffect, useState } from "react";
import {
  useAgentWidth,
  useRightPane,
  useSidebarOpen,
  useSidebarWidth,
} from "@/features/library/state/library-chrome";
import { observeSettledSize } from "@/shared/lib/settled-resize";

const MAIN_PADDING_INLINE = 20;
const GRID_PADDING = MAIN_PADDING_INLINE * 2;
const RIGHT_PANE_INSET = 16;

interface PaneWidths {
  agentOpen: boolean;
  agentWidth: number;
  sidebarOpen: boolean;
  sidebarWidth: number;
}

interface GridMeasurement {
  occupiedWidth: number;
  width: number;
}

export function occupiedPaneWidth(panes: PaneWidths): number {
  return (
    (panes.sidebarOpen ? panes.sidebarWidth : 0) +
    (panes.agentOpen ? panes.agentWidth + RIGHT_PANE_INSET : 0)
  );
}

export function predictGridWidth(
  measuredWidth: number,
  measuredOccupiedWidth: number,
  currentOccupiedWidth: number,
): number {
  return Math.max(
    0,
    measuredWidth + measuredOccupiedWidth - currentOccupiedWidth,
  );
}

function fallbackWidth(): number {
  if (!globalThis.window) return 0;
  return Math.max(0, window.innerWidth - 64);
}

function measuredOccupiedPaneWidth(viewport: HTMLElement): number {
  const root = viewport.closest("[data-slot=window]");
  const left = root?.querySelector<HTMLElement>("[data-slot=left]");
  const right = root?.querySelector<HTMLElement>("[data-slot=right]");
  return (
    (left?.getBoundingClientRect().width ?? 0) +
    (right?.getBoundingClientRect().width ?? 0) +
    (right?.hasAttribute("data-open") ? RIGHT_PANE_INSET : 0)
  );
}

export function useGridWidth(): number {
  const sidebarOpen = useSidebarOpen();
  const sidebarWidth = useSidebarWidth();
  const agentOpen = useRightPane() !== null;
  const agentWidth = useAgentWidth();
  const occupiedWidth = occupiedPaneWidth({
    agentOpen,
    agentWidth,
    sidebarOpen,
    sidebarWidth,
  });
  const [measurement, setMeasurement] = useState<GridMeasurement>(() => ({
    occupiedWidth,
    width: fallbackWidth(),
  }));

  useLayoutEffect(() => {
    const viewport = document.querySelector<HTMLElement>(
      "[data-library-grid-viewport]",
    );
    if (!viewport) return;

    return observeSettledSize(
      viewport,
      () => {
        const next = Math.max(0, viewport.clientWidth - GRID_PADDING);
        const nextOccupiedWidth = measuredOccupiedPaneWidth(viewport);
        setMeasurement((current) =>
          current.width === next && current.occupiedWidth === nextOccupiedWidth
            ? current
            : { occupiedWidth: nextOccupiedWidth, width: next },
        );
      },
      { continuous: true },
    );
  }, []);

  return predictGridWidth(
    measurement.width,
    measurement.occupiedWidth,
    occupiedWidth,
  );
}

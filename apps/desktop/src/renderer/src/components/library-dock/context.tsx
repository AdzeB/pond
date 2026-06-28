import type { Tooltip } from "@pond/ui";
import { createContext, type ReactNode, type RefObject, use } from "react";
import type { DockTab } from "./nav-tabs";
import type { DockView } from "./types";

// Reduced-motion-aware enter/exit used by every content module so they all
// cross-fade in lockstep with the pill's width morph.
export interface SwapVariants {
  initial: Record<string, number>;
  animate: Record<string, number>;
  exit: Record<string, number>;
}

export type DockTooltipHandle = ReturnType<
  typeof Tooltip.createHandle<ReactNode>
>;

// Single dependency-injection value. `Root` is the only place that resolves
// preview-vs-live state, so content modules stay dumb consumers.
export interface DockContextValue {
  // resolved state
  view: DockView;
  selectionSize: number;
  filteredCount: number;
  inTrash: boolean;
  allSelected: boolean;
  isTabActive: (tab: DockTab) => boolean;
  thinking: boolean;
  isCard: boolean;
  // actions
  openAsk: () => void;
  closeAsk: () => void;
  clearResults: () => void;
  destructive: () => void;
  runSelectionTask: () => void;
  openTagMenu: () => void;
  openOverflowMenu: () => void;
  openNewSave: () => void;
  // meta
  isPreview: boolean;
  swap: SwapVariants;
  tooltip: DockTooltipHandle;
  pillRef: RefObject<HTMLDivElement | null>;
}

const DockContext = createContext<DockContextValue | null>(null);

export function DockProvider({
  value,
  children,
}: {
  value: DockContextValue;
  children: ReactNode;
}) {
  return <DockContext value={value}>{children}</DockContext>;
}

export function useDock(): DockContextValue {
  const ctx = use(DockContext);
  if (!ctx) {
    throw new Error("useDock must be used within a Dock.Root");
  }
  return ctx;
}

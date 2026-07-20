import type { TargetAndTransition, Transition } from "motion/react";
import { createContext, type ReactNode, type RefObject, use } from "react";
import type { DockTab } from "./nav-tabs";
import type { DockView, ViewMenuSection } from "./types";

/** Reduced-motion-aware enter/exit shared by every content module so they cross-fade in lockstep with the pill's width morph. */
interface SwapVariants {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
}

export interface DockContextValue {
  view: DockView;
  selectionSize: number;
  filteredCount: number;
  inTrash: boolean;
  allSelected: boolean;
  isTabActive: (tab: DockTab) => boolean;
  isCard: boolean;
  openAsk: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  openNew: () => void;
  closeNew: () => void;
  openViewMenu: (section: ViewMenuSection) => void;
  closeViewMenu: () => void;
  destructive: () => void;
  confirmDeleteForever: () => void;
  swap: SwapVariants;
  swapTransition: Transition;
  /** Spring for a card view's nested `layout` scale-correction, matched to the pill so the box morph and its content settle together. */
  sizeTransition: Transition;
  /** For size changes within one view (nav unfold), matched to the pill's quick within-view spring. */
  quickTransition: Transition;
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
    throw new Error("useDock must be used within a Tray.Library");
  }
  return ctx;
}

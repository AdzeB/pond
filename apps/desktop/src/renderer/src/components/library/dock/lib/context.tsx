import type { TargetAndTransition, Transition } from "motion/react";
import { createContext, type ReactNode, type RefObject, use } from "react";
import type { DockTab } from "./nav-tabs";
import type { DockView, ViewMenuSection } from "./types";

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
  openSearch: () => void;
  closeSearch: () => void;
  openViewMenu: (section: ViewMenuSection) => void;
  closeViewMenu: () => void;
  destructive: () => void;
  confirmDeleteForever: () => void;
  swap: SwapVariants;
  swapTransition: Transition;
  sizeTransition: Transition;
  quickTransition: Transition;
  pillRef: RefObject<HTMLDivElement | null>;
  dockRef: RefObject<HTMLDivElement | null>;
  popoverOpen: boolean;
  setPopoverOpen: (open: boolean) => void;
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

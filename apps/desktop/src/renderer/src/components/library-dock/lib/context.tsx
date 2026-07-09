import type { TargetAndTransition, Transition } from "motion/react";
import { createContext, type ReactNode, type RefObject, use } from "react";
import type { DockTab } from "./nav-tabs";
import type { DockView } from "./types";

// Reduced-motion-aware enter/exit used by every content module so they all
// cross-fade in lockstep with the pill's width morph. `TargetAndTransition`
// allows string values (e.g. `filter: "blur(6px)"`) and a per-variant
// `transition` (e.g. delaying the incoming opacity).
interface SwapVariants {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
}

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
  openSearch: () => void;
  closeSearch: () => void;
  openNew: () => void;
  closeNew: () => void;
  openOptions: () => void;
  closeOptions: () => void;
  openLibrary: () => void;
  closeLibrary: () => void;
  openSources: () => void;
  closeSources: () => void;
  clearResults: () => void;
  destructive: () => void;
  runSelectionTask: () => void;
  openTagMenu: () => void;
  openOverflowMenu: () => void;
  // meta
  isPreview: boolean;
  swap: SwapVariants;
  swapTransition: Transition;
  // Spring for a card view's nested `layout` scale-correction, matched to the
  // pill so the box morph and its content settle together.
  sizeTransition: Transition;
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

import { useRouterState } from "@tanstack/react-router";
import { BorderBeam } from "border-beam";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AskContent } from "@/components/library-dock-ask-content";
import { NavContent } from "@/components/library-dock-nav-content";
import { SearchContent } from "@/components/library-dock-search-content";
import { SelectionContent } from "@/components/library-dock-selection-content";
import { StatusContent } from "@/components/library-dock-status-content";
import { NewSaveDialog } from "@/components/new-save-dialog";
import { deleteSelectionForever, isAllSelected } from "@/lib/save/selection";
import { gentleSpring } from "@/lib/ui/motion";
import { formatNumber } from "@/lib/util/format";
import { clearAsk, useAskResult } from "@/stores/ask-store";
import {
  useViewFilteredCount,
  useViewMode,
} from "@/stores/library-view-context";
import { newSave, useNewSaveOpen } from "@/stores/new-save";
import { selection, useSelectionSize } from "@/stores/selection";
import { useDockActions } from "./lib/actions";
import {
  type DockContextValue,
  DockProvider,
  type SwapVariants,
} from "./lib/context";
import { type DockTab, NAV_TABS } from "./lib/nav-tabs";
import type { DockPreview, DockView } from "./lib/types";
import styles from "./styles.module.css";

export const Dock = Object.assign(Root, {
  Root,
});

export type { DockTab } from "./lib/nav-tabs";
export type { DockPreview, DockView } from "./lib/types";

interface RootProps {
  preview?: DockPreview;
}

type DockMode = "nav" | "compose" | "search";

// The single self-driving dock container. Owns all dock state, resolves
// preview-vs-live values, and swaps exactly one content module through its
// internal `AnimatePresence` so the morph + cross-fade stays centralized.
export function Root({ preview }: RootProps) {
  const selectionSize = useSelectionSize();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduceMotion = useReducedMotion();
  const ask = useAskResult();
  const viewMode = useViewMode();
  const filteredCount = useViewFilteredCount();
  const [mode, setMode] = useState<DockMode>("nav");
  const newOpen = useNewSaveOpen();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const inTrash = viewMode === "trash";

  // Popovers launched from the dock (New, View options) anchor to the whole
  // pill rather than their individual icon buttons, so they sit above the dock
  // and inherit its width.
  const pillRef = useRef<HTMLDivElement | null>(null);

  const openAsk = useCallback(() => setMode("compose"), []);
  const closeAsk = useCallback(() => setMode("nav"), []);
  const openSearch = useCallback(() => setMode("search"), []);
  const closeSearch = useCallback(() => setMode("nav"), []);
  const clearResults = useCallback(() => {
    clearAsk();
    setMode("nav");
  }, []);

  const { destructive, runSelectionTask, openTagMenu, openOverflowMenu } =
    useDockActions(setConfirmDelete);

  // Precedence: selection > active composer > search composer > live agent
  // result > nav. Composing wins over an active result so the user can ask
  // again on top of results.
  const liveView: DockView =
    selectionSize > 0
      ? "selection"
      : mode === "compose"
        ? "ask"
        : mode === "search"
          ? "search"
          : ask.active
            ? "status"
            : "nav";
  const view = preview?.view ?? liveView;

  // Effective display values: the playground feeds these directly so the pill
  // can show counts and sub-states (trash, select-all) it isn't really in.
  const effSelectionSize = preview?.selectionSize ?? selectionSize;
  const effFilteredCount = preview
    ? (preview.filteredCount ?? 0)
    : filteredCount;
  const effInTrash = preview ? (preview.inTrash ?? false) : inTrash;
  const effAllSelected = preview
    ? (preview.allSelected ?? false)
    : isAllSelected();

  const isTabActive = useCallback(
    (tab: DockTab): boolean => {
      if (preview) return preview.activeTab === tab;
      if (tab === "settings") return pathname.startsWith("/settings");
      const navTab = NAV_TABS.find((t) => t.id === tab);
      return navTab ? navTab.match(pathname) : false;
    },
    [preview, pathname],
  );

  const isCard = view === "ask" || view === "search";
  // Animate the pill border while the agent is searching (status view). The beam
  // is an absolute, click-through overlay so it never clips the pill's shadow.
  // Its hue-rotate/blur filter animation is GPU-heavy, so pause it whenever the
  // window is hidden (minimized / occluded) — nobody can see it anyway.
  const [docVisible, setDocVisible] = useState(
    () => typeof document === "undefined" || !document.hidden,
  );
  useEffect(() => {
    const onVisibility = () => setDocVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  const thinking = ask.status === "thinking" && docVisible;

  // Inner content cross-fades while the pill springs to its new width.
  const swap: SwapVariants = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
      };

  const context = useMemo<DockContextValue>(
    () => ({
      view,
      selectionSize: effSelectionSize,
      filteredCount: effFilteredCount,
      inTrash: effInTrash,
      allSelected: effAllSelected,
      isTabActive,
      thinking,
      isCard,
      openAsk,
      closeAsk,
      openSearch,
      closeSearch,
      clearResults,
      destructive,
      runSelectionTask,
      openTagMenu,
      openOverflowMenu,
      isPreview: preview != null,
      swap,
      pillRef,
    }),
    [
      view,
      effSelectionSize,
      effFilteredCount,
      effInTrash,
      effAllSelected,
      isTabActive,
      thinking,
      isCard,
      openAsk,
      closeAsk,
      openSearch,
      closeSearch,
      clearResults,
      destructive,
      runSelectionTask,
      openTagMenu,
      openOverflowMenu,
      preview,
      swap,
    ],
  );

  // Hidden on the component library route, which renders its own surfaces
  // inline rather than alongside the pinned dock.
  if (!preview && pathname === "/components") {
    return null;
  }

  const content =
    view === "selection" ? (
      <SelectionContent key="selection" />
    ) : view === "ask" ? (
      <AskContent key="ask" />
    ) : view === "search" ? (
      <SearchContent key="search" />
    ) : view === "status" ? (
      <StatusContent key="status" />
    ) : (
      <NavContent key="nav" />
    );

  const body = (
    <DockProvider value={context}>
      <motion.div
        ref={pillRef}
        className={styles.pill}
        layout
        animate={{
          padding: isCard ? 0 : 4,
        }}
        transition={gentleSpring}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {content}
        </AnimatePresence>

        <BorderBeam
          aria-hidden
          size="md"
          colorVariant="ocean"
          theme="auto"
          borderRadius={9999}
          active={thinking}
          className={styles.beam}
          style={{ position: "absolute", inset: 0 }}
        >
          <span className={styles.beamSurface} />
        </BorderBeam>
      </motion.div>

      <NewSaveDialog
        open={newOpen}
        onOpenChange={newSave.set}
        anchor={() => pillRef.current}
        align="end"
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${formatNumber(selectionSize)} ${selectionSize === 1 ? "item" : "items"} forever?`}
        description="This permanently removes the selected items and their files. This can't be undone."
        confirmLabel="Delete Forever"
        onConfirm={() => {
          void deleteSelectionForever(selection.snapshot());
          setConfirmDelete(false);
        }}
      />
    </DockProvider>
  );

  if (preview) return body;

  return <div className={styles.dock}>{body}</div>;
}

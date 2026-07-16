import { Tray, TrayCard } from "@pond/ui";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AskComposer } from "@/components/ask-bar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NavContent } from "@/components/library-dock-nav-content";
import { NewContent } from "@/components/library-dock-new-content";
import { OptionsContent } from "@/components/library-dock-options-content";
import { SelectionContent } from "@/components/library-dock-selection-content";
import { SavingPill } from "@/components/library-saving-pill";
import { SearchComposer } from "@/components/search-bar";
import { deleteSelectionForever, isAllSelected } from "@/lib/save/selection";
import { buildDockMotion, useMotionScaleFactor } from "@/lib/ui/motion";
import { formatNumber } from "@/lib/util/format";
import { clearAsk, useAskResult } from "@/stores/ask-store";
import { dockMode, useDockMode } from "@/stores/dock-mode";
import {
  useViewFilteredCount,
  useViewMode,
} from "@/stores/library-view-context";
import { selection, useSelectionSize } from "@/stores/selection";
import { useDockActions } from "./lib/actions";
import { type DockContextValue, DockProvider } from "./lib/context";
import { type DockTab, NAV_TABS } from "./lib/nav-tabs";
import {
  type DockPreview,
  type DockView,
  isViewMenu,
  type ViewMenuSection,
} from "./lib/types";
import styles from "./styles.module.css";

interface LibraryTrayProps {
  preview?: DockPreview;
}

/** Module-level store calls stay referentially stable without useCallback. */
const openAsk = () => dockMode.open("ask");
const openSearch = () => dockMode.open("search");
const openNew = () => dockMode.open("new");
const openViewMenu = (section: ViewMenuSection) => dockMode.open(section);
const closeToNav = () => dockMode.close();
const clearResults = () => {
  clearAsk();
  dockMode.close();
};

export function LibraryTray({ preview }: LibraryTrayProps) {
  const selectionSize = useSelectionSize();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduceMotion = useReducedMotion();
  const ask = useAskResult();
  const viewMode = useViewMode();
  const filteredCount = useViewFilteredCount();
  const mode = useDockMode();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const inTrash = viewMode === "trash";

  const pillRef = useRef<HTMLDivElement | null>(null);
  /** The pill's real width/height animates to the measured viewport size with a spring, so a mid-flight view change retargets instead of restarting. */
  const [bounds, setBounds] = useState<{
    width: number;
    height: number;
  } | null>(null);

  /** The first measurement must apply instantly because the pill starts at 0x0; only later size changes animate. */
  const hasMeasured = useRef(false);
  const isFirstMeasure = bounds !== null && !hasMeasured.current;
  useEffect(() => {
    if (bounds) hasMeasured.current = true;
  }, [bounds]);

  /** Measure via a callback ref: the viewport DOM is torn down and recreated on some routes while the component stays alive, and a mount-only effect would keep watching the detached node. */
  const viewportObserver = useRef<ResizeObserver | null>(null);
  const viewportRef = useCallback((el: HTMLDivElement | null) => {
    viewportObserver.current?.disconnect();
    viewportObserver.current = null;
    if (!el) return;
    const measure = () =>
      setBounds({ width: el.offsetWidth, height: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    viewportObserver.current = ro;
  }, []);

  const { destructive, runSelectionTask, openTagMenu, openOverflowMenu } =
    useDockActions(setConfirmDelete);

  /** Priority: an active selection commandeers the pill, then the opened surface, then the resting nav. */
  const liveView: DockView =
    selectionSize > 0 ? "selection" : mode !== "nav" ? mode : "nav";
  const view = preview?.view ?? liveView;
  const isMenuView = view === "new" || isViewMenu(view);

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
      const navTab = NAV_TABS.find((t) => t.id === tab);
      return navTab ? navTab.match(pathname) : false;
    },
    [preview, pathname],
  );

  const isCard =
    view === "ask" || view === "search" || view === "new" || isViewMenu(view);

  const [docVisible, setDocVisible] = useState(
    () => typeof document === "undefined" || !document.hidden,
  );
  useEffect(() => {
    const onVisibility = () => setDocVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  const thinking = ask.status === "thinking" && docVisible;

  useEffect(() => {
    if (preview || !isMenuView) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeToNav();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview, isMenuView]);

  const timeScale = useMotionScaleFactor();
  const { pillTransition, swapTransition, swap } = buildDockMotion(
    reduceMotion ?? false,
    timeScale,
  );

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
      openSearch,
      closeSearch: closeToNav,
      openNew,
      closeNew: closeToNav,
      openViewMenu,
      closeViewMenu: closeToNav,
      destructive,
      runSelectionTask,
      openTagMenu,
      openOverflowMenu,
      isPreview: preview != null,
      swap,
      swapTransition,
      sizeTransition: pillTransition,
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
      destructive,
      runSelectionTask,
      openTagMenu,
      openOverflowMenu,
      preview,
      swap,
      swapTransition,
      pillTransition,
    ],
  );

  if (!preview && pathname === "/components") {
    return null;
  }

  const body = (
    <TrayCard.Provider onDismiss={closeToNav}>
      <DockProvider value={context}>
        {!preview && isMenuView ? (
          <button
            type="button"
            aria-label="Close"
            className={styles.backdrop}
            onClick={closeToNav}
          />
        ) : null}
        <Tray.Pill
          className={styles.pill}
          render={
            <motion.div
              ref={pillRef}
              initial={false}
              animate={
                bounds ? { width: bounds.width, height: bounds.height } : {}
              }
              transition={isFirstMeasure ? { duration: 0 } : pillTransition}
            />
          }
        >
          <div
            ref={viewportRef}
            className={styles.viewport}
            data-card={isCard || undefined}
          >
            <AnimatePresence initial={false}>
              {view === "selection" ? (
                <SelectionContent key="selection" />
              ) : view === "ask" ? (
                <motion.div
                  key="ask"
                  className={styles["ask-row"]}
                  {...swap}
                  transition={swapTransition}
                >
                  {/** Leaving the ask card ends the conversation: results clear so the grid never stays silently filtered. */}
                  <TrayCard.Provider onDismiss={clearResults}>
                    <AskComposer
                      autoFocus={!preview}
                      onCollapse={clearResults}
                      onClear={clearAsk}
                    />
                  </TrayCard.Provider>
                </motion.div>
              ) : view === "search" ? (
                <motion.div
                  key="search"
                  className={styles["search-row"]}
                  {...swap}
                  transition={swapTransition}
                >
                  <SearchComposer
                    autoFocus={!preview}
                    onCollapse={closeToNav}
                  />
                </motion.div>
              ) : view === "new" ? (
                <motion.div key="new" {...swap} transition={swapTransition}>
                  <NewContent />
                </motion.div>
              ) : isViewMenu(view) ? (
                <motion.div key={view} {...swap} transition={swapTransition}>
                  <OptionsContent section={view} />
                </motion.div>
              ) : (
                <NavContent key="nav" />
              )}
            </AnimatePresence>
          </div>
        </Tray.Pill>

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
    </TrayCard.Provider>
  );

  if (preview) return body;

  return (
    <div className={styles.dock}>
      <SavingPill />
      {body}
    </div>
  );
}

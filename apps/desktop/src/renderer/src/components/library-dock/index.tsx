import { Tray, TrayCard } from "@pond/ui";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AskComposer } from "@/components/ask-bar";
import { NavContent } from "@/components/library-dock-nav-content";
import { NewContent } from "@/components/library-dock-new-content";
import { OptionsContent } from "@/components/library-dock-options-content";
import { SelectionContent } from "@/components/library-dock-selection-content";
import { SavingPill } from "@/components/library-saving-pill";
import { SearchComposer } from "@/components/search-bar";
import { isAllSelected } from "@/lib/save/selection";
import { buildDockMotion } from "@/lib/ui/motion";
import { clearAsk } from "@/stores/ask-store";
import { dockMode, useDockMode } from "@/stores/dock-mode";
import {
  useViewFilteredCount,
  useViewMode,
} from "@/stores/library-view-context";
import { useSelectionSize } from "@/stores/selection";
import { useDockActions } from "./lib/actions";
import { type DockContextValue, DockProvider } from "./lib/context";
import { type DockTab, NAV_TABS } from "./lib/nav-tabs";
import {
  type DockView,
  isViewMenu,
  SELECTION_CARD_MODES,
  type ViewMenuSection,
} from "./lib/types";
import styles from "./styles.module.css";

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

export function LibraryTray() {
  const selectionSize = useSelectionSize();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduceMotion = useReducedMotion();
  const viewMode = useViewMode();
  const filteredCount = useViewFilteredCount();
  const mode = useDockMode();

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

  const { destructive, confirmDeleteForever } = useDockActions();

  /** Priority: an active selection commandeers the pill, then the opened surface, then the resting nav. Cards opened from the selection (confirm, run, tag, copy, export) outrank it so drilling in doesn't bounce back. */
  const view: DockView = (SELECTION_CARD_MODES as readonly string[]).includes(
    mode,
  )
    ? (mode as DockView)
    : selectionSize > 0
      ? "selection"
      : mode !== "nav"
        ? mode
        : "nav";
  const isMenuView = view === "new" || isViewMenu(view);

  const allSelected = isAllSelected();

  const isTabActive = useCallback(
    (tab: DockTab): boolean => {
      const navTab = NAV_TABS.find((t) => t.id === tab);
      return navTab ? navTab.match(pathname) : false;
    },
    [pathname],
  );

  const isCard =
    view === "ask" || view === "search" || view === "new" || isViewMenu(view);

  useEffect(() => {
    if (!isMenuView) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeToNav();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isMenuView]);

  const { pillTransition, quickTransition, swapTransition, swap } =
    buildDockMotion(reduceMotion ?? false);

  /** View swaps get the deliberate morph (timed by when the view last changed); in the resting nav view the pill tracks the content per frame, so the unfold's own spring is the only timing; other within-view growth rides the quick spring. */
  const lastView = useRef(view);
  const viewChangedAt = useRef(0);
  if (lastView.current !== view) {
    lastView.current = view;
    viewChangedAt.current = performance.now();
  }
  const inViewMorph = performance.now() - viewChangedAt.current < 450;
  const boundsTransition = isFirstMeasure
    ? { duration: 0 }
    : inViewMorph
      ? pillTransition
      : view === "nav"
        ? { duration: 0 }
        : quickTransition;

  const context = useMemo<DockContextValue>(
    () => ({
      view,
      selectionSize,
      filteredCount,
      inTrash,
      allSelected,
      isTabActive,
      isCard,
      openAsk,
      openSearch,
      closeSearch: closeToNav,
      openNew,
      closeNew: closeToNav,
      openViewMenu,
      closeViewMenu: closeToNav,
      destructive,
      confirmDeleteForever,
      swap,
      swapTransition,
      sizeTransition: pillTransition,
      quickTransition,
      pillRef,
    }),
    [
      view,
      selectionSize,
      filteredCount,
      inTrash,
      allSelected,
      isTabActive,
      isCard,
      destructive,
      confirmDeleteForever,
      swap,
      swapTransition,
      pillTransition,
      quickTransition,
    ],
  );

  return (
    <div className={styles.dock}>
      <SavingPill />
      <TrayCard.Provider onDismiss={closeToNav}>
        <DockProvider value={context}>
          {isMenuView ? (
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
                transition={boundsTransition}
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
                        autoFocus
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
                    <SearchComposer autoFocus onCollapse={closeToNav} />
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
        </DockProvider>
      </TrayCard.Provider>
    </div>
  );
}

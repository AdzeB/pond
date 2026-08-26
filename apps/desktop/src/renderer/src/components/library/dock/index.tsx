import { Tray, TrayCard } from "@pond/ui";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActiveFilter } from "@/components/library/dock/active-filter";
import { NavContent } from "@/components/library/dock/nav";
import { OptionsContent } from "@/components/library/dock/options";
import { SelectionContent } from "@/components/library/dock/selection";
import { SearchComposer } from "@/components/search/bar";
import { isAllSelected } from "@/lib/save/selection";
import { buildDockMotion } from "@/lib/ui/motion";
import { openLibrarySearch } from "@/lib/ui/open-search";
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

const openViewMenu = (section: ViewMenuSection) => dockMode.open(section);
const closeToNav = () => dockMode.close();

export function LibraryTray() {
  const selectionSize = useSelectionSize();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduceMotion = useReducedMotion();
  const viewMode = useViewMode();
  const filteredCount = useViewFilteredCount();
  const mode = useDockMode();

  const inTrash = viewMode === "trash";

  const dockRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);
  const popoverOpenRef = useRef(false);
  const [popoverOpen, setPopoverOpenState] = useState(false);
  const [bounds, setBounds] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const hasMeasured = useRef(false);
  const isFirstMeasure = bounds !== null && !hasMeasured.current;
  useEffect(() => {
    if (bounds) hasMeasured.current = true;
  }, [bounds]);

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

  const view: DockView = (SELECTION_CARD_MODES as readonly string[]).includes(
    mode,
  )
    ? (mode as DockView)
    : mode !== "nav"
      ? mode
      : selectionSize > 0
        ? "selection"
        : "nav";
  const isMenuView = isViewMenu(view);

  const allSelected = isAllSelected();

  const isTabActive = useCallback(
    (tab: DockTab): boolean => {
      const navTab = NAV_TABS.find((t) => t.id === tab);
      return navTab ? navTab.match(pathname) : false;
    },
    [pathname],
  );

  const isCard = view === "search" || isViewMenu(view);

  const setPopoverOpen = useCallback((open: boolean) => {
    popoverOpenRef.current = open;
    setPopoverOpenState(open);
  }, []);

  const dismissDock = useCallback(() => {
    if (popoverOpenRef.current) return;
    closeToNav();
  }, []);

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
      openSearch: openLibrarySearch,
      closeSearch: dismissDock,
      openViewMenu,
      closeViewMenu: closeToNav,
      destructive,
      confirmDeleteForever,
      swap,
      swapTransition,
      sizeTransition: pillTransition,
      quickTransition,
      pillRef,
      dockRef,
      popoverOpen,
      setPopoverOpen,
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
      popoverOpen,
      setPopoverOpen,
      dismissDock,
    ],
  );

  return (
    <div className={styles.dock}>
      <TrayCard.Provider onDismiss={closeToNav}>
        <DockProvider value={context}>
          {isCard ? (
            <button
              type="button"
              aria-label="Close"
              className={styles.backdrop}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                dismissDock();
              }}
            />
          ) : null}
          <div className={styles.shell}>
            <div ref={dockRef} className={styles.hit}>
              <ActiveFilter />
              <Tray.Pill
                className={styles.pill}
                render={
                  <motion.div
                    ref={pillRef}
                    initial={false}
                    animate={
                      bounds
                        ? { width: bounds.width, height: bounds.height }
                        : {}
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
                    ) : view === "search" ? (
                      <motion.div
                        key="search"
                        className={styles["search-row"]}
                        {...swap}
                        transition={swapTransition}
                      >
                        <SearchComposer autoFocus onCollapse={closeToNav} />
                      </motion.div>
                    ) : isViewMenu(view) ? (
                      <motion.div
                        key={view}
                        {...swap}
                        transition={swapTransition}
                      >
                        <OptionsContent section={view} />
                      </motion.div>
                    ) : (
                      <NavContent key="nav" />
                    )}
                  </AnimatePresence>
                </div>
              </Tray.Pill>
            </div>
          </div>
        </DockProvider>
      </TrayCard.Provider>
    </div>
  );
}

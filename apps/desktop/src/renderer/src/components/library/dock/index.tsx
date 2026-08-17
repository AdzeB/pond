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

/** Module-level store calls stay referentially stable without useCallback. */
const openViewMenu = (section: ViewMenuSection) => dockMode.open(section);
const closeToNav = () => dockMode.close();

const COLLAPSED_BAR = { width: 64, height: 6 };
const COLLAPSE_MS = 240;

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
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [navOpen, setNavOpen] = useState(false);
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

  /** Priority: selection-card modes, then any explicitly opened surface (search/menus), then selection commandeering the resting nav. */
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
  const collapsed = view === "nav" && !navOpen;

  const cancelLeave = useCallback(() => {
    if (!leaveTimer.current) return;
    clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
  }, []);

  const expandNav = useCallback(() => {
    cancelLeave();
    setNavOpen(true);
  }, [cancelLeave]);

  const collapseNav = useCallback(() => {
    cancelLeave();
    leaveTimer.current = setTimeout(() => {
      setNavOpen(false);
      leaveTimer.current = null;
    }, COLLAPSE_MS);
  }, [cancelLeave]);

  useEffect(
    () => () => {
      if (!leaveTimer.current) return;
      clearTimeout(leaveTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (view !== "nav") {
      cancelLeave();
      setNavOpen(false);
    }
  }, [view, cancelLeave]);

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

  /** View swaps get the deliberate morph; collapsing to the handle and other within-view growth ride the quick spring. */
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
      closeSearch: closeToNav,
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
    <div className={styles.dock} data-collapsed={collapsed || undefined}>
      <TrayCard.Provider onDismiss={closeToNav}>
        <DockProvider value={context}>
          {isCard ? (
            <button
              type="button"
              aria-label="Close"
              className={styles.backdrop}
              onClick={closeToNav}
            />
          ) : null}
          <div
            ref={dockRef}
            className={styles.shell}
            data-collapsed={collapsed || undefined}
            onPointerEnter={expandNav}
            onPointerLeave={collapseNav}
            onFocusCapture={expandNav}
            onBlurCapture={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                )
              ) {
                collapseNav();
              }
            }}
          >
            <ActiveFilter />
            <Tray.Pill
              className={styles.pill}
              render={
                <motion.div
                  ref={pillRef}
                  initial={false}
                  animate={
                    collapsed
                      ? COLLAPSED_BAR
                      : bounds
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
                inert={collapsed}
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
        </DockProvider>
      </TrayCard.Provider>
    </div>
  );
}

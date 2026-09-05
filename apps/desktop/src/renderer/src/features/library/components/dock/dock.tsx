import { Tray, TrayCard } from "@pond/ui";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  downloadsSelection,
  useDownloadsSelectionSize,
} from "@/features/downloads/state/downloads-selection";
import { ConfirmSection } from "@/features/library/components/dock/confirm/confirm";
import { SelectionCopySection } from "@/features/library/components/dock/selection/copy";
import { DownloadsSelectionContent } from "@/features/library/components/dock/selection/downloads";
import { SelectionExportSection } from "@/features/library/components/dock/selection/export";
import { SelectionRunSection } from "@/features/library/components/dock/selection/run";
import { SourcesSelectionContent } from "@/features/library/components/dock/selection/sources";
import { SelectionTagSection } from "@/features/library/components/dock/selection/tag";
import { dockMode, useDockMode } from "@/features/library/state/dock-mode";
import {
  useViewFilteredCount,
  useViewMode,
} from "@/features/library/state/library-view-context";
import {
  selection,
  useSelectionSize,
} from "@/features/library/state/selection";
import { isAllSelected } from "@/features/saves/lib/selection";
import {
  sourcesSelection,
  useSourcesSelectionSize,
} from "@/features/sources/state/sources-selection";
import { buildDockMotion } from "@/shared/lib/motion";
import styles from "./dock.module.css";
import { useDockActions } from "./lib/actions";
import { type DockContextValue, DockProvider } from "./lib/context";
import { type DockTab, NAV_TABS } from "./lib/nav-tabs";
import {
  type DockView,
  isViewMenu,
  SELECTION_CARD_MODES,
  type ViewMenuSection,
} from "./lib/types";

const CARD_SECTIONS = {
  confirm: ConfirmSection,
  "selection-run": SelectionRunSection,
  "selection-tag": SelectionTagSection,
  "selection-copy": SelectionCopySection,
  "selection-export": SelectionExportSection,
} satisfies Record<ViewMenuSection, () => JSX.Element | null>;

function CardContent({ section }: { section: ViewMenuSection }) {
  const Section = CARD_SECTIONS[section];
  return (
    <TrayCard.Root className={styles.card} data-section={section}>
      <Section />
    </TrayCard.Root>
  );
}

const openViewMenu = (section: ViewMenuSection) => dockMode.open(section);
const closeToNav = () => dockMode.close();

export function LibraryTray() {
  const librarySelectionSize = useSelectionSize();
  const downloadsSelectionSize = useDownloadsSelectionSize();
  const sourcesSelectionSize = useSourcesSelectionSize();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduceMotion = useReducedMotion();
  const viewMode = useViewMode();
  const filteredCount = useViewFilteredCount();
  const mode = useDockMode();

  const inTrash = viewMode === "trash";
  const isDownloads = pathname.startsWith("/downloads");
  const isSources = pathname.startsWith("/sources");
  const selectionSize = isDownloads
    ? downloadsSelectionSize
    : isSources
      ? sourcesSelectionSize
      : librarySelectionSize;

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

  const view: DockView = SELECTION_CARD_MODES.has(mode)
    ? mode
    : mode !== "nav"
      ? mode
      : "selection";
  const isMenuView = isViewMenu(view);
  const showSelectionBar = (isDownloads || isSources) && selectionSize > 0;
  const idle = mode === "nav" && !showSelectionBar;

  useEffect(() => {
    if (isDownloads) {
      selection.clear();
      sourcesSelection.clear();
      return () => downloadsSelection.clear();
    }
    if (isSources) {
      selection.clear();
      downloadsSelection.clear();
      return () => sourcesSelection.clear();
    }
  }, [isDownloads, isSources]);

  const allSelected = isAllSelected();

  const isTabActive = useCallback(
    (tab: DockTab): boolean => {
      const navTab = NAV_TABS.find((t) => t.id === tab);
      return navTab ? navTab.match(pathname) : false;
    },
    [pathname],
  );

  const isCard = isViewMenu(view);

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

  const morphKey = `${view}:${inTrash}`;
  const lastMorphKey = useRef(morphKey);
  const viewChangedAt = useRef(0);
  if (lastMorphKey.current !== morphKey) {
    lastMorphKey.current = morphKey;
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
      openSearch: () => {},
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

  if (idle) return null;

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
                <div ref={viewportRef} className={styles.viewport}>
                  <AnimatePresence initial={false}>
                    {view === "selection" ? (
                      isDownloads ? (
                        <DownloadsSelectionContent key="downloads-selection" />
                      ) : isSources ? (
                        <SourcesSelectionContent key="sources-selection" />
                      ) : null
                    ) : isViewMenu(view) ? (
                      <motion.div
                        key={view}
                        {...swap}
                        transition={swapTransition}
                      >
                        <CardContent section={view} />
                      </motion.div>
                    ) : null}
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

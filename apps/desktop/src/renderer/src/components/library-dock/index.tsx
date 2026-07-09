import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AskComposer, AskStatusPill } from "@/components/ask-bar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LibraryContent } from "@/components/library-dock-library-content";
import { NavContent } from "@/components/library-dock-nav-content";
import { NewContent } from "@/components/library-dock-new-content";
import { OptionsContent } from "@/components/library-dock-options-content";
import { SelectionContent } from "@/components/library-dock-selection-content";
import { SourcesContent } from "@/components/library-dock-sources-content";
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
import type { DockPreview, DockView } from "./lib/types";
import styles from "./styles.module.css";

export const Dock = Object.assign(Root, {
  Root,
});
interface RootProps {
  preview?: DockPreview;
}

// Dock-mode actions are plain store calls, so they're defined once at module
// level and stay referentially stable without useCallback.
const openAsk = () => dockMode.open("ask");
const openSearch = () => dockMode.open("search");
const openNew = () => dockMode.open("new");
const openOptions = () => dockMode.open("options");
const openLibrary = () => dockMode.open("library");
const openSources = () => dockMode.open("sources");
const closeToNav = () => dockMode.close();
const clearResults = () => {
  clearAsk();
  dockMode.close();
};

function Root({ preview }: RootProps) {
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
  // Family (connectkit) morph: the viewport sizes to the active view's content;
  // we animate the pill's real width/height to that measured size with a
  // motion spring (pillTransition), so a mid-flight view change retargets
  // smoothly instead of restarting. Content is never scaled/distorted.
  const [bounds, setBounds] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // The very first measurement must apply instantly (the pill starts at 0x0
  // before the viewport is measured); only later size changes animate.
  const hasMeasured = useRef(false);
  const isFirstMeasure = bounds !== null && !hasMeasured.current;
  useEffect(() => {
    if (bounds) hasMeasured.current = true;
  }, [bounds]);

  // Measure via a callback ref (not a mount effect): the dock renders null on
  // some routes (e.g. /settings) without unmounting, so the viewport DOM is
  // torn down and recreated while the component stays alive. A ref callback
  // re-measures and re-observes each new element; a mount-only effect would
  // keep watching the detached node and leave `bounds` stuck at 0x0.
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

  // Remember the pill's width while resting in the nav view so card views can
  // match the dock's footprint (the pill then morphs only vertically). Exposed
  // to the cards as --dock-card-width on the viewport.
  const [navWidth, setNavWidth] = useState<number | null>(null);

  const { destructive, runSelectionTask, openTagMenu, openOverflowMenu } =
    useDockActions(setConfirmDelete);

  // Priority: an active selection commandeers the pill, then whichever surface
  // the user opened, then the ask status pill, then the resting nav.
  const liveView: DockView =
    selectionSize > 0
      ? "selection"
      : mode !== "nav"
        ? mode
        : ask.active
          ? "status"
          : "nav";
  const view = preview?.view ?? liveView;
  const isMenuView =
    view === "new" ||
    view === "options" ||
    view === "library" ||
    view === "sources";

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

  const isCard =
    view === "ask" ||
    view === "search" ||
    view === "new" ||
    view === "options" ||
    view === "library" ||
    view === "sources";

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

  useLayoutEffect(() => {
    if (view === "nav" && bounds) setNavWidth(bounds.width);
  }, [view, bounds]);

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
      closeAsk: closeToNav,
      openSearch,
      closeSearch: closeToNav,
      openNew,
      closeNew: closeToNav,
      openOptions,
      closeOptions: closeToNav,
      openLibrary,
      closeLibrary: closeToNav,
      openSources,
      closeSources: closeToNav,
      clearResults,
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

  if (
    !preview &&
    (pathname === "/components" || pathname.startsWith("/settings"))
  ) {
    return null;
  }

  const body = (
    <DockProvider value={context}>
      {!preview && isMenuView ? (
        <button
          type="button"
          aria-label="Close"
          className={styles.backdrop}
          onClick={closeToNav}
        />
      ) : null}
      <motion.div
        ref={pillRef}
        className={styles.pill}
        initial={false}
        // Must always be an object: motion ignores an `animate` prop that
        // mounts as undefined and only later becomes a target, which would
        // leave the pill collapsed at 0x0 (and the dock invisible).
        animate={bounds ? { width: bounds.width, height: bounds.height } : {}}
        transition={isFirstMeasure ? { duration: 0 } : pillTransition}
      >
        <div
          ref={viewportRef}
          className={styles.viewport}
          data-card={isCard || undefined}
          style={
            navWidth != null
              ? ({ "--dock-card-width": `${navWidth}px` } as CSSProperties)
              : undefined
          }
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
                <AskComposer
                  autoFocus
                  onCollapse={closeToNav}
                  onClear={clearAsk}
                />
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
            ) : view === "status" ? (
              <motion.div
                key="status"
                className={styles["ask-row"]}
                {...swap}
                transition={swapTransition}
              >
                <AskStatusPill onReopen={openAsk} onClear={clearResults} />
              </motion.div>
            ) : view === "new" ? (
              <motion.div key="new" {...swap} transition={swapTransition}>
                <NewContent />
              </motion.div>
            ) : view === "options" ? (
              <motion.div key="options" {...swap} transition={swapTransition}>
                <OptionsContent />
              </motion.div>
            ) : view === "library" ? (
              <motion.div key="library" {...swap} transition={swapTransition}>
                <LibraryContent />
              </motion.div>
            ) : view === "sources" ? (
              <motion.div key="sources" {...swap} transition={swapTransition}>
                <SourcesContent />
              </motion.div>
            ) : (
              <motion.div key="nav" {...swap} transition={swapTransition}>
                <NavContent />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

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

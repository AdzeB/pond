import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
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
import { SearchComposer } from "@/components/search-bar";
import { deleteSelectionForever, isAllSelected } from "@/lib/save/selection";
import { buildDockMotion } from "@/lib/ui/motion";
import { formatNumber } from "@/lib/util/format";
import { clearAsk, useAskResult } from "@/stores/ask-store";
import {
  useViewFilteredCount,
  useViewMode,
} from "@/stores/library-view-context";
import { newSave, useNewSaveOpen } from "@/stores/new-save";
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

type DockMode = "nav" | "compose" | "search" | "options" | "library";

function Root({ preview }: RootProps) {
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

  const pillRef = useRef<HTMLDivElement | null>(null);
  // Family (connectkit) morph: the viewport sizes to the active view's content;
  // we write that measured size onto the pill, which transitions its real
  // width/height via CSS (see .pill). Content is never scaled/distorted. First
  // paint is measured before paint (useLayoutEffect) so there's no grow-in on
  // mount, and CSS only transitions on subsequent size changes.
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const openAsk = useCallback(() => setMode("compose"), []);
  const closeAsk = useCallback(() => setMode("nav"), []);
  const openSearch = useCallback(() => setMode("search"), []);
  const closeSearch = useCallback(() => setMode("nav"), []);
  const openNew = useCallback(() => newSave.open(), []);
  const closeNew = useCallback(() => newSave.set(false), []);
  const openOptions = useCallback(() => setMode("options"), []);
  const closeOptions = useCallback(() => setMode("nav"), []);
  const openLibrary = useCallback(() => setMode("library"), []);
  const closeLibrary = useCallback(() => setMode("nav"), []);
  const closeMenuView = useCallback(() => {
    newSave.set(false);
    setMode("nav");
  }, []);
  const clearResults = useCallback(() => {
    clearAsk();
    setMode("nav");
  }, []);

  const { destructive, runSelectionTask, openTagMenu, openOverflowMenu } =
    useDockActions(setConfirmDelete);

  const liveView: DockView =
    selectionSize > 0
      ? "selection"
      : newOpen
        ? "new"
        : mode === "compose"
          ? "ask"
          : mode === "search"
            ? "search"
            : mode === "options"
              ? "options"
              : mode === "library"
                ? "library"
                : ask.active
                  ? "status"
                  : "nav";
  const view = preview?.view ?? liveView;
  const isMenuView = view === "new" || view === "options" || view === "library";

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
    view === "library";

  // Measure the viewport (which sizes to the active view) and drive the pill's
  // width/height to match. Runs synchronously on every view change (so the box
  // starts morphing the same frame the content swaps, no lag) and via a
  // ResizeObserver for in-view growth (e.g. typing tokens in search).
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () =>
      setBounds({ width: el.offsetWidth, height: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (el) setBounds({ width: el.offsetWidth, height: el.offsetHeight });
  }, []);

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
        closeMenuView();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview, isMenuView, closeMenuView]);

  const { pillTransition, swapTransition, swap } = buildDockMotion(
    reduceMotion ?? false,
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
      closeAsk,
      openSearch,
      closeSearch,
      openNew,
      closeNew,
      openOptions,
      closeOptions,
      openLibrary,
      closeLibrary,
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
      openAsk,
      closeAsk,
      openSearch,
      closeSearch,
      openNew,
      closeNew,
      openOptions,
      closeOptions,
      openLibrary,
      closeLibrary,
      clearResults,
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
          onClick={closeMenuView}
        />
      ) : null}
      <div
        ref={pillRef}
        className={styles.pill}
        style={
          bounds ? { width: bounds.width, height: bounds.height } : undefined
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
                <AskComposer
                  autoFocus
                  onCollapse={closeAsk}
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
                <SearchComposer autoFocus onCollapse={closeSearch} />
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
            ) : (
              <motion.div key="nav" {...swap} transition={swapTransition}>
                <NavContent />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

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

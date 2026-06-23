import {
  IconArchiveContent2Fill18 as Library,
  IconDotsFill18 as More,
  IconArchivePlusFill18 as New,
  IconArrowRotateAnticlockwiseFill18 as Restore,
  IconNutFill18 as Settings,
  IconArrowsConvergeFill18 as Sources,
  IconTagPlusFill18 as TagAdd,
  IconTagsFill18 as Tags,
  IconTrash2ContentFill18 as Trash,
  IconRulerCursorFill18 as ViewIcon,
  IconWandSparkleFill18 as Wand,
} from "@pond/icons/fill/18";
import { Tooltip } from "@pond/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import { Link, type LinkProps, useRouterState } from "@tanstack/react-router";
import { BorderBeam } from "border-beam";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { AskComposer, AskStatusPill } from "@/components/ask-bar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ViewMenu } from "@/components/library-view-menu";
import { NewSaveDialog } from "@/components/new-save-dialog";
import { formatNumber } from "@/lib/format";
import { bouncySpring, gentleSpring, snappySpring } from "@/lib/motion";
import { type NativeMenuItem, showContextMenu } from "@/lib/native-menu";
import {
  addTagToSelection,
  clearTagsFromSelection,
  copyFilePathsForSelection,
  copyUrlsForSelection,
  deleteSelectionForever,
  exportSelectionCsv,
  exportSelectionFiles,
  failedIdsIn,
  invertSelectionInView,
  isAllSelected,
  pasteTagsToSelection,
  restoreSelection,
  retryFailedSelection,
  selectAllInView,
  trashSelection,
} from "@/lib/selection-actions";
import { selectableTasks } from "@/lib/tasks";
import { clearAsk, useAskResult } from "@/stores/ask-store";
import {
  useViewFilteredCount,
  useViewMode,
} from "@/stores/library-view-context";
import { selection, useSelectionSize } from "@/stores/selection";
import { useTagClipboard } from "@/stores/tag-clipboard";
import { useTags } from "@/stores/tags";
import { pushToast } from "@/stores/toasts";
import styles from "./styles.module.css";

interface NavTab {
  label: string;
  to: LinkProps["to"];
  params?: LinkProps["params"];
  icon: ReactNode;
  match: (pathname: string) => boolean;
}

// Primary navigation, left of the search field.
const NAV_TABS: readonly NavTab[] = [
  { label: "Library", to: "/", icon: <Library />, match: (p) => p === "/" },
  {
    label: "Sources",
    to: "/sources",
    icon: <Sources />,
    match: (p) => p === "/sources",
  },
  { label: "Tags", to: "/tags", icon: <Tags />, match: (p) => p === "/tags" },
  {
    label: "Trash",
    to: "/$mode",
    params: { mode: "trash" },
    icon: <Trash />,
    match: (p) => p === "/trash",
  },
] as const;

type DockMode = "nav" | "compose";

export function Dock() {
  const selectionSize = useSelectionSize();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduceMotion = useReducedMotion();
  const ask = useAskResult();
  const tags = useTags();
  const clipboard = useTagClipboard();
  const viewMode = useViewMode();
  const filteredCount = useViewFilteredCount();
  const [mode, setMode] = useState<DockMode>("nav");
  const [newOpen, setNewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const inTrash = viewMode === "trash";

  // Popovers launched from the dock (New, View options) anchor to the whole
  // pill rather than their individual icon buttons, so they sit above the dock
  // and inherit its width.
  const pillRef = useRef<HTMLDivElement | null>(null);

  const tooltip = Tooltip.createHandle<React.ReactNode>();

  const openAsk = useCallback(() => setMode("compose"), []);
  const closeAsk = useCallback(() => setMode("nav"), []);
  const clearResults = useCallback(() => {
    clearAsk();
    setMode("nav");
  }, []);

  const triggerAsk = useCallback((event?: KeyboardEvent) => {
    event?.preventDefault();
    setMode("compose");
  }, []);
  useHotkey("Mod+/", triggerAsk);
  useHotkey("Mod+K", triggerAsk);

  const destructive = useCallback(() => {
    if (inTrash) void restoreSelection(selection.snapshot());
    else void trashSelection(selection.snapshot());
  }, [inTrash]);

  // Task menu items, scoped to the current selection. Shared by the wand button
  // and the overflow menu's "Run task" submenu.
  const taskItems = useCallback((): NativeMenuItem[] => {
    const scope = selection.snapshot();
    return selectableTasks().map((task) => ({
      label: task.label,
      onSelect: async () => {
        try {
          const res = await task.run(scope);
          pushToast(res.message, res.ok ? "success" : "error");
        } catch {
          pushToast(`${task.label} failed.`, "error");
        }
      },
    }));
  }, []);

  // Tag menu items: each existing tag adds to every selected save, plus paste
  // and clear shortcuts. Shared by the tag button and the overflow submenu.
  const tagItems = useCallback((): NativeMenuItem[] => {
    const scope = selection.snapshot();
    const items: NativeMenuItem[] = [];
    if (tags.length === 0) {
      items.push({ label: "No tags yet", enabled: false });
    } else {
      for (const tag of tags) {
        items.push({
          label: tag.name,
          onSelect: () => void addTagToSelection(scope, tag.name),
        });
      }
    }
    items.push({ type: "separator" });
    items.push({
      label: "Paste tags",
      enabled: clipboard.length > 0,
      shortcut: ["⌘", "⇧", "V"],
      onSelect: () => void pasteTagsToSelection(scope, clipboard),
    });
    items.push({
      label: "Remove all tags",
      onSelect: () => void clearTagsFromSelection(scope),
    });
    return items;
  }, [tags, clipboard]);

  const runSelectionTask = useCallback(() => {
    const scope = selection.snapshot();
    if (scope.length === 0) return;
    void showContextMenu([
      { label: `Run on ${scope.length} selected`, enabled: false },
      { type: "separator" },
      ...taskItems(),
    ]);
  }, [taskItems]);

  const openTagMenu = useCallback(() => {
    const scope = selection.snapshot();
    if (scope.length === 0) return;
    void showContextMenu([
      { label: `Tag ${scope.length} selected`, enabled: false },
      { type: "separator" },
      ...tagItems(),
    ]);
  }, [tagItems]);

  // The long tail of bulk actions, gathered behind the overflow button so the
  // pill stays compact.
  const openOverflowMenu = useCallback(() => {
    const scope = selection.snapshot();
    if (scope.length === 0) return;
    const failedCount = failedIdsIn(scope).length;
    const items: NativeMenuItem[] = [
      {
        label: "Select all",
        enabled: filteredCount > 0 && !isAllSelected(),
        shortcut: ["⌘", "A"],
        onSelect: () => selectAllInView(),
      },
      {
        label: "Invert selection",
        enabled: filteredCount > 0,
        onSelect: () => invertSelectionInView(),
      },
      { type: "separator" },
      { label: "Run task", submenu: taskItems() },
      { label: "Add tag", submenu: tagItems() },
      {
        label: failedCount > 0 ? `Retry ${failedCount} failed` : "Retry failed",
        enabled: failedCount > 0,
        onSelect: () => void retryFailedSelection(scope),
      },
      { type: "separator" },
      {
        label: "Copy links",
        onSelect: () => void copyUrlsForSelection(scope),
      },
      {
        label: "Copy file paths",
        onSelect: () => void copyFilePathsForSelection(scope),
      },
      { type: "separator" },
      {
        label: "Export files…",
        onSelect: () => void exportSelectionFiles(scope),
      },
      {
        label: "Export to CSV…",
        onSelect: () => void exportSelectionCsv(scope),
      },
      { type: "separator" },
      ...(inTrash
        ? ([
            {
              label: "Restore",
              onSelect: () => void restoreSelection(scope),
            },
            {
              label: "Delete Forever…",
              onSelect: () => setConfirmDelete(true),
            },
          ] satisfies NativeMenuItem[])
        : ([
            {
              label: "Move to Trash",
              shortcut: ["⌫"],
              onSelect: () => void trashSelection(scope),
            },
          ] satisfies NativeMenuItem[])),
    ];
    void showContextMenu(items);
  }, [filteredCount, inTrash, taskItems, tagItems]);

  // Selection keyboard shortcuts. Single-key handlers are auto-ignored while a
  // text field is focused; Escape stays purely additive so it never blocks
  // dialogs or popovers from closing.
  useHotkey("Escape", () => selection.clear(), {
    enabled: selectionSize > 0,
    preventDefault: false,
    stopPropagation: false,
  });
  useHotkey("Backspace", destructive, { enabled: selectionSize > 0 });
  useHotkey("Delete", destructive, { enabled: selectionSize > 0 });

  // Precedence: selection > active composer > live agent result > nav. Composing
  // wins over an active result so the user can ask again on top of results.
  const view =
    selectionSize > 0
      ? "selection"
      : mode === "compose"
        ? "ask"
        : ask.active
          ? "status"
          : "nav";
  const isCard = view === "ask";
  // Animate the pill border while the agent is searching (status view). The beam
  // is an absolute, click-through overlay so it never clips the pill's shadow.
  const thinking = ask.status === "thinking";

  // Inner content cross-fades while the pill springs to its new width.
  const swap = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
      };

  return (
    <div className={styles.dock}>
      <Tooltip.Provider>
        <motion.div
          ref={pillRef}
          className={styles.pill}
          layout
          animate={{
            borderRadius: isCard ? 20 : 9999,
            padding: isCard ? 0 : 4,
          }}
          transition={gentleSpring}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {view === "selection" ? (
              <motion.div
                key="selection"
                className={styles.row}
                {...swap}
                transition={bouncySpring}
              >
                <button
                  type="button"
                  className={styles.count}
                  aria-label={
                    isAllSelected()
                      ? `${formatNumber(selectionSize)} selected`
                      : `${formatNumber(selectionSize)} selected, select all`
                  }
                  onClick={() => selectAllInView()}
                >
                  {formatNumber(selectionSize)}
                  {filteredCount > selectionSize ? (
                    <span className={styles.countTotal}>
                      /{formatNumber(filteredCount)}
                    </span>
                  ) : null}
                </button>

                <Tooltip.Trigger
                  handle={tooltip}
                  className={styles.item}
                  payload="Run task"
                  aria-label="Run task on selection"
                  render={
                    <motion.button
                      type="button"
                      onClick={runSelectionTask}
                      whileTap={{ rotate: -8 }}
                      transition={snappySpring}
                    >
                      <span className={styles.icon}>
                        <Wand />
                      </span>
                    </motion.button>
                  }
                />

                <Tooltip.Trigger
                  handle={tooltip}
                  className={styles.item}
                  payload="Tag"
                  aria-label="Tag selection"
                  render={
                    <motion.button
                      type="button"
                      onClick={openTagMenu}
                      whileTap={{ rotate: -8 }}
                      transition={snappySpring}
                    >
                      <span className={styles.icon}>
                        <TagAdd />
                      </span>
                    </motion.button>
                  }
                />

                <Tooltip.Trigger
                  handle={tooltip}
                  className={`${styles.item} ${inTrash ? "" : styles.danger}`}
                  payload={inTrash ? "Restore" : "Move to Trash"}
                  aria-label={
                    inTrash ? "Restore selection" : "Move selection to trash"
                  }
                  render={
                    <motion.button
                      type="button"
                      onClick={destructive}
                      whileTap={{ rotate: -8 }}
                      transition={snappySpring}
                    >
                      <span className={styles.icon}>
                        {inTrash ? <Restore /> : <Trash />}
                      </span>
                    </motion.button>
                  }
                />

                <Tooltip.Trigger
                  handle={tooltip}
                  className={styles.item}
                  payload="More"
                  aria-label="More actions"
                  render={
                    <motion.button
                      type="button"
                      onClick={openOverflowMenu}
                      whileTap={{ scale: 0.9 }}
                      transition={snappySpring}
                    >
                      <span className={styles.icon}>
                        <More />
                      </span>
                    </motion.button>
                  }
                />

                <button
                  type="button"
                  className={styles.clear}
                  aria-label="Clear selection"
                  onClick={() => selection.clear()}
                >
                  Clear
                </button>
              </motion.div>
            ) : view === "ask" ? (
              <motion.div
                key="ask"
                className={styles.askRow}
                {...swap}
                transition={bouncySpring}
              >
                <AskComposer
                  autoFocus
                  onCollapse={closeAsk}
                  onClear={clearAsk}
                />
              </motion.div>
            ) : view === "status" ? (
              <motion.div
                key="status"
                className={styles.askRow}
                {...swap}
                transition={bouncySpring}
              >
                <AskStatusPill onReopen={openAsk} onClear={clearResults} />
              </motion.div>
            ) : (
              <motion.div
                key="nav"
                className={styles.row}
                {...swap}
                transition={bouncySpring}
              >
                {NAV_TABS.map((tab) => {
                  const active = tab.match(pathname);
                  return (
                    <Tooltip.Trigger
                      key={tab.label}
                      handle={tooltip}
                      className={styles.item}
                      payload={tab.label}
                      render={
                        <Link
                          to={tab.to}
                          params={tab.params}
                          data-status={active ? "active" : undefined}
                          aria-current={active ? "page" : undefined}
                        >
                          {active ? (
                            <span className={styles.indicator} aria-hidden />
                          ) : null}
                          {tab.icon}
                        </Link>
                      }
                      aria-label={tab.label}
                    />
                  );
                })}

                <span className={styles.separator} aria-hidden />

                <button
                  type="button"
                  className={styles.search}
                  aria-label="Ask anything"
                  onClick={openAsk}
                >
                  <span className={styles.searchInner}>
                    <span className={styles.searchLabel}>Ask anything…</span>
                  </span>
                  <kbd className={styles.kbd}>⌘/</kbd>
                </button>

                <span className={styles.separator} aria-hidden />

                <Tooltip.Trigger
                  handle={tooltip}
                  className={styles.item}
                  payload="New"
                  aria-label="New"
                  render={
                    <button type="button" onClick={() => setNewOpen(true)}>
                      <New />
                    </button>
                  }
                />

                <ViewMenu
                  side="top"
                  align="center"
                  anchor={() => pillRef.current}
                  trigger={
                    <Tooltip.Trigger
                      handle={tooltip}
                      className={styles.item}
                      payload="View options"
                      aria-label="View options"
                      render={
                        <button type="button">
                          <ViewIcon />
                        </button>
                      }
                    />
                  }
                />

                <Tooltip.Trigger
                  handle={tooltip}
                  className={styles.item}
                  payload="Settings"
                  aria-label="Settings"
                  render={
                    <Link
                      to="/settings"
                      data-status={
                        pathname.startsWith("/settings") ? "active" : undefined
                      }
                    >
                      {pathname.startsWith("/settings") ? (
                        <span className={styles.indicator} aria-hidden />
                      ) : null}
                      <Settings />
                    </Link>
                  }
                />
              </motion.div>
            )}
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

        <Tooltip.Root handle={tooltip}>
          {({ payload }) => (
            <Tooltip.Portal>
              <Tooltip.Positioner sideOffset={11} className={styles.Positioner}>
                <Tooltip.Popup className={styles.Popup}>
                  <Tooltip.Viewport className={styles.Viewport}>
                    {payload as string}
                  </Tooltip.Viewport>
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          )}
        </Tooltip.Root>
      </Tooltip.Provider>

      <NewSaveDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        anchor={() => pillRef.current}
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
    </div>
  );
}

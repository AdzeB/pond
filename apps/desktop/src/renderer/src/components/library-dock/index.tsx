import {
  IconArchiveContent2Fill18 as Library,
  IconArchivePlusFill18 as New,
  IconNutFill18 as Settings,
  IconArrowsConvergeFill18 as Sources,
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
import { ViewMenu } from "@/components/library-view-menu";
import { NewSaveDialog } from "@/components/new-save-dialog";
import { formatNumber } from "@/lib/format";
import { bouncySpring, gentleSpring, snappySpring } from "@/lib/motion";
import { trashSaves } from "@/lib/mutate-save";
import { type NativeMenuItem, showContextMenu } from "@/lib/native-menu";
import { selectableTasks } from "@/lib/tasks";
import { clearAsk, useAskResult } from "@/stores/ask-store";
import {
  selection,
  useSelectedIds,
  useSelectionSize,
} from "@/stores/selection";
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
  const ids = useSelectedIds();
  const reduceMotion = useReducedMotion();
  const ask = useAskResult();
  const [mode, setMode] = useState<DockMode>("nav");
  const [newOpen, setNewOpen] = useState(false);

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

  const moveToTrash = async () => {
    await trashSaves(ids);
    selection.clear();
  };

  // Pop a native menu of tasks that can run on a subset, scoped to the current
  // selection. Each result is surfaced as a toast.
  const runSelectionTask = useCallback(() => {
    const scope = selection.snapshot();
    if (scope.length === 0) return;
    const items: NativeMenuItem[] = [
      { label: `Run on ${scope.length} selected`, enabled: false },
      { type: "separator" },
      ...selectableTasks().map((task) => ({
        label: task.label,
        onSelect: async () => {
          try {
            const res = await task.run(scope);
            pushToast(res.message, res.ok ? "success" : "error");
          } catch {
            pushToast(`${task.label} failed.`, "error");
          }
        },
      })),
    ];
    void showContextMenu(items);
  }, []);

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
                <span
                  className={styles.count}
                  role="status"
                  aria-label={`${formatNumber(selectionSize)} selected`}
                >
                  {formatNumber(selectionSize)}
                </span>

                <motion.button
                  type="button"
                  className={styles.item}
                  aria-label="Run task on selection"
                  onClick={runSelectionTask}
                  whileTap={{ rotate: -8 }}
                  transition={snappySpring}
                >
                  <span className={styles.icon}>
                    <Wand />
                  </span>
                </motion.button>

                <motion.button
                  type="button"
                  className={`${styles.item} ${styles.danger}`}
                  aria-label="Move selected to trash"
                  onClick={moveToTrash}
                  whileTap={{ rotate: -8 }}
                  transition={snappySpring}
                >
                  <span className={styles.icon}>
                    <Trash />
                  </span>
                </motion.button>

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
                  onSubmitted={closeAsk}
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
    </div>
  );
}

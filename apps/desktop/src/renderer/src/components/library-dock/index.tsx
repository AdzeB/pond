import {
  IconArchivePlusFill18 as Plus,
  IconGearFill18 as Settings,
  IconSliders2VerticalFill18 as Sliders,
  IconArrowsRotateCenterFill18 as Sync,
  IconTrash2Fill18 as Trash,
} from "@pond/icons/fill/18";
import { Tooltip, useToast } from "@pond/ui";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { PondSwitcher } from "@/components/library-pond-switcher";
import { ViewOptionsMenu } from "@/components/library-view-menu/options-menu";
import { useSidebarNav } from "@/hooks/use-sidebar-nav";
import { formatNumber } from "@/lib/format";
import { gentleSpring, snappySpring } from "@/lib/motion";
import { trashSaves } from "@/lib/mutate-save";
import {
  selection,
  useSelectedIds,
  useSelectionSize,
} from "@/stores/selection";
import { syncMonitor, useAnySyncRunning } from "@/stores/sync-monitor";
import styles from "./styles.module.css";

const DOCK_NAV_KEYS = new Set(["library", "trash"]);

export function Dock() {
  const selectionSize = useSelectionSize();
  const { visibleItems } = useSidebarNav();
  const syncRunning = useAnySyncRunning();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItems = visibleItems.filter(({ item }) =>
    DOCK_NAV_KEYS.has(item.key),
  );

  return (
    <nav className={styles.dock} aria-label="Primary navigation">
      <div className={styles.pill}>
        <PondSwitcher compact className={styles.item} />

        {navItems.map(({ item, count }) => {
          const active =
            item.path === "/"
              ? pathname === "/"
              : pathname === `/${item.params?.mode}`;
          return (
            <Tooltip
              key={item.key}
              label={
                count > 0
                  ? `${item.label} · ${formatNumber(count)}`
                  : item.label
              }
              side="top"
            >
              <Link
                to={item.path}
                params={item.params}
                activeOptions={item.path === "/" ? { exact: true } : undefined}
                className={styles.item}
                aria-label={item.label}
              >
                {active ? (
                  <motion.span
                    layoutId="dockActive"
                    className={styles.activeIndicator}
                    transition={gentleSpring}
                    aria-hidden
                  />
                ) : null}
                <span className={styles.icon}>{item.icon}</span>
              </Link>
            </Tooltip>
          );
        })}

        <Tooltip label="View options" side="top">
          <ViewOptionsMenu
            side="top"
            align="start"
            trigger={
              <button
                type="button"
                className={styles.item}
                aria-label="View options"
              >
                <span className={styles.icon}>
                  <Sliders />
                </span>
              </button>
            }
          />
        </Tooltip>

        <Tooltip label="Sync status" side="top">
          <button
            type="button"
            className={styles.item}
            aria-label="Sync status"
            onClick={() => syncMonitor.open()}
          >
            <span className={styles.icon}>
              <Sync />
            </span>
            <AnimatePresence>
              {syncRunning ? (
                <motion.span
                  className={styles.syncDot}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={snappySpring}
                  aria-hidden
                />
              ) : null}
            </AnimatePresence>
          </button>
        </Tooltip>

        <Tooltip label="New" side="top">
          <button type="button" className={styles.item} aria-label="New">
            <span className={styles.icon}>
              <Plus />
            </span>
          </button>
        </Tooltip>

        <Tooltip label="Settings" side="top">
          <Link to="/settings" className={styles.item} aria-label="Settings">
            <span className={styles.icon}>
              <Settings />
            </span>
          </Link>
        </Tooltip>
      </div>
      <AnimatePresence>
        {selectionSize > 0 ? (
          <SelectionGroup key="selection" count={selectionSize} />
        ) : null}
      </AnimatePresence>
    </nav>
  );
}

function SelectionGroup({ count }: { count: number }) {
  const toast = useToast();
  const ids = useSelectedIds();

  const moveToTrash = async () => {
    const moved = await trashSaves(ids);
    selection.clear();
    toast.add({
      title: `Moved ${formatNumber(moved)} to trash`,
      type: "success",
    });
  };

  return (
    <motion.div
      className={styles.selectionPill}
      initial={{ opacity: 0, scale: 0.85, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.85, x: -8 }}
      transition={snappySpring}
    >
      <span
        className={styles.count}
        role="status"
        aria-label={`${formatNumber(count)} selected`}
      >
        {formatNumber(count)}
      </span>

      <Tooltip label="Move to trash" side="top">
        <motion.button
          type="button"
          className={`${styles.item} ${styles.danger}`}
          aria-label="Move selected to trash"
          onClick={moveToTrash}
          whileTap={{ scale: 0.86, rotate: -8 }}
          transition={snappySpring}
        >
          <span className={styles.icon}>
            <Trash />
          </span>
        </motion.button>
      </Tooltip>

      <button
        type="button"
        className={styles.clear}
        aria-label="Clear selection"
        onClick={() => selection.clear()}
      >
        Clear
      </button>
    </motion.div>
  );
}

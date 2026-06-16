import { IconTrash2Fill18 as Trash } from "@pond/icons/fill/18";
import { Tooltip } from "@pond/ui";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { formatNumber } from "@/lib/format";
import { bouncySpring, snappySpring } from "@/lib/motion";
import { trashSaves } from "@/lib/mutate-save";
import {
  selection,
  useSelectedIds,
  useSelectionSize,
} from "@/stores/selection";
import styles from "./styles.module.css";

interface NavTab {
  label: string;
  to: "/" | "/$mode" | "/sources";
  params?: { mode: string };
  match: string;
}

const NAV_TABS: readonly NavTab[] = [
  { label: "Library", to: "/", match: "/" },
  { label: "Sources", to: "/sources", match: "/sources" },
] as const;

export function Dock() {
  const selectionSize = useSelectionSize();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const ids = useSelectedIds();

  const moveToTrash = async () => {
    await trashSaves(ids);
    selection.clear();
  };

  return (
    <div className={styles.dock}>
      <AnimatePresence mode="popLayout" initial={false}>
        {selectionSize > 0 ? (
          <motion.div
            className={styles.pill}
            initial={{ opacity: 0, scale: 0.85, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: -8 }}
            transition={bouncySpring}
          >
            <span
              className={styles.count}
              role="status"
              aria-label={`${formatNumber(selectionSize)} selected`}
            >
              {formatNumber(selectionSize)}
            </span>

            <Tooltip label="Move to trash" side="top">
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
        ) : (
          <motion.div
            className={styles.pill}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={bouncySpring}
          >
            {NAV_TABS.map((tab) => {
              const active = pathname === tab.match;

              return (
                <Link
                  key={tab.label}
                  to={tab.to}
                  params={tab.params}
                  className={styles.tab}
                  data-status={active ? "active" : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  {active ? (
                    <motion.span
                      layoutId="dockNavActive"
                      className={styles.indicator}
                      transition={bouncySpring}
                      aria-hidden
                    />
                  ) : null}
                  <span className={styles.label}>{tab.label}</span>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

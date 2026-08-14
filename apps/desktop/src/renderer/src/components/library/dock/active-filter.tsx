import { IconCircleXmarkFill18 as Clear } from "@pond/icons/fill/18";
import { Button } from "@pond/ui";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { serializeQuery } from "@/lib/search/syntax";
import { bouncySpring } from "@/lib/ui/motion";
import { openLibrarySearch } from "@/lib/ui/open-search";
import { clearAsk, useAskResult } from "@/stores/ask-store";
import {
  resetFilters,
  useFilterQuery,
  useSearchText,
} from "@/stores/view-store";
import styles from "./active-filter.module.css";
import { useDock } from "./lib/context";

/** Shown while the composer is collapsed so a live filter still has a clear and edit control. */
export function ActiveFilter() {
  const dock = useDock();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const query = useFilterQuery();
  const q = useSearchText();
  const ask = useAskResult();

  const serialized = [serializeQuery(query), q.trim()]
    .filter(Boolean)
    .join(" ");
  const label = (ask.active ? ask.question.trim() : "") || serialized;
  const active = ask.active || serialized.length > 0;
  const show =
    active &&
    (dock.view === "nav" || dock.view === "selection") &&
    !pathname.startsWith("/sources");

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="active-filter"
          className={styles.cluster}
          initial={{ opacity: 0, y: 6, x: "-50%", scale: 0.98 }}
          animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
          exit={{ opacity: 0, y: 6, x: "-50%", scale: 0.98 }}
          transition={bouncySpring}
        >
          <Button
            size="sm"
            variant="secondary"
            aria-label="Edit filter"
            onClick={() => openLibrarySearch()}
          >
            <span className={styles.label}>{label || "Filter"}</span>
          </Button>
          <Button
            icon
            size="sm"
            variant="secondary"
            aria-label="Clear filter"
            onClick={() => {
              clearAsk();
              resetFilters();
            }}
          >
            <Clear />
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

import { Button } from "@pond/ui";
import { Eye } from "lucide-react";
import { useView } from "./context";
import styles from "./styles.module.css";

export function Trigger() {
  const { state } = useView();
  const activeFilters =
    state.query.clauses.length + state.pendingPredicates.length;
  const label =
    activeFilters > 0 ? `View, ${activeFilters} filters applied` : "View";

  return (
    <Button icon aria-label={label} title={label} className={styles.trigger}>
      <Eye style={{ width: "100%", height: "100%" }} />
      {activeFilters > 0 ? (
        <span className={styles["trigger-badge"]} aria-hidden>
          {activeFilters}
        </span>
      ) : null}
    </Button>
  );
}

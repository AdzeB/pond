import { IconPlusFill18 as Plus } from "@pond/icons/fill/18";
import { Link, useNavigate } from "@tanstack/react-router";
import { type CSSProperties, useMemo } from "react";
import {
  RANGE_OPTIONS,
  useDashboards,
} from "@/components/library/analytics/lib/dashboards";
import { GRID_CELL_W } from "@/components/library/analytics/lib/insight-sizing";
import { LibraryGrid } from "@/components/library/layouts/grid";
import {
  LIBRARY_ITEM_GAP,
  PackedGrid,
  type PackedItem,
  packUniform,
} from "@/components/library/layouts/packed-grid";
import { useGridMin } from "@/hooks/use-grid-min";
import { useGridWidth } from "@/stores/shell-state";
import styles from "./styles.module.css";

const NEW_DASHBOARD_ID = "__new__";
/** Matches the previous CSS `grid-auto-rows`. */
const DASHBOARD_CELL_HEIGHT = 124;

function rangeLabel(days: number): string {
  return (
    RANGE_OPTIONS.find((o) => o.value === days)?.label ?? `Last ${days} days`
  );
}

function cellStyle(item: PackedItem): CSSProperties {
  return {
    position: "absolute",
    top: `${item.top}px`,
    left: `${item.left}px`,
    width: `${item.width}px`,
    height: `${item.height}px`,
  };
}

/** Index of all dashboards; each opens as its own /analytics/$dashboardId page. */
export function AnalyticsDashboardsPage() {
  const { dashboards, addDashboard } = useDashboards();
  const navigate = useNavigate();
  const width = useGridWidth();
  /** Text cards need more room than save thumbs; floor at insight column width. */
  const colMin = Math.max(useGridMin(), GRID_CELL_W);

  const create = () => {
    const id = addDashboard();
    void navigate({
      to: "/analytics/$dashboardId",
      params: { dashboardId: id },
    });
  };

  const byId = useMemo(() => {
    const map = new Map(dashboards.map((d) => [d.id, d]));
    return map;
  }, [dashboards]);

  const { items, totalHeight } = useMemo(
    () =>
      packUniform(
        [...dashboards.map((d) => d.id), NEW_DASHBOARD_ID],
        width,
        colMin,
        LIBRARY_ITEM_GAP,
        DASHBOARD_CELL_HEIGHT,
      ),
    [dashboards, width, colMin],
  );

  return (
    <LibraryGrid.Root className={styles.root}>
      <PackedGrid
        layout="grid"
        items={items}
        totalHeight={totalHeight}
        renderItem={(item) => {
          if (item.id === NEW_DASHBOARD_ID) {
            return (
              <li key={item.id} className={styles.cell} style={cellStyle(item)}>
                <button
                  type="button"
                  className={styles.new}
                  aria-label="New dashboard"
                  onClick={create}
                >
                  <Plus />
                </button>
              </li>
            );
          }
          const d = byId.get(item.id);
          if (!d) return null;
          return (
            <li key={item.id} className={styles.cell} style={cellStyle(item)}>
              <Link
                to="/analytics/$dashboardId"
                params={{ dashboardId: d.id }}
                className={styles.card}
              >
                <span className={styles.name}>{d.name}</span>
                {d.description ? (
                  <span className={styles.description}>{d.description}</span>
                ) : null}
                <span className={styles.meta}>
                  {d.insights.length}{" "}
                  {d.insights.length === 1 ? "insight" : "insights"} /{" "}
                  {rangeLabel(d.days)}
                </span>
              </Link>
            </li>
          );
        }}
      />
    </LibraryGrid.Root>
  );
}

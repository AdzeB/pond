import { IconPlusFill18 as Plus } from "@pond/icons/fill/18";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  RANGE_OPTIONS,
  useDashboards,
} from "@/components/library-analytics/lib/dashboards";
import styles from "./styles.module.css";

function rangeLabel(days: number): string {
  return (
    RANGE_OPTIONS.find((o) => o.value === days)?.label ?? `Last ${days} days`
  );
}

/** Index of all dashboards; each opens as its own /analytics/$dashboardId page. */
export function AnalyticsDashboardsPage() {
  const { dashboards, addDashboard } = useDashboards();
  const navigate = useNavigate();

  const create = () => {
    const id = addDashboard();
    void navigate({
      to: "/analytics/$dashboardId",
      params: { dashboardId: id },
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.grid}>
          {dashboards.map((d) => (
            <Link
              key={d.id}
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
          ))}
          <button
            type="button"
            className={styles.new}
            aria-label="New dashboard"
            onClick={create}
          >
            <Plus />
          </button>
        </div>
      </div>
    </div>
  );
}

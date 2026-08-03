import { TitleBar } from "@pond/ui";
import { Link, useRouterState } from "@tanstack/react-router";
import { Calligraph } from "calligraph";
import { useDashboards } from "@/components/library/analytics/lib/dashboards";
import { extractSource, labelForMode, parseMode } from "@/lib/save/list";
import { listBaseFromPath } from "@/lib/search/schemas";
import { formatNumber } from "@/lib/util/format";
import { useAskResult } from "@/stores/ask-store";
import { useViewFilteredCount } from "@/stores/library-view-context";
import { useSyncByAccount } from "@/stores/sync-monitor";
import { useFilterQuery, useSearchText } from "@/stores/view-store";
import styles from "./styles.module.css";

/** Rendered only on /sources; the sources page's accounts fetch seeds the sync monitor this reads from. */
function SourcesTitle() {
  const byAccount = useSyncByAccount();
  const connected = Object.values(byAccount).filter((a) => a.connected).length;

  return (
    <TitleBar.Root>
      <TitleBar.Title>
        <TitleBar.Label>Sources</TitleBar.Label>
        {connected > 0 ? (
          <TitleBar.Meta>{formatNumber(connected)} connected</TitleBar.Meta>
        ) : null}
      </TitleBar.Title>
    </TitleBar.Root>
  );
}

function AnalyticsTitle() {
  const { dashboards } = useDashboards();

  return (
    <TitleBar.Root>
      <TitleBar.Title>
        <TitleBar.Label>Analytics</TitleBar.Label>
        {dashboards.length > 0 ? (
          <TitleBar.Meta>
            {formatNumber(dashboards.length)}{" "}
            {dashboards.length === 1 ? "dashboard" : "dashboards"}
          </TitleBar.Meta>
        ) : null}
      </TitleBar.Title>
    </TitleBar.Root>
  );
}

/** Breadcrumb title for an open dashboard; the leading crumb steps back to the index. */
function DashboardTitle({ id }: { id: string }) {
  const { dashboard } = useDashboards(id);

  return (
    <TitleBar.Root>
      <TitleBar.Title>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link to="/analytics" className={styles["crumb-link"]}>
            Analytics
          </Link>
          <span className={styles["crumb-sep"]} aria-hidden="true">
            /
          </span>
          <TitleBar.Label aria-current="page">{dashboard.name}</TitleBar.Label>
        </nav>
      </TitleBar.Title>
    </TitleBar.Root>
  );
}

export function Toolbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/sources") return <SourcesTitle />;
  if (pathname === "/analytics") return <AnalyticsTitle />;
  const dashboardId = pathname.startsWith("/analytics/")
    ? pathname.slice("/analytics/".length)
    : "";
  if (dashboardId) return <DashboardTitle id={dashboardId} />;
  return <DefaultTitle pathname={pathname} />;
}

function DefaultTitle({ pathname }: { pathname: string }) {
  const count = useViewFilteredCount();
  const search = useSearchText().trim();
  const filterQuery = useFilterQuery();
  const ask = useAskResult();

  const base = listBaseFromPath(pathname);
  const mode = parseMode(base) ?? "library";
  const sourceFilter = mode === "source" ? extractSource(base) : "";

  const title = ask.active
    ? ask.question.trim() || "Results"
    : labelForMode(mode, sourceFilter);

  const filterCount = filterQuery.rules.length;
  const meta: string[] = [];
  if (!ask.active) {
    if (search) meta.push(`matching “${search}”`);
    if (filterCount > 0) {
      meta.push(`${filterCount} filter${filterCount === 1 ? "" : "s"}`);
    }
  }
  meta.push(formatNumber(count));

  return (
    <TitleBar.Root>
      <TitleBar.Title>
        <TitleBar.Label>{title}</TitleBar.Label>
        {meta.length > 0 ? (
          <TitleBar.Meta>
            <Calligraph>{meta.join(" / ")}</Calligraph>
          </TitleBar.Meta>
        ) : null}
      </TitleBar.Title>
    </TitleBar.Root>
  );
}

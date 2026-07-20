import { createFileRoute, redirect } from "@tanstack/react-router";
import { AnalyticsPage } from "@/components/library-analytics";
import { loadPrefs } from "@/stores/prefs";

export const Route = createFileRoute("/_library/analytics/$dashboardId")({
  /** Stale ids (deleted dashboard in history, bad deep link) land on the index instead of a ghost dashboard. */
  beforeLoad: async ({ params }) => {
    const prefs = await loadPrefs();
    const dashboards = prefs.analyticsView.dashboards ?? [];
    if (!dashboards.some((d) => d.id === params.dashboardId)) {
      throw redirect({ to: "/analytics" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { dashboardId } = Route.useParams();
  return <AnalyticsPage id={dashboardId} />;
}

import { createFileRoute } from "@tanstack/react-router";
import { AnalyticsDashboardsPage } from "@/components/library-analytics-dashboards";

export const Route = createFileRoute("/_library/analytics/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AnalyticsDashboardsPage />;
}

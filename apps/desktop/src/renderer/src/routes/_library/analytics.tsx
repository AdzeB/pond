import { createFileRoute } from "@tanstack/react-router";
import { AnalyticsPage } from "@/components/library-analytics";

export const Route = createFileRoute("/_library/analytics")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AnalyticsPage />;
}

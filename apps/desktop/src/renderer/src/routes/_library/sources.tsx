import { createFileRoute } from "@tanstack/react-router";
import { SourcesPage } from "@/components/library-sources-page";

export const Route = createFileRoute("/_library/sources")({
  component: RouteComponent,
});

function RouteComponent() {
  return <SourcesPage />;
}

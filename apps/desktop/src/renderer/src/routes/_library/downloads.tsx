import { createFileRoute } from "@tanstack/react-router";
import { DownloadsPage } from "@/components/library/downloads/page";

export const Route = createFileRoute("/_library/downloads")({
  component: RouteComponent,
});

function RouteComponent() {
  return <DownloadsPage />;
}

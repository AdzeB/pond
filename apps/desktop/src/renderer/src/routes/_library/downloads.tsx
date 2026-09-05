import { createFileRoute } from "@tanstack/react-router";
import { DownloadsPage } from "@/features/downloads/components/page/page";

export const Route = createFileRoute("/_library/downloads")({
  component: RouteComponent,
});

function RouteComponent() {
  return <DownloadsPage />;
}

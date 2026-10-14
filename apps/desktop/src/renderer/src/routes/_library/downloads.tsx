import { createFileRoute } from "@tanstack/react-router";
import { DownloadsPage } from "@/features/downloads/components/page";

export const Route = createFileRoute("/_library/downloads")({
  component: DownloadsPage,
});

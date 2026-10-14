import { createFileRoute } from "@tanstack/react-router";
import { SourcesPage } from "@/features/sources/components/page";

export const Route = createFileRoute("/_library/sources")({
  component: SourcesPage,
});

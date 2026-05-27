import { createFileRoute } from "@tanstack/react-router";
import { SaveDetailView } from "./-save-detail-view";

export const Route = createFileRoute("/_library/detail/$id")({
  component: SaveDetailView,
});

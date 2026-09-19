import { createFileRoute } from "@tanstack/react-router";
import { SaveDetailPage } from "@/features/library/components/save-detail-page";
import { ensureSaves } from "@/features/saves/lib/ensure-saves";

export const Route = createFileRoute("/_library/save/$id")({
  loader: ({ params }) => ensureSaves([params.id]),
  component: SaveDetailPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { SaveDetailPage } from "@/features/saves/components/detail/page/page";
import { ensureSaves } from "@/features/saves/lib/ensure-saves";

export const Route = createFileRoute("/_library/save/$id")({
  loader: ({ params }) => ensureSaves([params.id]),
  component: SaveDetailPage,
});

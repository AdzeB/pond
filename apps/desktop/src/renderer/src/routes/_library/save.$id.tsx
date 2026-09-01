import { createFileRoute } from "@tanstack/react-router";
import { SaveDetailPage } from "@/components/save/detail/page";
import { ensureSaves } from "@/lib/save/ensure-saves";

export const Route = createFileRoute("/_library/save/$id")({
  loader: ({ params }) => ensureSaves([params.id]),
  component: SaveDetailPage,
});

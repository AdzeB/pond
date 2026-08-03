import { createFileRoute } from "@tanstack/react-router";
import { SaveDetailPage } from "@/components/save/detail/page";

export const Route = createFileRoute("/_library/save/$id")({
  component: SaveDetailPage,
});

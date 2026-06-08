import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseMode } from "@/features/library/lib/save-list";
import { SaveDetailView } from "./-save-detail-view";

export const Route = createFileRoute("/_library/$mode/detail/$id")({
  beforeLoad: ({ params }) => {
    if (parseMode(`/${params.mode}`) === null) {
      throw redirect({ to: "/" });
    }
  },
  component: SaveDetailView,
});

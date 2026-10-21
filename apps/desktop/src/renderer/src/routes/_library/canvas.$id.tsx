import { createFileRoute } from "@tanstack/react-router";
import { CanvasPage } from "@/features/canvas/components/page";

export const Route = createFileRoute("/_library/canvas/$id")({
  component: CanvasRoute,
});

function CanvasRoute() {
  const { id } = Route.useParams();
  return <CanvasPage id={id} />;
}

import { createFileRoute } from "@tanstack/react-router";
import { PlaygroundDetail } from "@/components/playground";

export const Route = createFileRoute("/playground/$id")({
  component: PlaygroundElementPage,
});

function PlaygroundElementPage() {
  const { id } = Route.useParams();
  return <PlaygroundDetail id={id} />;
}

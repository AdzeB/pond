import { createFileRoute } from "@tanstack/react-router";
import { SavesPage } from "@/components/library-saves-page";

export const Route = createFileRoute("/_library/saves")({
  component: RouteComponent,
});

function RouteComponent() {
  return <SavesPage />;
}

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_library/sources")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_library/sources"!</div>;
}

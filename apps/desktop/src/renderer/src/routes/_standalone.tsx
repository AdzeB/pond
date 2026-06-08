import { Shell } from "@pond/ui";
import { createFileRoute, Outlet } from "@tanstack/react-router";

function StandaloneLayout() {
  return (
    <Shell.Body>
      <Shell.Main>
        <Outlet />
      </Shell.Main>
    </Shell.Body>
  );
}

export const Route = createFileRoute("/_standalone")({
  component: StandaloneLayout,
});

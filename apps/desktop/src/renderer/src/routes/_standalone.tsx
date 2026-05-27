import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Shell } from "@/components/shell";

function StandaloneLayout() {
  return (
    <Shell>
      <Shell.Main>
        <Outlet />
      </Shell.Main>
    </Shell>
  );
}

export const Route = createFileRoute("/_standalone")({
  component: StandaloneLayout,
});

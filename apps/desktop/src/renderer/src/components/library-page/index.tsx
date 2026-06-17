import { Shell } from "@pond/ui";
import { Outlet } from "@tanstack/react-router";
import { Toolbar } from "@/components/library-toolbar";

export function Library() {
  return (
    <Shell.Main>
      <Shell.Header>
        <Toolbar />
      </Shell.Header>
      <Outlet />
    </Shell.Main>
  );
}

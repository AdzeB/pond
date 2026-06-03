import { Shell } from "@pond/ui";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Inspector } from "@/components/library/inspector";
import { LibrarySidebar } from "@/components/library/sidebar";
import { HeaderToolbar } from "@/components/library/toolbar";
import { LayoutMenuBridge } from "@/effects/layout-menu-bridge";

function LibraryLayout() {
  return (
    <Shell.Body>
      <Shell.Aside>
        <LibrarySidebar />
      </Shell.Aside>
      <Shell.Main>
        <Shell.Header>
          <HeaderToolbar />
        </Shell.Header>
        <LayoutMenuBridge />
        <Outlet />
      </Shell.Main>
      <Shell.Aside>
        <Inspector />
      </Shell.Aside>
    </Shell.Body>
  );
}

export const Route = createFileRoute("/_library")({
  component: LibraryLayout,
});

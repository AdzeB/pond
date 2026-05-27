import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LibrarySidebar } from "@/components/library/sidebar";
import { Shell } from "@/components/shell";
import { Inspector } from "@/components/shell/inspector";
import { LayoutMenuBridge } from "@/effects/layout-menu-bridge";

function LibraryLayout() {
  return (
    <Shell sidebar={<LibrarySidebar />} inspector={<Inspector />}>
      <LayoutMenuBridge />
      <Outlet />
    </Shell>
  );
}

export const Route = createFileRoute("/_library")({
  component: LibraryLayout,
});

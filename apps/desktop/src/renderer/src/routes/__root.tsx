import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Dock } from "@/components/library-dock";
import { SaveModal } from "@/components/save-detail-modal";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const navigate = useNavigate();

  // Menu / tray / deep-link navigation arrives over `IPC.nav` as a path string.
  // Settings is its own page, so route `/settings[/<section>]` to it here.
  useEffect(() => {
    return window.pond.onNavigate((path) => {
      const pathname = path.split("?")[0] ?? "";
      if (pathname === "/components") {
        void navigate({ to: "/components" });
        return;
      }
      if (pathname === "/settings") {
        void navigate({ to: "/settings" });
        return;
      }
      if (pathname.startsWith("/settings/")) {
        const section = pathname.slice("/settings/".length);
        void navigate({ to: "/settings/$section", params: { section } });
      }
    });
  }, [navigate]);

  return (
    <>
      <Outlet />
      <Dock.Root />
      <SaveModal />
    </>
  );
}

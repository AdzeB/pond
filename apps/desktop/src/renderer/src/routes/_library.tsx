import { Shell } from "@pond/ui";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import React from "react";
import { Inspector } from "@/components/library/inspector";
import { LibrarySidebar } from "@/components/library/sidebar";
import { HeaderToolbar } from "@/components/library/toolbar";
import { LayoutMenuBridge } from "@/effects/layout-menu-bridge";

export const Route = createFileRoute("/_library")({
  component: () => (
    <React.Fragment>
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
    </React.Fragment>
  ),
});

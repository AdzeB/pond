import { Shell } from "@pond/ui";
import { Outlet } from "@tanstack/react-router";
import React from "react";
import { Inspector } from "@/components/library/inspector";
import { Toolbar } from "@/components/library/toolbar";
import { Library as Sidebar } from "@/components/sidebars/library";

export function Library() {
  return (
    <React.Fragment>
      <Shell.Aside>
        <Sidebar />
      </Shell.Aside>
      <Shell.Main>
        <Shell.Header>
          <Toolbar />
        </Shell.Header>
        <Outlet />
      </Shell.Main>
      <Shell.Aside>
        <Inspector />
      </Shell.Aside>
    </React.Fragment>
  );
}

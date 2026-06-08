import { Shell } from "@pond/ui";
import { Outlet } from "@tanstack/react-router";
import React from "react";
import { Inspector } from "@/features/library/inspector";
import { Library as Sidebar } from "@/features/library/sidebar";
import { Toolbar } from "@/features/library/toolbar";

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

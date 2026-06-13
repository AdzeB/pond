import { Shell } from "@pond/ui";
import { Outlet } from "@tanstack/react-router";
import React from "react";
import { Settings as Sidebar } from "@/components/settings-sidebar";

export function Settings() {
  return (
    <React.Fragment>
      <Shell.Aside>
        <Sidebar />
      </Shell.Aside>
      <Shell.Main>
        <Outlet />
      </Shell.Main>
    </React.Fragment>
  );
}

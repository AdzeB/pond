import { Shell } from "@pond/ui";
import { Outlet } from "@tanstack/react-router";
import React from "react";
import { Dock } from "@/components/library-dock";
import { Toolbar } from "@/components/library-toolbar";
import { SaveModal } from "@/components/save-detail-modal";

export function Library() {
  return (
    <React.Fragment>
      <Shell.Main>
        <Shell.Header>
          <Toolbar />
        </Shell.Header>
        <Outlet />
      </Shell.Main>
      <Dock />
      <SaveModal />
    </React.Fragment>
  );
}

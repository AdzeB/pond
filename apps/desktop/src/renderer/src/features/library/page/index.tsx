import { Shell } from "@pond/ui";
import { Outlet } from "@tanstack/react-router";
import React from "react";
import { Dock } from "@/features/library/dock";
import { SyncMonitor } from "@/features/library/sync-monitor";
import { Toolbar } from "@/features/library/toolbar";
import { SaveModal } from "@/features/save/detail-modal";

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
      <SyncMonitor />
    </React.Fragment>
  );
}

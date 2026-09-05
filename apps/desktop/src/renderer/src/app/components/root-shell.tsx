import { Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { RightPane } from "@/app/components/right-pane/right-pane";
import { Toolbar } from "@/app/components/toolbar/toolbar";
import { Tray } from "@/app/components/tray";
import { AppHotkeys } from "@/app/effects/app-hotkeys";
import { MenuBridge } from "@/app/effects/menu-bridge";
import { UndoRedoBridge } from "@/app/effects/undo-redo-bridge";
import { FolderSidebar } from "@/features/library/components/folder-sidebar/folder-sidebar";
import { AppShell } from "@/features/library/components/workspace-shell/workspace-shell";
import { SaveHotkeys } from "@/features/saves/effects/save-hotkeys";
import { openSave, saveIdFromPath } from "@/features/saves/lib/save-nav";
import { SettingsSidebar } from "@/features/settings/components/sidebar/sidebar";
import { settingsHref } from "@/features/settings/lib/open-settings";
import { SourceFlowHost } from "@/features/sources/components/flow/flow";
import { getAppRouter } from "@/shared/lib/app-router";

export function RootShell() {
  const isComponentGallery = useRouterState({
    select: (state) => state.location.pathname.startsWith("/dev/"),
  });
  const isSettings = useRouterState({
    select: (state) => state.location.pathname.startsWith("/settings"),
  });
  useEffect(() => {
    return window.pond.onNavigate((path) => {
      const pathname = path.split("?")[0] ?? "";
      if (pathname === "/settings") {
        getAppRouter()?.history.push(settingsHref());
        return;
      }
      const saveId = saveIdFromPath(pathname);
      if (saveId) {
        openSave(saveId);
        return;
      }
      getAppRouter()?.history.push(pathname);
    });
  }, []);

  if (isComponentGallery) return <Outlet />;

  return (
    <>
      <UndoRedoBridge />
      <MenuBridge />
      <SaveHotkeys />
      <AppHotkeys />
      <AppShell.Root
        header={<Toolbar />}
        left={isSettings ? <SettingsSidebar /> : <FolderSidebar />}
        right={isSettings ? undefined : <RightPane />}
      >
        <Outlet />
      </AppShell.Root>
      <Tray.Library />
      <SourceFlowHost />
    </>
  );
}

import { Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { FolderSidebar } from "@/components/library/folder-sidebar";
import { RightPane } from "@/components/library/right-pane";
import { SourceFlowHost } from "@/components/library/source-flow";
import { SettingsSidebar } from "@/components/settings/sidebar";
import { AppShell } from "@/components/shell/app-shell";
import { Toolbar } from "@/components/shell/toolbar";
import { Tray } from "@/components/shell/tray";
import { AppHotkeys } from "@/effects/app-hotkeys";
import { MenuBridge } from "@/effects/menu-bridge";
import { SaveHotkeys } from "@/effects/save-hotkeys";
import { UndoRedoBridge } from "@/effects/undo-redo-bridge";
import { getAppRouter } from "@/lib/ui/app-router";
import { settingsHref } from "@/lib/ui/open-settings";
import { openSave, saveIdFromPath } from "@/lib/ui/save-nav";

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

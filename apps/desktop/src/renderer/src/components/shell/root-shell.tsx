import { Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { FolderSidebar } from "@/components/library/folder-sidebar";
import { RightPane } from "@/components/library/right-pane";
import { SourceFlowHost } from "@/components/library/source-flow";
import { SettingsModal } from "@/components/settings/modal";
import { AppShell } from "@/components/shell/app-shell";
import { Toolbar } from "@/components/shell/toolbar";
import { Tray } from "@/components/shell/tray";
import { AppHotkeys } from "@/effects/app-hotkeys";
import { MenuBridge } from "@/effects/menu-bridge";
import { SaveHotkeys } from "@/effects/save-hotkeys";
import { UndoRedoBridge } from "@/effects/undo-redo-bridge";
import { getAppRouter } from "@/lib/ui/app-router";
import { openSave, saveIdFromPath } from "@/lib/ui/save-nav";
import { settingsModal } from "@/stores/settings-modal";

export function RootShell() {
  const isComponentGallery = useRouterState({
    select: (state) => state.location.pathname.startsWith("/dev/"),
  });
  useEffect(() => {
    return window.pond.onNavigate((path) => {
      const pathname = path.split("?")[0] ?? "";
      if (pathname === "/settings") {
        settingsModal.open();
        return;
      }
      if (pathname.startsWith("/settings/")) {
        settingsModal.open(pathname.slice("/settings/".length));
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
        left={<FolderSidebar />}
        right={<RightPane />}
      >
        <Outlet />
      </AppShell.Root>
      <Tray.Library />
      <SourceFlowHost />
      <SettingsModal />
    </>
  );
}

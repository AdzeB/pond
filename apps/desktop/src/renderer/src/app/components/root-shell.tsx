import { Outlet, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { DetailsDialogHost } from "@/app/components/details-dialog";
import { RightPane } from "@/app/components/right-pane";
import { Toolbar } from "@/app/components/toolbar";
import { Tray } from "@/app/components/tray";
import { AppHotkeys } from "@/app/effects/app-hotkeys";
import { EditableHotkeyGuard } from "@/app/effects/editable-hotkey-guard";
import { MenuBridge } from "@/app/effects/menu-bridge";
import { UndoRedoBridge } from "@/app/effects/undo-redo-bridge";
import { FolderSidebar } from "@/features/library/components/folder-sidebar";
import { NewMenuDialogHost } from "@/features/library/components/new-menu";
import { OrganizationRenameDialogHost } from "@/features/library/components/organization-rename-dialog";
import { AppShell } from "@/features/library/components/workspace-shell";
import { enterFolder } from "@/features/library/operations/enter-folder";
import { savedViews } from "@/features/library/state/saved-views";
import { DuplicateImportReviewHost } from "@/features/saves/components/duplicate-import-review";
import { SaveHotkeys } from "@/features/saves/effects/save-hotkeys";
import { openSave, saveIdFromPath } from "@/features/saves/lib/save-nav";
import { SourceFlowHost } from "@/features/sources/components/flow";
import { getAppRouter } from "@/shared/lib/app-router";
import { settingsHref } from "@/shared/lib/open-settings";

const SettingsSidebar = lazy(() =>
  import("@/features/settings/components/sidebar").then((module) => ({
    default: module.SettingsSidebar,
  })),
);

export function RootShell() {
  const isSettings = useRouterState({
    select: (state) => state.location.pathname.startsWith("/settings"),
  });
  useEffect(() => {
    return window.pond.onNavigate((path) => {
      const pathname = path.split("?")[0] ?? "";
      const search = path.includes("?") ? path.slice(path.indexOf("?")) : "";
      const params = new URLSearchParams(search);
      const folderId = params.get("folder");
      const viewId = params.get("view");
      if (pathname === "/" && folderId) {
        enterFolder(folderId);
        return;
      }
      if (pathname === "/" && viewId) {
        savedViews.select(viewId);
        getAppRouter()?.history.push("/");
        return;
      }
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

  return (
    <>
      <EditableHotkeyGuard />
      <UndoRedoBridge />
      <MenuBridge />
      <SaveHotkeys />
      <AppHotkeys />
      <NewMenuDialogHost />
      <OrganizationRenameDialogHost />
      <DuplicateImportReviewHost />
      <AppShell.Root
        header={<Toolbar />}
        left={
          isSettings ? (
            <Suspense fallback={null}>
              <SettingsSidebar />
            </Suspense>
          ) : (
            <FolderSidebar />
          )
        }
        right={isSettings ? undefined : <RightPane />}
      >
        <Outlet />
      </AppShell.Root>
      <Tray.Library />
      <SourceFlowHost />
      <DetailsDialogHost />
    </>
  );
}

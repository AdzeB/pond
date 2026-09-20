import { Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RightPane } from "@/app/components/right-pane";
import { Toolbar } from "@/app/components/toolbar";
import { Tray } from "@/app/components/tray";
import { AppHotkeys } from "@/app/effects/app-hotkeys";
import { EditableHotkeyGuard } from "@/app/effects/editable-hotkey-guard";
import { MenuBridge } from "@/app/effects/menu-bridge";
import { UndoRedoBridge } from "@/app/effects/undo-redo-bridge";
import { FolderSidebar } from "@/features/library/components/folder-sidebar";
import { FolderUnlockDialog } from "@/features/library/components/folder-unlock-dialog";
import { NewMenuDialogHost } from "@/features/library/components/new-menu";
import { OrganizationRenameDialogHost } from "@/features/library/components/organization-rename-dialog";
import { AppShell } from "@/features/library/components/workspace-shell";
import { enterFolder } from "@/features/library/operations/enter-folder";
import { folders } from "@/features/library/state/folders";
import { savedViews } from "@/features/library/state/saved-views";
import { CombineImagesDialogHost } from "@/features/saves/components/combine-images-dialog";
import { DuplicateImportReviewHost } from "@/features/saves/components/duplicate-import-review";
import { SaveHotkeys } from "@/features/saves/effects/save-hotkeys";
import { openSave, saveIdFromPath } from "@/features/saves/lib/save-nav";
import { SettingsSidebar } from "@/features/settings/components/sidebar";
import { LocalizedSettings } from "@/features/settings/effects/localized-settings";
import { settingsHref } from "@/features/settings/lib/open-settings";
import { SourceFlowHost } from "@/features/sources/components/flow";
import { getAppRouter } from "@/shared/lib/app-router";

export function RootShell() {
  const [folderUnlock, setFolderUnlock] = useState<{
    targetId: string;
    unlockId: string;
    name: string;
    hint: string | null;
  } | null>(null);
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
        void enterFolder(folderId, (request) => {
          const folder = folders
            .snapshot()
            .find((candidate) => candidate.id === folderId);
          setFolderUnlock({
            targetId: request.targetId,
            unlockId: request.unlockId,
            name: folder?.name ?? "this folder",
            hint: request.hint,
          });
        });
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
      <CombineImagesDialogHost />
      <DuplicateImportReviewHost />
      {isSettings ? <LocalizedSettings /> : null}
      {folderUnlock ? (
        <FolderUnlockDialog
          folderId={folderUnlock.unlockId}
          folderName={folderUnlock.name}
          hint={folderUnlock.hint}
          onClose={() => setFolderUnlock(null)}
          onUnlocked={() => {
            const request = folderUnlock;
            setFolderUnlock(null);
            void enterFolder(request.targetId, (next) =>
              setFolderUnlock({
                targetId: next.targetId,
                unlockId: next.unlockId,
                name: request.name,
                hint: next.hint,
              }),
            );
          }}
        />
      ) : null}
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

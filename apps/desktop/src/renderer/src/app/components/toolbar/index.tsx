import {
  IconAlbum2Outline18,
  IconArrowDiagonalInOutline18,
  IconBookmarkOutline18,
  IconBookmarkSlashOutline18,
  IconChatBubblePenOutline18,
  IconClockRotateClockwiseOutline18,
  IconDotsOutline18,
  IconGear3Outline18,
  IconTrashXmarkOutline18,
  IconWindowDownloadOutline18,
} from "@pond/icons/outline/18";
import { Button, Menu } from "@pond/ui";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { ChromeHistoryNav } from "@/app/components/chrome-toolbar";
import { AgentToggle } from "@/features/library/components/agent-toggle/agent-toggle";
import { FolderCustomizeDialog } from "@/features/library/components/folder-customize-dialog";
import {
  FOLDER_ICONS,
  FOLDER_SWATCHES,
} from "@/features/library/components/folder-sidebar/folder-icons";
import { SidebarToggle } from "@/features/library/components/sidebar-toggle";
import { saveFolderPresentation } from "@/features/library/state/folder-presentation";
import {
  folders as folderStore,
  useFolders,
} from "@/features/library/state/folders";
import {
  libraryChrome,
  useLibraryNav,
  useRightPane,
  useSidebarOpen,
} from "@/features/library/state/library-chrome";
import {
  resetFilters,
  useHasActiveSearch,
} from "@/features/library/state/view-store";
import { useSave } from "@/features/saves/hooks/use-saves";
import { getLastListPath } from "@/features/saves/lib/list-path";
import { saveIdFromPath } from "@/features/saves/lib/save-nav";
import { useViewFilteredCount } from "@/features/saves/state/view-context";
import { usePrefs } from "@/features/settings/state/prefs";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { type Breadcrumb, buildBreadcrumbs } from "./breadcrumbs";
import { computeLabel } from "./labels";
import styles from "./styles.module.css";

const ROOT_ICONS = {
  "/": IconAlbum2Outline18,
  "/assistant": IconChatBubblePenOutline18,
  "/sources": IconArrowDiagonalInOutline18,
  "/tags": IconBookmarkOutline18,
  "/untagged": IconBookmarkSlashOutline18,
  "/recents": IconClockRotateClockwiseOutline18,
  "/downloads": IconWindowDownloadOutline18,
  "/trash": IconTrashXmarkOutline18,
  "/settings": IconGear3Outline18,
} as const;

function RootIcon({ path }: { path: string }) {
  const Icon =
    Object.entries(ROOT_ICONS).find(([route]) => route === path)?.[1] ??
    (path.startsWith("/settings")
      ? IconGear3Outline18
      : path.startsWith("/source/")
        ? IconArrowDiagonalInOutline18
        : IconAlbum2Outline18);
  return <Icon aria-hidden="true" />;
}

function Breadcrumbs() {
  const router = useRouter();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const nav = useLibraryNav();
  const folderRows = useFolders();
  const [folderViews] = usePrefs("folderViews");
  const [customizingFolderId, setCustomizingFolderId] = useState<string | null>(
    null,
  );
  const save = useSave(saveIdFromPath(pathname));
  const hasActiveSearch = useHasActiveSearch();
  const filteredCount = useViewFilteredCount();
  const crumbs = buildBreadcrumbs({
    pathname,
    listPath: getLastListPath(),
    nav,
    folders: folderRows,
    saveLabel: computeLabel(pathname, save),
    searchResultCount: hasActiveSearch ? filteredCount : undefined,
  });
  const hidden = crumbs.length > 3 ? crumbs.slice(1, -2) : [];
  const customizingFolder = customizingFolderId
    ? folderRows.find((folder) => folder.id === customizingFolderId)
    : undefined;

  function navigate(crumb: Breadcrumb) {
    if (crumb.nav) libraryChrome.setNav(crumb.nav);
    if (crumb.nav?.kind === "all" && crumb.path === "/") resetFilters();
    router.history.push(crumb.path);
  }

  function folderMenu(crumb: Breadcrumb) {
    if (crumb.nav?.kind !== "folder") return null;
    const folderId = crumb.nav.id;
    const folder = folderRows.find((entry) => entry.id === folderId);
    if (!folder) return null;
    const presentation = folderViews[folder.id];
    return {
      folder,
      items: [
        {
          label: "Open Folder",
          onClick: () => navigate(crumb),
        },
        {
          type: "checkbox" as const,
          label: "Quick Access",
          checked: presentation?.quickAccess ?? false,
          onCheckedChange: (quickAccess: boolean) =>
            void saveFolderPresentation(folder.id, { quickAccess }),
        },
        {
          type: "submenu" as const,
          label: "Icon",
          items: FOLDER_ICONS.map((option) => ({
            type: "checkbox" as const,
            label: option.label,
            checked: (presentation?.icon ?? "folder") === option.id,
            onCheckedChange: () =>
              void saveFolderPresentation(folder.id, { icon: option.id }),
          })),
        },
        {
          type: "submenu" as const,
          label: "Color",
          items: FOLDER_SWATCHES.map((option) => ({
            type: "checkbox" as const,
            label: option.label,
            checked: folder.color === option.id,
            onCheckedChange: () =>
              void window.pond
                .query("folders.setColor", {
                  id: folder.id,
                  color: option.id,
                })
                .then(() => folderStore.refresh()),
          })),
        },
        {
          type: "submenu" as const,
          label: "Sort By",
          items: (
            [
              ["savedAt", "Date Saved"],
              ["createdAt", "Date Added"],
              ["title", "Title"],
              ["type", "Type"],
              ["random", "Random"],
            ] as const
          ).map(([sortKey, label]) => ({
            type: "checkbox" as const,
            label,
            checked: (presentation?.sortKey ?? "savedAt") === sortKey,
            onCheckedChange: () =>
              void saveFolderPresentation(folder.id, { sortKey }),
          })),
        },
        {
          label: "Customize Folder",
          onClick: () => setCustomizingFolderId(folder.id),
        },
      ],
    };
  }

  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      <ol className={styles.trail}>
        {crumbs.map((crumb, index) => {
          if (hidden.length && index > 1 && index < crumbs.length - 2)
            return null;
          if (hidden.length && index === 1) {
            return (
              <li className={styles.overflow} key="ancestors">
                <span className={styles.separator} aria-hidden="true">
                  /
                </span>
                <Menu.Root>
                  <Menu.Trigger
                    icon
                    variant="ghost"
                    size="sm"
                    className={styles.more}
                    aria-label="Show Parent Folders"
                  >
                    <IconDotsOutline18 />
                  </Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner align="start" side="bottom">
                      <Menu.Popup>
                        <Menu.Items
                          items={hidden.map((parent) => ({
                            label: parent.label,
                            onClick: () => navigate(parent),
                          }))}
                        />
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </li>
            );
          }
          const current = index === crumbs.length - 1;
          const menu = folderMenu(crumb);
          const segment = current ? (
            <span
              className={styles.current}
              aria-current="page"
              title={crumb.label}
            >
              {index === 0 ? <RootIcon path={crumb.path} /> : null}
              <span className={styles.label}>{crumb.label}</span>
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className={styles.crumb}
              title={crumb.label}
              onClick={() => navigate(crumb)}
            >
              {index === 0 ? <RootIcon path={crumb.path} /> : null}
              <span className={styles.label}>{crumb.label}</span>
            </Button>
          );
          return (
            <li
              key={
                crumb.nav?.kind === "folder"
                  ? `folder:${crumb.nav.id}`
                  : `${crumb.path}:${crumb.nav?.kind ?? "save"}`
              }
              className={styles.segment}
              data-current={current || undefined}
            >
              {index > 0 ? (
                <span className={styles.separator} aria-hidden="true">
                  /
                </span>
              ) : null}
              {menu ? (
                <SpecContextMenu buildItems={() => menu.items}>
                  {segment}
                </SpecContextMenu>
              ) : (
                segment
              )}
            </li>
          );
        })}
      </ol>
      {customizingFolder ? (
        <FolderCustomizeDialog
          folder={customizingFolder}
          folderIcon={folderViews[customizingFolder.id]?.icon}
          onClose={() => setCustomizingFolderId(null)}
        />
      ) : null}
    </nav>
  );
}

export function Toolbar() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const hideInspector =
    pathname === "/assistant" || pathname.startsWith("/settings");
  const sidebarOpen = useSidebarOpen();
  const rightPane = useRightPane();
  return (
    <div className={styles.bar}>
      <div className={styles.chrome}>
        <SidebarToggle open={sidebarOpen} />
        <ChromeHistoryNav />
      </div>
      <div className={styles.main}>
        <Breadcrumbs />
      </div>
      <div className={styles.actions}>
        {hideInspector ? null : (
          <>
            <AgentToggle />
            <SidebarToggle side="right" open={rightPane !== null} />
          </>
        )}
      </div>
    </div>
  );
}

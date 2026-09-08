import { IconDotsFill12 } from "@pond/icons/fill/12";
import { IconChevronDownOutline12 } from "@pond/icons/outline/12";
import {
  IconAlbum2Outline18,
  IconArrowDiagonalInOutline18,
  IconArrowRotateClockwiseOutline18,
  IconBookmarkOutline18,
  IconBookmarkSlashOutline18,
  IconCode2Outline18,
  IconDownloadOutline18,
  IconEnvelopeOutline18,
  IconFolderBanOutline18,
  IconFolderOutline18,
  IconGear3Outline18,
  IconHashtagOutline18,
  IconMagnifierOutline18,
  IconMsg2Outline18,
  IconPencilOutline18,
  IconPlusOutline18,
  IconTrash2Outline18,
  IconTrashXmarkOutline18,
  IconVersionsOutline18,
  IconWindowDownloadOutline18,
} from "@pond/icons/outline/18";
import type { SavedView } from "@pond/schema/db";
import {
  Button,
  Dialog,
  Logo,
  Menu,
  type MenuItemSpec,
  Sidebar,
  Tooltip,
} from "@pond/ui";
import { useRouterState } from "@tanstack/react-router";
import { type CSSProperties, useMemo } from "react";
import { useStatusFeed } from "@/features/downloads/lib/status-feed";
import { newFolder } from "@/features/library/components/new-menu/actions";
import { NewMenu } from "@/features/library/components/new-menu/new-menu";
import { commandMenu } from "@/features/library/state/command-menu";
import {
  folders,
  useFolderMemberships,
  useFolders,
} from "@/features/library/state/folders";
import {
  type LibraryNav,
  libraryChrome,
  useLibraryNav,
} from "@/features/library/state/library-chrome";
import {
  promptCreateView,
  savedViews,
  useHydrateSavedViews,
  useSavedViews,
} from "@/features/library/state/saved-views";
import { selection } from "@/features/library/state/selection";
import {
  applySavedView,
  resetFilters,
  setIncludeSubfolders,
  useIncludeSubfolders,
  useViewStore,
} from "@/features/library/state/view-store";
import { useSaves } from "@/features/saves/hooks/use-saves";
import { openSettings } from "@/features/settings/lib/open-settings";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import { useTags } from "@/features/tags/state/tags";
import { ShortcutKeys } from "@/shared/components/shortcut-keys/shortcut-keys";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import { getAppRouter } from "@/shared/lib/app-router";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import { countSidebarSaves, formatCount } from "./counts";
import styles from "./folder-sidebar.module.css";
import { flattenFolderTree } from "./tree";

const TWITTER = "https://x.com/raphaelsalaja";
const GITHUB = "https://github.com/raphaelsalaja";
const EMAIL = "mailto:raphaelsalaja@gmail.com";
const POND_SITE = "https://pond.app";

function openUrl(url: string): void {
  void window.pond.openExternal(url);
}

const WORKSPACE_MENU: MenuItemSpec[] = [
  ...(import.meta.env.DEV
    ? [
        {
          label: "Components",
          icon: <IconCode2Outline18 />,
          onClick: () => getAppRouter()?.history.push("/dev/components"),
        },
        {
          label: "Downloads Lab",
          icon: <IconDownloadOutline18 />,
          onClick: () => getAppRouter()?.history.push("/dev/downloads"),
        },
        { type: "separator" as const },
      ]
    : []),
  {
    label: "Settings",
    icon: <IconGear3Outline18 />,
    shortcut: shortcutGlyphs("app.settings"),
    onClick: () => openSettings(),
  },
  {
    label: "Check for Updates",
    icon: <IconArrowRotateClockwiseOutline18 />,
    onClick: () => openSettings("general"),
  },
  { type: "separator" },
  {
    type: "group",
    label: "Contact",
    items: [
      {
        label: "Twitter",
        icon: <IconHashtagOutline18 />,
        onClick: () => openUrl(TWITTER),
      },
      {
        label: "GitHub",
        icon: <IconCode2Outline18 />,
        onClick: () => openUrl(GITHUB),
      },
      {
        label: "Email",
        icon: <IconEnvelopeOutline18 />,
        onClick: () => openUrl(EMAIL),
      },
    ],
  },
  { type: "separator" },
  {
    type: "group",
    label: "Apps",
    items: [
      {
        label: "Get the Chrome Extension",
        icon: <IconDownloadOutline18 />,
        onClick: () => openUrl(POND_SITE),
      },
    ],
  },
];

function go(path: string): void {
  getAppRouter()?.history.push(path);
}

function selectNav(nav: LibraryNav): void {
  libraryChrome.setNav(nav);
  if (nav.kind === "trash") go("/trash");
  else if (nav.kind === "downloads") go("/downloads");
  else if (nav.kind === "sources") go("/sources");
  else go("/");
}

function WorkspaceHeader() {
  const assistantPage = useRouterState({
    select: (s) => s.location.pathname === "/assistant",
  });

  return (
    <Sidebar.Header className={styles.workspace}>
      <Menu.Root>
        <Menu.Trigger variant="ghost" size="sm" className={styles.identity}>
          <span className={styles.mark} aria-hidden>
            <Logo size={12} />
          </span>
          <span className={styles.name}>Pond</span>
          <IconChevronDownOutline12 className={styles.chevron} aria-hidden />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start" side="bottom">
            <Menu.Popup className={styles.menu}>
              <Menu.Items items={WORKSPACE_MENU} />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <div className={styles["workspace-actions"]}>
        <Tooltip
          label="Search"
          shortcut={<ShortcutKeys id="library.search" />}
          side="bottom"
        >
          <Button
            icon
            size="sm"
            variant="ghost"
            aria-label="Search"
            onClick={() => commandMenu.open()}
          >
            <IconMagnifierOutline18 />
          </Button>
        </Tooltip>
        <Tooltip label="Assistant" side="bottom">
          <Button
            icon
            size="sm"
            variant="ghost"
            aria-label="Assistant"
            aria-current={assistantPage ? "page" : undefined}
            onClick={() => go("/assistant")}
          >
            <IconMsg2Outline18 />
          </Button>
        </Tooltip>
        <NewMenu />
      </div>
    </Sidebar.Header>
  );
}

function Row({
  label,
  active,
  icon,
  count,
  depth = 0,
  onClick,
  onDrop,
}: {
  label: string;
  active?: boolean;
  icon?: React.ReactNode;
  count?: number;
  depth?: number;
  onClick: () => void;
  onDrop?: () => void;
}) {
  return (
    <Sidebar.Item
      data-status={active ? "active" : undefined}
      data-depth={depth || undefined}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      onDragOver={
        onDrop
          ? (e) => {
              e.preventDefault();
            }
          : undefined
      }
      onDrop={
        onDrop
          ? (e) => {
              e.preventDefault();
              onDrop();
            }
          : undefined
      }
    >
      {icon ? <Sidebar.Icon>{icon}</Sidebar.Icon> : null}
      {label}
      {count != null ? (
        <Sidebar.Count>{formatCount(count)}</Sidebar.Count>
      ) : null}
    </Sidebar.Item>
  );
}

export function FolderSidebar() {
  const nav = useLibraryNav();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const assistantPage = pathname === "/assistant";
  const sourcesPage = pathname === "/sources";
  const tagsPage = pathname === "/tags";
  const untaggedPage = pathname === "/untagged";
  const libraryPage =
    !assistantPage && !sourcesPage && !tagsPage && !untaggedPage;
  const folderRows = useFolders();
  const memberships = useFolderMemberships();
  const saves = useSaves();
  const tags = useTags();
  const { accounts } = useAccounts();
  const includeSubfolders = useIncludeSubfolders();
  const { inProgress } = useStatusFeed();
  const scrollFade = useScrollFade<HTMLDivElement>();
  useHydrateSavedViews();

  const nested = useMemo(() => flattenFolderTree(folderRows), [folderRows]);
  const counts = useMemo(
    () => countSidebarSaves(saves, memberships),
    [saves, memberships],
  );
  const downloadsCount = inProgress.saving.length + inProgress.running.length;

  return (
    <Sidebar.Root
      className={styles.root}
      width="full"
      role="navigation"
      aria-label="Library"
    >
      <WorkspaceHeader />
      <Sidebar.Scroll className={styles.scroll} {...scrollFade}>
        <Sidebar.Group>
          <Sidebar.GroupLabel>Library</Sidebar.GroupLabel>
          <Row
            label="All"
            icon={<IconAlbum2Outline18 />}
            count={counts.library}
            active={libraryPage && nav.kind === "all"}
            onClick={() => {
              resetFilters();
              selectNav({ kind: "all" });
            }}
          />
          <Row
            label="Uncategorized"
            icon={<IconFolderBanOutline18 />}
            count={counts.uncategorized}
            active={libraryPage && nav.kind === "uncategorized"}
            onClick={() => {
              resetFilters();
              selectNav({ kind: "uncategorized" });
            }}
          />
          <Row
            label="Untagged"
            icon={<IconBookmarkSlashOutline18 />}
            count={counts.untagged}
            active={untaggedPage}
            onClick={() => {
              resetFilters();
              libraryChrome.setNav({ kind: "all" });
              go("/untagged");
            }}
          />
          <Row
            label="Tags"
            icon={<IconBookmarkOutline18 />}
            count={tags.length}
            active={tagsPage}
            onClick={() => go("/tags")}
          />
          <Row
            label="Trash"
            icon={<IconTrashXmarkOutline18 />}
            count={counts.trash}
            active={libraryPage && nav.kind === "trash"}
            onClick={() => selectNav({ kind: "trash" })}
          />
        </Sidebar.Group>
        <Sidebar.Group>
          <Sidebar.GroupLabel>Harvesting</Sidebar.GroupLabel>
          <Row
            label="Downloads"
            icon={<IconWindowDownloadOutline18 />}
            count={downloadsCount}
            active={libraryPage && nav.kind === "downloads"}
            onClick={() => selectNav({ kind: "downloads" })}
          />
          <Row
            label="Sources"
            icon={<IconArrowDiagonalInOutline18 />}
            count={accounts.length}
            active={sourcesPage}
            onClick={() => selectNav({ kind: "sources" })}
          />
        </Sidebar.Group>
        <SavedViewsSection />

        <Sidebar.CollapsibleGroup>
          <Sidebar.GroupHeader>
            <Sidebar.CollapsibleGroupLabel>
              Folders
            </Sidebar.CollapsibleGroupLabel>
            <Button
              icon
              size="sm"
              variant="ghost"
              aria-label="New Folder"
              onClick={() => newFolder()}
            >
              <IconPlusOutline18 />
            </Button>
          </Sidebar.GroupHeader>
          <Sidebar.CollapsibleGroupContent>
            {nested.map(({ folder, depth, guides }) => (
              <SpecContextMenu
                key={folder.id}
                buildItems={() => [
                  {
                    label: "New Subfolder",
                    onClick: () => newFolder(folder.id),
                  },
                  {
                    label: includeSubfolders
                      ? "Hide Subfolder Contents"
                      : "Show Subfolder Contents",
                    onClick: () => setIncludeSubfolders(!includeSubfolders),
                  },
                  {
                    label: "Rename",
                    onClick: () =>
                      Dialog.prompt({
                        title: "Rename Folder",
                        confirmLabel: "Save",
                        initialValue: folder.name,
                        onConfirm: async (name) => {
                          await window.pond.query("folders.rename", {
                            id: folder.id,
                            name,
                          });
                          await folders.refresh();
                        },
                      }),
                  },
                  { type: "separator" },
                  {
                    label: "Delete",
                    onClick: () =>
                      Dialog.confirm({
                        title: "Delete Folder",
                        description:
                          "Saves stay in the library. They move to Uncategorized.",
                        confirmLabel: "Delete",
                        confirmVariant: "destructive",
                        onConfirm: async () => {
                          await window.pond.query("folders.delete", {
                            id: folder.id,
                          });
                          await folders.refresh();
                          if (nav.kind === "folder" && nav.id === folder.id) {
                            selectNav({ kind: "all" });
                          }
                        },
                      }),
                  },
                ]}
              >
                <div
                  className={styles.trigger}
                  style={
                    // SAFETY: React forwards CSS custom properties to the element style.
                    { "--folder-depth": depth } as CSSProperties
                  }
                >
                  {guides.map(({ parentId, continues }, level) =>
                    continues || level === depth - 1 ? (
                      <span
                        key={parentId}
                        className={styles.guide}
                        style={
                          // SAFETY: React forwards CSS custom properties to the element style.
                          { "--guide-depth": level } as CSSProperties
                        }
                        data-branch={level === depth - 1 || undefined}
                        data-continues={continues || undefined}
                        aria-hidden="true"
                      />
                    ) : null,
                  )}
                  <Row
                    label={folder.name}
                    icon={<IconFolderOutline18 />}
                    depth={depth}
                    count={counts.folders[folder.id] ?? 0}
                    active={
                      libraryPage &&
                      nav.kind === "folder" &&
                      nav.id === folder.id
                    }
                    onClick={() => selectNav({ kind: "folder", id: folder.id })}
                    onDrop={() => {
                      const ids = [...selection.snapshot()];
                      if (ids.length === 0) return;
                      void window.pond
                        .query("folders.addSaves", {
                          folderId: folder.id,
                          saveIds: ids,
                        })
                        .then(() => folders.refresh());
                    }}
                  />
                </div>
              </SpecContextMenu>
            ))}
          </Sidebar.CollapsibleGroupContent>
        </Sidebar.CollapsibleGroup>
      </Sidebar.Scroll>
    </Sidebar.Root>
  );
}

function viewMenuItems(view: SavedView): MenuItemSpec[] {
  return [
    {
      label: "Rename",
      icon: <IconPencilOutline18 />,
      onClick: () =>
        Dialog.prompt({
          title: "Rename View",
          confirmLabel: "Save",
          initialValue: view.name,
          onConfirm: async (name) => {
            await window.pond.query("savedViews.rename", {
              id: view.id,
              name,
            });
            await savedViews.refresh();
          },
        }),
    },
    {
      label: "Delete",
      icon: <IconTrash2Outline18 />,
      onClick: () =>
        Dialog.confirm({
          title: "Delete View",
          description: "The view is removed. Your Saves stay.",
          confirmLabel: "Delete",
          confirmVariant: "destructive",
          onConfirm: async () => {
            await window.pond.query("savedViews.delete", {
              id: view.id,
            });
            await savedViews.refresh();
          },
        }),
    },
  ];
}

function SavedViewRow({ view }: { view: SavedView }) {
  const { activeViewId } = useViewStore();
  const items = viewMenuItems(view);

  return (
    <SpecContextMenu buildItems={() => items} className={styles["view-menu"]}>
      <div className={styles.entry}>
        <Row
          label={view.name}
          icon={<IconVersionsOutline18 />}
          active={activeViewId === view.id}
          onClick={() => {
            applySavedView(view);
            selectNav({ kind: "all" });
          }}
        />
        <Menu.Root>
          <Menu.Trigger
            icon
            size="xs"
            variant="ghost"
            className={styles.more}
            aria-label="More Actions"
            onClick={(event) => event.stopPropagation()}
          >
            <IconDotsFill12 />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner align="end" sideOffset={4}>
              <Menu.Popup className={styles["view-menu"]}>
                <Menu.Items items={items} />
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </SpecContextMenu>
  );
}

function SavedViewsSection() {
  const views = useSavedViews();

  return (
    <Sidebar.CollapsibleGroup>
      <Sidebar.GroupHeader>
        <Sidebar.CollapsibleGroupLabel>
          Saved Views
        </Sidebar.CollapsibleGroupLabel>
        <Button
          icon
          size="sm"
          variant="ghost"
          aria-label="Save Current View"
          onClick={promptCreateView}
        >
          <IconPlusOutline18 />
        </Button>
      </Sidebar.GroupHeader>
      <Sidebar.CollapsibleGroupContent>
        {views.map((view) => (
          <SavedViewRow key={view.id} view={view} />
        ))}
      </Sidebar.CollapsibleGroupContent>
    </Sidebar.CollapsibleGroup>
  );
}

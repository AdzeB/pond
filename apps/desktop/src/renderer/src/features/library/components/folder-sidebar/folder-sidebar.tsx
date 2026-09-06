import { IconDotsFill12 } from "@pond/icons/fill/12";
import { IconChevronDownOutline12 } from "@pond/icons/outline/12";
import {
  IconAlbum2Outline18,
  IconArrowRotateClockwiseOutline18,
  IconCode2Outline18,
  IconCommandOutline18,
  IconDownloadOutline18,
  IconFolderOutline18,
  IconGear3Outline18,
  IconGlobeOutline18,
  IconMagnifierOutline18,
  IconMsg2Outline18,
  IconPencilOutline18,
  IconPlusOutline18,
  IconTagsOutline18,
  IconTrash2Outline18,
  IconVersionsOutline18,
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
import { openShortcutsSheet } from "@/app/components/shortcuts-sheet/shortcuts-sheet";
import { useStatusFeed } from "@/features/downloads/lib/status-feed";
import { newFolder } from "@/features/library/components/new-menu/actions";
import { NewMenu } from "@/features/library/components/new-menu/new-menu";
import { commandMenu } from "@/features/library/state/command-menu";
import { folders, useFolders } from "@/features/library/state/folders";
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
import { openSettings } from "@/features/settings/lib/open-settings";
import { ShortcutKeys } from "@/shared/components/shortcut-keys/shortcut-keys";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import { getAppRouter } from "@/shared/lib/app-router";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import styles from "./folder-sidebar.module.css";
import { flattenFolderTree } from "./tree";

const GITHUB_REPO = "https://github.com/raphaelsalaja/pond";
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
        {
          label: "Assistant Lab",
          icon: <IconMsg2Outline18 />,
          onClick: () => getAppRouter()?.history.push("/dev/assistant"),
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
    label: "Help",
    items: [
      {
        label: "Keyboard Shortcuts",
        icon: <IconCommandOutline18 />,
        shortcut: shortcutGlyphs("app.shortcuts"),
        onClick: () => openShortcutsSheet(),
      },
      {
        label: "Pond on GitHub",
        icon: <IconCode2Outline18 />,
        onClick: () => openUrl(GITHUB_REPO),
      },
      {
        label: "Report an Issue",
        icon: <IconMsg2Outline18 />,
        onClick: () => openUrl(`${GITHUB_REPO}/issues/new`),
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
        <NewMenu />
      </div>
    </Sidebar.Header>
  );
}

function Row({
  label,
  active,
  icon,
  trailing,
  busy,
  depth = 0,
  onClick,
  onDrop,
}: {
  label: string;
  active?: boolean;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  busy?: boolean;
  depth?: number;
  onClick: () => void;
  onDrop?: () => void;
}) {
  return (
    <Sidebar.Item
      data-status={active ? "active" : undefined}
      data-depth={depth || undefined}
      aria-current={active ? "page" : undefined}
      aria-busy={busy || undefined}
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
      {trailing}
    </Sidebar.Item>
  );
}

function ProgressMark() {
  return (
    <span className={styles.progress} aria-hidden>
      <svg
        className={styles.ring}
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="9"
          cy="9"
          r="7"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="2.5"
        />
        <path
          d="M16 9C16 5.13401 12.866 2 9 2"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function FolderSidebar() {
  const nav = useLibraryNav();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const assistantPage = pathname === "/assistant";
  const sourcesPage = pathname === "/sources";
  const tagsPage = pathname === "/tags";
  const libraryPage = !assistantPage && !sourcesPage && !tagsPage;
  const folderRows = useFolders();
  const includeSubfolders = useIncludeSubfolders();
  const { inProgress } = useStatusFeed();
  const scrollFade = useScrollFade<HTMLDivElement>();
  useHydrateSavedViews();

  const nested = useMemo(() => flattenFolderTree(folderRows), [folderRows]);

  return (
    <Sidebar.Root
      className={styles.root}
      width="full"
      role="navigation"
      aria-label="Library"
    >
      <WorkspaceHeader />
      <Sidebar.Scroll className={styles.scroll} {...scrollFade}>
        <Row
          label="Library"
          icon={<IconAlbum2Outline18 />}
          active={libraryPage && nav.kind === "all"}
          onClick={() => {
            resetFilters();
            selectNav({ kind: "all" });
          }}
        />
        <Row
          label="Trash"
          icon={<IconTrash2Outline18 />}
          active={libraryPage && nav.kind === "trash"}
          onClick={() => selectNav({ kind: "trash" })}
        />
        <Row
          label="Downloads"
          icon={<IconDownloadOutline18 />}
          active={libraryPage && nav.kind === "downloads"}
          busy={inProgress.busy}
          trailing={inProgress.busy ? <ProgressMark /> : null}
          onClick={() => selectNav({ kind: "downloads" })}
        />
        <Row
          label="Sources"
          icon={<IconGlobeOutline18 />}
          active={sourcesPage}
          onClick={() => selectNav({ kind: "sources" })}
        />
        <Row
          label="Tags"
          icon={<IconTagsOutline18 />}
          active={tagsPage}
          onClick={() => go("/tags")}
        />
        <Row
          label="Assistant"
          icon={<IconMsg2Outline18 />}
          active={assistantPage}
          onClick={() => go("/assistant")}
        />
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

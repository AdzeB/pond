import {
  IconChevronDownOutline12,
  IconPlusOutline12,
} from "@pond/icons/outline/12";
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
  IconTagsOutline18,
  IconTrash2Outline18,
} from "@pond/icons/outline/18";
import {
  Button,
  Logo,
  Menu,
  type MenuItemSpec,
  Sidebar,
  Tooltip,
} from "@pond/ui";
import { useRouterState } from "@tanstack/react-router";
import { type CSSProperties, useMemo } from "react";
import { NewMenu } from "@/components/library/new-menu";
import { newFolder } from "@/components/library/new-menu/actions";
import { confirm } from "@/components/shared/confirm-dialog";
import { prompt } from "@/components/shared/prompt-dialog";
import { openShortcutsSheet } from "@/components/shared/shortcuts-sheet";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import { shortcutGlyphs } from "@/lib/save/shortcuts";
import { useStatusFeed } from "@/lib/status-feed";
import { getAppRouter } from "@/lib/ui/app-router";
import { focusLibrarySearch } from "@/lib/ui/open-search";
import { folders, useFolders } from "@/stores/folders";
import {
  type LibraryNav,
  libraryChrome,
  useLibraryNav,
} from "@/stores/library-chrome";
import { selection } from "@/stores/selection";
import { settingsModal } from "@/stores/settings-modal";
import { resetFilters } from "@/stores/view-store";
import styles from "./styles.module.css";
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
    onClick: () => settingsModal.open(),
  },
  {
    label: "Check for Updates",
    icon: <IconArrowRotateClockwiseOutline18 />,
    onClick: () => settingsModal.open("general"),
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
    <div className={styles.workspace}>
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
        <Tooltip label="Search" side="bottom">
          <Button
            icon
            size="sm"
            variant="ghost"
            aria-label="Search"
            onClick={() => focusLibrarySearch()}
          >
            <IconMagnifierOutline18 />
          </Button>
        </Tooltip>
        <NewMenu />
      </div>
    </div>
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
      className={styles.item}
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
  const { inProgress } = useStatusFeed();
  const scrollFade = useScrollFade<HTMLDivElement>();

  const nested = useMemo(() => flattenFolderTree(folderRows), [folderRows]);

  return (
    <Sidebar.Root
      className={styles.root}
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
          label="Uncategorized"
          icon={<IconFolderOutline18 />}
          active={libraryPage && nav.kind === "uncategorized"}
          onClick={() => selectNav({ kind: "uncategorized" })}
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

        <Sidebar.CollapsibleGroup>
          <div className={styles.heading}>
            <Sidebar.CollapsibleGroupLabel className={styles.title}>
              Folders
            </Sidebar.CollapsibleGroupLabel>
            <Button
              icon
              size="sm"
              variant="ghost"
              aria-label="New Folder"
              onClick={() => newFolder()}
            >
              <IconPlusOutline12 />
            </Button>
          </div>
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
                    label: "Rename",
                    onClick: () =>
                      prompt({
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
                      confirm({
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
                  style={{ "--folder-depth": depth } as CSSProperties}
                >
                  {guides.map(({ parentId, continues }, level) =>
                    continues || level === depth - 1 ? (
                      <span
                        key={parentId}
                        className={styles.guide}
                        style={{ "--guide-depth": level } as CSSProperties}
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

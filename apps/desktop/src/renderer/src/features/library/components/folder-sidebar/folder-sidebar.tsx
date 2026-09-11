import {
  IconChevronDownOutline12,
  IconChevronRightOutline12,
} from "@pond/icons/outline/12";
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
  IconGear3Outline18,
  IconHashtagOutline18,
  IconMagnifierOutline18,
  IconMessageSparkleOutline18,
  IconPlusOutline18,
  IconTrashXmarkOutline18,
  IconWindowDownloadOutline18,
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
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { useStatusFeed } from "@/features/downloads/lib/status-feed";
import {
  buildFolderMenuItems,
  confirmRemoveFolder,
  copyFolderToLibrary,
  duplicateFolder,
  exportFolderCsv,
  exportFolderFiles,
  exportFolderPackage,
  FolderContextMenu,
  folderIdsForExport,
} from "@/features/library/components/folder-context-menu/folder-context-menu";
import { NewMenu } from "@/features/library/components/new-menu/new-menu";
import { SmartFoldersSection } from "@/features/library/components/smart-folders/smart-folders";
import { useSidebarCounts } from "@/features/library/hooks/use-sidebar-counts";
import { commandMenu } from "@/features/library/state/command-menu";
import { saveFolderPresentation } from "@/features/library/state/folder-presentation";
import { folders, useFolders } from "@/features/library/state/folders";
import {
  type LibraryNav,
  libraryChrome,
  useLibraryNav,
} from "@/features/library/state/library-chrome";
import { useHydrateSavedViews } from "@/features/library/state/saved-views";
import { selection } from "@/features/library/state/selection";
import {
  resetFilters,
  setIncludeSubfolders,
  setSort,
  useIncludeSubfolders,
  useViewStore,
} from "@/features/library/state/view-store";
import { openSettings } from "@/features/settings/lib/open-settings";
import { usePrefs } from "@/features/settings/state/prefs";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import { useTags } from "@/features/tags/state/tags";
import { ShortcutKeys } from "@/shared/components/shortcut-keys/shortcut-keys";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import { getAppRouter } from "@/shared/lib/app-router";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import { notify } from "@/shared/lib/toast";
import {
  type FolderTool,
  FolderToolsDialog,
} from "../folder-tools/folder-tools";
import { formatCount } from "./counts";
import { FolderCover } from "./folder-cover";
import {
  FOLDER_DRAG_TYPE,
  type FolderDropKind,
  folderDropKind,
  isFolderDrag,
  planFolderSidebarDrop,
} from "./folder-drop";
import { folderColorCss } from "./folder-icons";
import { FolderNameEditor } from "./folder-name-editor";
import styles from "./folder-sidebar.module.css";
import { buildTrashMenuItems } from "./trash-menu";
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
  if (nav.kind !== "all") resetFilters();
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
            variant="text"
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
            variant="text"
            aria-label="Assistant"
            aria-current={assistantPage ? "page" : undefined}
            onClick={() => go("/assistant")}
          >
            <IconMessageSparkleOutline18 />
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
  className,
  draggable,
  onClick,
  onDrop,
  onDragOver,
  onDragLeave,
  onDragStart,
  onDragEnd,
}: {
  label: string;
  active?: boolean;
  icon?: React.ReactNode;
  count?: number;
  depth?: number;
  className?: string;
  draggable?: boolean;
  onClick: () => void;
  onDrop?: React.DragEventHandler<HTMLElement>;
  onDragOver?: React.DragEventHandler<HTMLElement>;
  onDragLeave?: React.DragEventHandler<HTMLElement>;
  onDragStart?: React.DragEventHandler<HTMLElement>;
  onDragEnd?: React.DragEventHandler<HTMLElement>;
}) {
  return (
    <Sidebar.Item
      className={className}
      data-status={active ? "active" : undefined}
      data-depth={depth || undefined}
      draggable={draggable}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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
  const [folderTool, setFolderTool] = useState<FolderTool | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [folderDrop, setFolderDrop] = useState<{
    id: string;
    kind: FolderDropKind;
  } | null>(null);
  const draggingFolderIdRef = useRef<string | null>(null);
  async function createFolder(parentId?: string) {
    if (creatingFolder) return;
    setCreatingFolder(true);
    setFoldersOpen(true);
    try {
      const folder = await window.pond.query("folders.create", {
        name: "Untitled",
        parentId,
      });
      await folders.refresh();
      setEditingFolderId(folder.id);
    } catch (error) {
      notify({
        id: "create-folder",
        title: "Couldn't create folder",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setCreatingFolder(false);
    }
  }
  const nav = useLibraryNav();
  const { activeViewId, sortKey, sortDir } = useViewStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const assistantPage = pathname === "/assistant";
  const sourcesPage = pathname === "/sources";
  const tagsPage = pathname === "/tags";
  const untaggedPage = pathname === "/untagged";
  const libraryPage =
    !assistantPage && !sourcesPage && !tagsPage && !untaggedPage;
  const [folderViews] = usePrefs("folderViews");
  const folderRows = useFolders();
  const tags = useTags();
  const { accounts } = useAccounts();
  const includeSubfolders = useIncludeSubfolders();
  const { inProgress } = useStatusFeed();
  const scrollFade = useScrollFade<HTMLDivElement>();
  useHydrateSavedViews();

  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      return new Set(
        z
          .array(z.string())
          .parse(
            JSON.parse(localStorage.getItem("pond:collapsed-folders") ?? "[]"),
          ),
      );
    } catch {
      return new Set();
    }
  });
  const nested = useMemo(
    () => flattenFolderTree(folderRows, collapsed),
    [folderRows, collapsed],
  );
  const parentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of folderRows) {
      if (row.parentId) ids.add(row.parentId);
    }
    return ids;
  }, [folderRows]);
  const persistCollapsed = (next: Set<string>) => {
    try {
      localStorage.setItem("pond:collapsed-folders", JSON.stringify([...next]));
    } catch {}
    return next;
  };
  const toggleFolder = (id: string) =>
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return persistCollapsed(next);
    });
  const toggleSameLevel = (parentId: string | null, expanded: boolean) =>
    setCollapsed((previous) => {
      const next = new Set(previous);
      for (const row of folderRows) {
        if (row.parentId !== parentId || !parentIds.has(row.id)) continue;
        if (expanded) next.add(row.id);
        else next.delete(row.id);
      }
      return persistCollapsed(next);
    });
  const toggleAllFolders = () =>
    setCollapsed((previous) => {
      const next = new Set(previous);
      const expand = [...parentIds].some((id) => previous.has(id));
      for (const id of parentIds) {
        if (expand) next.delete(id);
        else next.add(id);
      }
      return persistCollapsed(next);
    });
  const revealFolder = (id: string) =>
    setCollapsed((previous) => {
      if (!previous.has(id)) return previous;
      const next = new Set(previous);
      next.delete(id);
      return persistCollapsed(next);
    });
  useEffect(() => {
    if (folderDrop?.kind !== "into") return;
    const id = folderDrop.id;
    const timer = window.setTimeout(() => {
      setCollapsed((previous) => {
        if (!previous.has(id)) return previous;
        const next = new Set(previous);
        next.delete(id);
        try {
          localStorage.setItem(
            "pond:collapsed-folders",
            JSON.stringify([...next]),
          );
        } catch {}
        return next;
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [folderDrop]);
  const moveDraggedFolder = async (
    draggedId: string,
    folder: (typeof folderRows)[number],
    kind: FolderDropKind,
  ) => {
    const move = planFolderSidebarDrop(draggedId, folder, kind, folderRows);
    if (!move) return;
    try {
      await window.pond.query("folders.move", move);
      await folders.refresh();
      if (move.parentId) revealFolder(move.parentId);
    } catch (error) {
      notify({
        id: "move-folder",
        title: "Couldn't move folder",
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  };
  const counts = useSidebarCounts();
  const downloadsCount = inProgress.saving.length + inProgress.running.length;

  return (
    <Sidebar.Root
      className={styles.root}
      width="full"
      role="navigation"
      aria-label="Library"
      data-folder-drag={draggingFolderId || undefined}
    >
      <WorkspaceHeader />
      <Sidebar.Scroll className={styles.scroll} {...scrollFade}>
        <Sidebar.Group>
          <Sidebar.GroupLabel>Library</Sidebar.GroupLabel>
          <Row
            label="All"
            icon={<IconAlbum2Outline18 />}
            count={counts.library}
            active={libraryPage && nav.kind === "all" && !activeViewId}
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
          <SpecContextMenu buildItems={buildTrashMenuItems}>
            <Row
              label="Trash"
              icon={<IconTrashXmarkOutline18 />}
              count={counts.trash}
              active={libraryPage && nav.kind === "trash"}
              onClick={() => selectNav({ kind: "trash" })}
            />
          </SpecContextMenu>
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
        <SmartFoldersSection
          active={pathname === "/" && nav.kind === "all"}
          onSelect={() => selectNav({ kind: "all" })}
        />

        <Sidebar.CollapsibleGroup
          open={foldersOpen}
          onOpenChange={setFoldersOpen}
        >
          <Sidebar.GroupHeader>
            <Sidebar.CollapsibleGroupLabel>
              Folders
            </Sidebar.CollapsibleGroupLabel>
            <Button
              icon
              size="sm"
              variant="ghost"
              aria-label="New Folder"
              disabled={creatingFolder}
              onClick={() => void createFolder()}
            >
              <IconPlusOutline18 />
            </Button>
          </Sidebar.GroupHeader>
          <Sidebar.CollapsibleGroupContent>
            {nested.map(({ folder, depth }) => {
              const viewing =
                libraryPage && nav.kind === "folder" && nav.id === folder.id;
              const presentation = folderViews[folder.id];
              const includeThisFolder = viewing
                ? includeSubfolders
                : (presentation?.includeSubfolders ?? true);
              const folderSortKey = viewing
                ? sortKey
                : (presentation?.sortKey ?? "savedAt");
              const exportIds = folderIdsForExport(
                folder.id,
                folderRows,
                includeThisFolder,
              );
              const sameLevelHasChildren = folderRows.some(
                (row) =>
                  row.parentId === folder.parentId && parentIds.has(row.id),
              );
              const colorCss = folderColorCss(folder.color);
              return (
                <FolderContextMenu
                  key={folder.id}
                  buildItems={() =>
                    buildFolderMenuItems({
                      hasChildren: parentIds.has(folder.id),
                      sameLevelHasChildren,
                      includeSubfolders: includeThisFolder,
                      color: folder.color,
                      sortKey: folderSortKey,
                      creating: creatingFolder,
                      onNewFolder: () =>
                        void createFolder(folder.parentId ?? undefined),
                      onNewSubfolder: () => void createFolder(folder.id),
                      onMove: () =>
                        setFolderTool({
                          kind: "move",
                          id: folder.id,
                          name: folder.name,
                        }),
                      onRename: () => setEditingFolderId(folder.id),
                      onAutoTag: () =>
                        setFolderTool({
                          kind: "tags",
                          id: folder.id,
                          name: folder.name,
                        }),
                      onSort: (key) => {
                        if (viewing) setSort({ key, dir: sortDir });
                        else
                          void saveFolderPresentation(folder.id, {
                            sortKey: key,
                          }).catch(() =>
                            notify({
                              id: "folder-sort",
                              title: "Couldn't save folder sort",
                            }),
                          );
                      },
                      onToggleFolder: () => toggleFolder(folder.id),
                      onToggleSameLevel: () =>
                        toggleSameLevel(
                          folder.parentId,
                          !collapsed.has(folder.id),
                        ),
                      onToggleAll: () => toggleAllFolders(),
                      onDuplicate: () => {
                        void duplicateFolder(folder)
                          .then(async (id) => {
                            const icon = folderViews[folder.id]?.icon;
                            if (icon)
                              await saveFolderPresentation(id, { icon });
                            await folders.refresh();
                            setEditingFolderId(id);
                          })
                          .catch((error) =>
                            notify({
                              id: "folder-duplicate",
                              title: "Couldn't duplicate folder",
                              description:
                                error instanceof Error
                                  ? error.message
                                  : "Try again.",
                            }),
                          );
                      },
                      onExportFiles: () => void exportFolderFiles(exportIds),
                      onExportCsv: () => void exportFolderCsv(exportIds),
                      onExportPackage: () =>
                        void exportFolderPackage(exportIds),
                      onCopyToLibrary: () =>
                        void copyFolderToLibrary(exportIds),
                      onToggleSubfolders: (next) => {
                        if (viewing) setIncludeSubfolders(next);
                        else
                          void saveFolderPresentation(folder.id, {
                            includeSubfolders: next,
                          }).catch(() =>
                            notify({
                              id: "folder-subfolders",
                              title: "Couldn't save subfolder setting",
                            }),
                          );
                      },
                      onChangeIcon: (id) => {
                        void saveFolderPresentation(folder.id, {
                          icon: id,
                        }).catch(() =>
                          notify({
                            id: "folder-icon",
                            title: "Couldn't change folder icon",
                          }),
                        );
                      },
                      onChangeColor: (color) => {
                        void window.pond
                          .query("folders.setColor", { id: folder.id, color })
                          .then(() => folders.refresh())
                          .catch(() =>
                            notify({
                              id: "folder-color",
                              title: "Couldn't change folder color",
                            }),
                          );
                      },
                      onRemove: () =>
                        confirmRemoveFolder({
                          id: folder.id,
                          onRemoved: async () => {
                            await folders.refresh();
                            if (nav.kind === "folder" && nav.id === folder.id) {
                              selectNav({ kind: "all" });
                            }
                          },
                        }),
                    })
                  }
                >
                  <div
                    className={styles.trigger}
                    data-drop={
                      folderDrop?.id === folder.id ? folderDrop.kind : undefined
                    }
                    data-dragging={draggingFolderId === folder.id || undefined}
                    style={
                      // SAFETY: React forwards CSS custom properties to the element style.
                      { "--folder-depth": depth } as CSSProperties
                    }
                  >
                    {parentIds.has(folder.id) ? (
                      <Button
                        icon
                        size="xs"
                        variant="text"
                        className={styles.disclosure}
                        aria-label={`${collapsed.has(folder.id) ? "Expand" : "Collapse"} ${folder.name}`}
                        aria-expanded={!collapsed.has(folder.id)}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFolder(folder.id);
                        }}
                      >
                        <IconChevronRightOutline12 strokeWidth={2} />
                      </Button>
                    ) : null}
                    {editingFolderId === folder.id ? (
                      <FolderNameEditor
                        name={folder.name}
                        onSave={async (name) => {
                          const result = await window.pond.query(
                            "folders.rename",
                            { id: folder.id, name },
                          );
                          if (!result.ok)
                            throw new Error("Couldn't rename folder");
                          await folders.refresh();
                        }}
                        onFinish={() =>
                          setEditingFolderId((id) =>
                            id === folder.id ? null : id,
                          )
                        }
                      />
                    ) : (
                      <Row
                        label={folder.name}
                        className={styles.row}
                        icon={
                          <span
                            style={colorCss ? { color: colorCss } : undefined}
                          >
                            <FolderCover
                              icon={folderViews[folder.id]?.icon}
                              coverSaveId={folderViews[folder.id]?.coverSaveId}
                            />
                          </span>
                        }
                        depth={depth}
                        count={counts.folders[folder.id] ?? 0}
                        active={
                          libraryPage &&
                          nav.kind === "folder" &&
                          nav.id === folder.id
                        }
                        draggable
                        onClick={() =>
                          selectNav({ kind: "folder", id: folder.id })
                        }
                        onDragStart={(event) => {
                          event.dataTransfer.setData(
                            FOLDER_DRAG_TYPE,
                            folder.id,
                          );
                          event.dataTransfer.effectAllowed = "move";
                          draggingFolderIdRef.current = folder.id;
                          setDraggingFolderId(folder.id);
                        }}
                        onDragEnd={() => {
                          draggingFolderIdRef.current = null;
                          setDraggingFolderId(null);
                          setFolderDrop(null);
                        }}
                        onDragOver={(event) => {
                          if (isFolderDrag(event.dataTransfer.types)) {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                            const draggedId = draggingFolderIdRef.current;
                            if (!draggedId) return;
                            const rect =
                              event.currentTarget.getBoundingClientRect();
                            const kind = folderDropKind(
                              event.clientY - rect.top,
                              rect.height,
                            );
                            const allowed = planFolderSidebarDrop(
                              draggedId,
                              folder,
                              kind,
                              folderRows,
                            );
                            setFolderDrop(
                              allowed ? { id: folder.id, kind } : null,
                            );
                            return;
                          }
                          if (selection.size() > 0) event.preventDefault();
                        }}
                        onDragLeave={(event) => {
                          const next = event.relatedTarget;
                          if (
                            next instanceof Node &&
                            event.currentTarget.contains(next)
                          ) {
                            return;
                          }
                          setFolderDrop((current) =>
                            current?.id === folder.id ? null : current,
                          );
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const dragged =
                            event.dataTransfer.getData(FOLDER_DRAG_TYPE);
                          draggingFolderIdRef.current = null;
                          setDraggingFolderId(null);
                          setFolderDrop(null);
                          if (dragged) {
                            const rect =
                              event.currentTarget.getBoundingClientRect();
                            const kind = folderDropKind(
                              event.clientY - rect.top,
                              rect.height,
                            );
                            void moveDraggedFolder(dragged, folder, kind);
                            return;
                          }
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
                    )}
                  </div>
                </FolderContextMenu>
              );
            })}
          </Sidebar.CollapsibleGroupContent>
        </Sidebar.CollapsibleGroup>
      </Sidebar.Scroll>
      {folderTool ? (
        <FolderToolsDialog
          tool={folderTool}
          key={`${folderTool.kind}:${folderTool.id}`}
          onClose={() => setFolderTool(null)}
        />
      ) : null}
    </Sidebar.Root>
  );
}

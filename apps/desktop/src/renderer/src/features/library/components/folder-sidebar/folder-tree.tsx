import {
  type Active,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  KeyboardSensor,
  type Over,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  IconFolderSearchOutline18,
  IconGridOutline18,
  IconPlusOutline18,
  IconSortArrowsOutline18,
  IconVersionsOutline18,
} from "@pond/icons/outline/18";
import type { Folder } from "@pond/schema/db";
import { Button, Dialog, type MenuItemSpec, Sidebar } from "@pond/ui";
import { useReducedMotionConfig } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  enterFolder,
  enterFolders,
} from "@/features/library/operations/enter-folder";
import { usePrefs } from "@/features/settings/state/prefs";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import {
  SIDEBAR_SORTABLE_KEYBOARD_CODES,
  SIDEBAR_SORTABLE_SCREEN_READER_INSTRUCTIONS,
  SORTABLE_DROP_ANIMATION,
} from "@/shared/lib/dnd-kit";
import { notify } from "@/shared/lib/toast";
import { useOrganizationTree } from "../../hooks/use-organization-tree";
import { useSidebarCounts } from "../../hooks/use-sidebar-counts";
import { combineQueries, inheritedQueryFor } from "../../lib/smart-folders";
import { saveFolderPresentation } from "../../state/folder-presentation";
import { folders, useEditingFolderId } from "../../state/folders";
import type { LibraryNav } from "../../state/library-chrome";
import { openOrganizationRenameDialog } from "../../state/organization-rename-dialog";
import { saveSavedViewPresentation } from "../../state/saved-view-presentation";
import { savedViews, useSavedViews } from "../../state/saved-views";
import {
  resetFilters,
  setQuery,
  useIncludeSubfolders,
  useViewStore,
} from "../../state/view-store";
import {
  exportFolderCsv,
  exportFolderFiles,
  folderIdsForExport,
} from "../folder-context-menu/folder-context-menu";
import { FolderCustomizeDialog } from "../folder-customize-dialog";
import { type FolderTool, FolderToolsDialog } from "../folder-tools";
import { FolderCover } from "./folder-cover";
import { type FolderDropKind, folderDropKind } from "./folder-drop";
import { FolderIcon, folderColorCss } from "./folder-icons";
import { buildQuickAccessFolderMenuItems } from "./folder-row-menu";
import { FolderTreeRow } from "./folder-tree-row";
import { selectLibraryNav } from "./navigation";
import { Row } from "./row";
import styles from "./styles.module.css";
import type { FolderListSort } from "./tree";
import { useFolderDragDrop } from "./use-folder-drag-drop";
import {
  useFolderTreeState,
  useRevealFolderDrop,
} from "./use-folder-tree-state";

interface FolderTreeProps {
  folderRows: Folder[];
  libraryPage: boolean;
  nav: LibraryNav;
}

const FOLDER_SORT_OPTIONS: Array<{
  value: FolderListSort;
  label: string;
}> = [
  { value: "manual", label: "Custom Order" },
  { value: "createdAt", label: "Date Added" },
  { value: "title", label: "Title" },
];

const SAVED_VIEW_ICONS = {
  smart_folder: IconFolderSearchOutline18,
  group: IconGridOutline18,
  saved_view: IconVersionsOutline18,
} as const;

function dndFolderDropKind(
  active: Active,
  over: Over,
  pointerY?: number | null,
): FolderDropKind {
  const activeRect =
    active.rect.current.translated ?? active.rect.current.initial;
  const offset =
    pointerY != null
      ? pointerY - over.rect.top
      : activeRect
        ? activeRect.top + activeRect.height / 2 - over.rect.top
        : over.rect.height / 2;
  return folderDropKind(offset, over.rect.height);
}

function folderGroupMenuItems(
  sort: FolderListSort,
  onSort: (sort: FolderListSort) => void,
): MenuItemSpec[] {
  return [
    {
      type: "submenu",
      label: "Sort By",
      icon: <IconSortArrowsOutline18 />,
      items: FOLDER_SORT_OPTIONS.map((option) => ({
        type: "checkbox",
        label: option.label,
        checked: sort === option.value,
        onCheckedChange: () => onSort(option.value),
      })),
    },
  ];
}

export function FolderTree({ folderRows, libraryPage, nav }: FolderTreeProps) {
  const [folderTool, setFolderTool] = useState<FolderTool | null>(null);
  const [customizingFolderId, setCustomizingFolderId] = useState<string | null>(
    null,
  );
  const editingFolderId = useEditingFolderId();
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderViews] = usePrefs("folderViews");
  const [savedViewViews] = usePrefs("savedViewViews");
  const [sidebar] = usePrefs("sidebar");
  const views = useSavedViews();
  const { activeViewId } = useViewStore();
  const includeSubfolders = useIncludeSubfolders();
  const counts = useSidebarCounts();
  const tree = useFolderTreeState(folderRows);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [keyboardDrag, setKeyboardDrag] = useState(false);
  const pointerStartY = useRef<number | null>(null);
  const pointerY = useRef<number | null>(null);
  const reduceMotion = useReducedMotionConfig();
  const folderSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: SIDEBAR_SORTABLE_KEYBOARD_CODES,
    }),
  );
  function openSelectedFolders(ids: string[]) {
    enterFolders(ids, includeSubfolders);
  }
  const organization = useOrganizationTree(folderRows, openSelectedFolders);
  const drag = useFolderDragDrop({
    selectedIds: organization.selected,
    folderRows,
    revealFolder: tree.revealFolder,
  });
  useRevealFolderDrop(drag.folderDrop, tree.revealFolder);
  const activeFolder = activeFolderId
    ? folderRows.find((folder) => folder.id === activeFolderId)
    : undefined;
  const activeFolderDepth = activeFolderId
    ? tree.nested.find(({ folder }) => folder.id === activeFolderId)?.depth
    : undefined;
  const activeFolderPresentation = activeFolder
    ? folderViews[activeFolder.id]
    : undefined;
  const activeFolderHasChildren = activeFolder
    ? tree.parentIds.has(activeFolder.id)
    : false;
  const activeFolderCount = activeFolder
    ? (counts.folders[activeFolder.id] ?? 0)
    : 0;

  useEffect(() => {
    if (editingFolderId) setFoldersOpen(true);
  }, [editingFolderId]);

  function previewFolderDrop({ active, over }: DragOverEvent): void {
    if (!over) {
      drag.clearFolderDrop();
      return;
    }
    const target = folderRows.find((folder) => folder.id === over.id);
    if (!target) {
      drag.clearFolderDrop();
      return;
    }
    drag.previewFolderMove(
      String(active.id),
      target,
      dndFolderDropKind(active, over, pointerY.current),
    );
  }

  function finishFolderDrop({ active, over }: DragEndEvent): void {
    setActiveFolderId(null);
    setKeyboardDrag(false);
    drag.clearFolderDrop();
    const finalPointerY = pointerY.current;
    pointerStartY.current = null;
    pointerY.current = null;
    if (!over) return;
    const target = folderRows.find((folder) => folder.id === over.id);
    if (!target) return;
    const kind = dndFolderDropKind(active, over, finalPointerY);
    if (!drag.folderMoveTarget(String(active.id), target, kind)) return;
    void drag.moveFolder(String(active.id), target, kind);
  }
  const customizingFolder = customizingFolderId
    ? folderRows.find((folder) => folder.id === customizingFolderId)
    : undefined;
  const quickFolders = folderRows
    .filter((folder) => folderViews[folder.id]?.quickAccess)
    .sort(
      (left, right) =>
        (folderViews[left.id]?.quickAccessOrder ?? Number.MAX_SAFE_INTEGER) -
          (folderViews[right.id]?.quickAccessOrder ??
            Number.MAX_SAFE_INTEGER) ||
        left.sortOrder - right.sortOrder ||
        left.name.localeCompare(right.name),
    );
  const quickViews = views
    .filter((view) => savedViewViews[view.id]?.quickAccess)
    .toSorted(
      (left, right) =>
        (savedViewViews[left.id]?.quickAccessOrder ?? Number.MAX_SAFE_INTEGER) -
          (savedViewViews[right.id]?.quickAccessOrder ??
            Number.MAX_SAFE_INTEGER) ||
        left.sortOrder - right.sortOrder ||
        left.name.localeCompare(right.name),
    );
  const quickViewIds = quickViews.map((view) => view.id);
  const quickEntries = [
    ...quickViews.map((view) => ({
      id: `view:${view.id}`,
      name: view.name,
      parentId: null,
    })),
    ...quickFolders.map((folder) => ({
      id: `folder:${folder.id}`,
      name: folder.name,
      parentId: null,
    })),
  ];
  function openQuickSelection(ids: string[]) {
    const selectedFolders = quickFolders.filter((folder) =>
      ids.includes(`folder:${folder.id}`),
    );
    const selectedViews = quickViews.filter((view) =>
      ids.includes(`view:${view.id}`),
    );
    if (ids.length === 1 && selectedFolders[0]) {
      openQuickFolder(selectedFolders[0]);
      return;
    }
    resetFilters();
    selectLibraryNav({ kind: "all" });
    if (ids.length === 1 && selectedViews[0]) {
      savedViews.select(selectedViews[0].id);
      return;
    }
    setQuery({
      combinator: "or",
      rules: [
        ...selectedViews.map((view) =>
          combineQueries([inheritedQueryFor(view, views), view.query]),
        ),
        ...selectedFolders.map((folder) => ({
          combinator: "and" as const,
          rules: [
            {
              field: "folder" as const,
              operator: "some" as const,
              value: folderIdsForExport(
                folder.id,
                folderRows,
                includeSubfolders,
              ),
            },
          ],
        })),
      ],
    });
  }
  const quickOrganization = useOrganizationTree(quickEntries, (ids) => {
    openQuickSelection(ids);
  });
  function quickSelectionItems(): MenuItemSpec[] {
    const ids = quickOrganization.selected;
    const selectedFolderIds = quickFolders
      .filter((folder) => ids.includes(`folder:${folder.id}`))
      .map((folder) => folder.id);
    const selectedViewIds = quickViews
      .filter((view) => ids.includes(`view:${view.id}`))
      .map((view) => view.id);
    return [
      {
        label: `Open ${ids.length} Selected Items`,
        onClick: () => void openQuickSelection(ids),
      },
      {
        label: "Batch Rename Folders",
        hidden: selectedFolderIds.length === 0,
        onClick: () =>
          openOrganizationRenameDialog("folders", selectedFolderIds),
      },
      {
        label: "Batch Rename Smart Folders",
        hidden: selectedViewIds.length === 0,
        onClick: () =>
          openOrganizationRenameDialog("saved-views", selectedViewIds),
      },
      {
        label: "Remove from Quick Access",
        onClick: () =>
          void Promise.all([
            ...selectedFolderIds.map((id) =>
              saveFolderPresentation(id, { quickAccess: false }),
            ),
            ...selectedViewIds.map((id) =>
              saveSavedViewPresentation(id, { quickAccess: false }),
            ),
          ]),
      },
    ];
  }

  async function createFolder(parentId?: string): Promise<void> {
    if (creatingFolder) return;
    setCreatingFolder(true);
    setFoldersOpen(true);
    try {
      const folder = await window.pond.query("folders.create", {
        name: "Untitled",
        parentId,
      });
      await folders.refresh();
      folders.startEditing(folder.id);
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

  function openQuickFolder(folder: Folder): void {
    enterFolder(folder.id);
  }

  async function moveQuickView(id: string, offset: -1 | 1): Promise<void> {
    const current = quickViewIds.indexOf(id);
    const target = current + offset;
    if (current < 0 || target < 0 || target >= quickViewIds.length) return;
    const ordered = [...quickViewIds];
    const [moved] = ordered.splice(current, 1);
    if (!moved) return;
    ordered.splice(target, 0, moved);
    await Promise.all(
      ordered.map((viewId, quickAccessOrder) =>
        saveSavedViewPresentation(viewId, { quickAccessOrder }),
      ),
    );
  }

  return (
    <>
      {quickFolders.length > 0 || quickViews.length > 0 ? (
        <Sidebar.Group
          ref={quickOrganization.root}
          role="tree"
          aria-label="Quick Access"
          aria-multiselectable
        >
          <Sidebar.GroupLabel>Quick Access</Sidebar.GroupLabel>
          {quickViews.map((view, index) => {
            const presentation = savedViewViews[view.id];
            const color = folderColorCss(presentation?.color);
            const ViewIcon = SAVED_VIEW_ICONS[view.kind];
            return (
              <SpecContextMenu
                key={view.id}
                buildItems={() =>
                  quickOrganization.selected.includes(`view:${view.id}`) &&
                  quickOrganization.selected.length > 1
                    ? quickSelectionItems()
                    : [
                        {
                          label: `Open ${
                            view.kind === "saved_view"
                              ? "Saved View"
                              : view.kind === "group"
                                ? "Group"
                                : "Smart Folder"
                          }`,
                          onClick: () => {
                            selectLibraryNav({ kind: "all" });
                            savedViews.select(view.id);
                          },
                        },
                        {
                          label: "Remove from Quick Access",
                          onClick: () =>
                            void saveSavedViewPresentation(view.id, {
                              quickAccess: false,
                              quickAccessOrder: undefined,
                            }),
                        },
                        { type: "separator" },
                        {
                          label: "Move Up",
                          disabled: index === 0,
                          onClick: () => void moveQuickView(view.id, -1),
                        },
                        {
                          label: "Move Down",
                          disabled: index === quickViews.length - 1,
                          onClick: () => void moveQuickView(view.id, 1),
                        },
                      ]
                }
              >
                <Row
                  label={view.name}
                  icon={
                    <span style={color ? { color } : undefined}>
                      {presentation?.icon ? (
                        <FolderIcon name={presentation.icon} />
                      ) : (
                        <ViewIcon />
                      )}
                    </span>
                  }
                  active={activeViewId === view.id}
                  {...quickOrganization.rowProps(`view:${view.id}`, 0)}
                />
              </SpecContextMenu>
            );
          })}
          {quickFolders.map((folder) => (
            <SpecContextMenu
              key={folder.id}
              buildItems={() =>
                quickOrganization.selected.includes(`folder:${folder.id}`) &&
                quickOrganization.selected.length > 1
                  ? quickSelectionItems()
                  : buildQuickAccessFolderMenuItems({
                      folder,
                      folderIds: quickFolders.map((entry) => entry.id),
                      onOpen: () => void openQuickFolder(folder),
                    })
              }
            >
              <Row
                label={folder.name}
                icon={<FolderIcon name={folderViews[folder.id]?.icon} />}
                count={counts.folders[folder.id] ?? 0}
                badgeStyle={sidebar.badgeStyle}
                active={
                  libraryPage && nav.kind === "folder" && nav.id === folder.id
                }
                {...quickOrganization.rowProps(`folder:${folder.id}`, 0)}
              />
            </SpecContextMenu>
          ))}
        </Sidebar.Group>
      ) : null}
      <Sidebar.CollapsibleGroup
        open={foldersOpen}
        onOpenChange={setFoldersOpen}
      >
        <SpecContextMenu
          buildItems={() => folderGroupMenuItems(tree.sort, tree.setSort)}
        >
          <Sidebar.GroupHeader>
            <Sidebar.CollapsibleGroupLabel>
              Folders
            </Sidebar.CollapsibleGroupLabel>
            {organization.selected.length > 1 ? (
              <Sidebar.Count aria-live="polite">
                {organization.selected.length} selected
              </Sidebar.Count>
            ) : null}
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
        </SpecContextMenu>
        <DndContext
          accessibility={{
            screenReaderInstructions:
              SIDEBAR_SORTABLE_SCREEN_READER_INSTRUCTIONS,
            announcements: {
              onDragStart: ({ active }) => {
                const folder = folderRows.find((item) => item.id === active.id);
                return `Picked up ${folder?.name ?? "folder"}.`;
              },
              onDragOver: ({ active, over }) => {
                if (!over) return "The folder is no longer over a target.";
                const target = folderRows.find((item) => item.id === over.id);
                const kind = dndFolderDropKind(active, over, pointerY.current);
                const relation =
                  kind === "into"
                    ? "inside"
                    : kind === "before"
                      ? "before"
                      : "after";
                return `Move folder ${relation} ${target?.name ?? "folder"}.`;
              },
              onDragEnd: ({ active, over }) => {
                if (!over) return "The folder was dropped without moving.";
                const target = folderRows.find((item) => item.id === over.id);
                const kind = dndFolderDropKind(active, over, pointerY.current);
                const relation =
                  kind === "into"
                    ? "inside"
                    : kind === "before"
                      ? "before"
                      : "after";
                return `Moved folder ${relation} ${target?.name ?? "folder"}.`;
              },
              onDragCancel: ({ active }) => {
                const folder = folderRows.find((item) => item.id === active.id);
                return `Moving ${folder?.name ?? "folder"} was cancelled.`;
              },
            },
          }}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          sensors={folderSensors}
          onDragStart={({ active, activatorEvent }) => {
            setActiveFolderId(String(active.id));
            setKeyboardDrag(activatorEvent.type.startsWith("key"));
            pointerStartY.current =
              "clientY" in activatorEvent
                ? Number(activatorEvent.clientY)
                : null;
            pointerY.current = pointerStartY.current;
          }}
          onDragMove={({ delta }) => {
            pointerY.current =
              pointerStartY.current == null
                ? null
                : pointerStartY.current + delta.y;
          }}
          onDragOver={previewFolderDrop}
          onDragCancel={() => {
            setActiveFolderId(null);
            setKeyboardDrag(false);
            drag.clearFolderDrop();
            pointerStartY.current = null;
            pointerY.current = null;
          }}
          onDragEnd={finishFolderDrop}
        >
          <SortableContext
            items={tree.nested.map(({ folder }) => folder.id)}
            strategy={verticalListSortingStrategy}
          >
            <Sidebar.CollapsibleGroupContent
              ref={organization.root}
              role="tree"
              aria-label="Folders"
              aria-multiselectable
              inert={!foldersOpen}
              aria-hidden={!foldersOpen}
              data-folder-drag={activeFolderId || undefined}
            >
              {tree.nested.map(({ folder, depth }) => {
                const viewing =
                  libraryPage && nav.kind === "folder" && nav.id === folder.id;
                const presentation = folderViews[folder.id];
                const includeThisFolder = viewing
                  ? includeSubfolders
                  : (presentation?.includeSubfolders ?? true);
                return (
                  <FolderTreeRow
                    key={folder.id}
                    rowProps={organization.rowProps(
                      folder.id,
                      depth,
                      tree.parentIds.has(folder.id)
                        ? !tree.collapsed.has(folder.id)
                        : undefined,
                      () => tree.toggleFolder(folder.id),
                    )}
                    selectionItems={
                      organization.selected.includes(folder.id) &&
                      organization.selected.length > 1
                        ? () => [
                            {
                              label: `Move ${organization.selected.length} Folders`,
                              onClick: () =>
                                setFolderTool({
                                  kind: "move",
                                  id: folder.id,
                                  name: folder.name,
                                  ids: organization.selected,
                                }),
                            },
                            {
                              label: "Batch Rename Folders",
                              onClick: () =>
                                openOrganizationRenameDialog(
                                  "folders",
                                  organization.selected,
                                ),
                            },
                            {
                              label: "Add to Quick Access",
                              onClick: () =>
                                void Promise.all(
                                  organization.selected.map((id) =>
                                    saveFolderPresentation(id, {
                                      quickAccess: true,
                                    }),
                                  ),
                                ),
                            },
                            {
                              label: "Remove Folders",
                              variant: "destructive",
                              onClick: () =>
                                Dialog.confirm({
                                  title: `Remove ${organization.selected.length} Folders`,
                                  description:
                                    "The folders and their subfolders are removed. Your Saves stay in the Library.",
                                  confirmLabel: "Remove",
                                  confirmVariant: "destructive",
                                  onConfirm: async () => {
                                    const roots = organization.selected.filter(
                                      (id) =>
                                        !organization.selected.some(
                                          (other) =>
                                            other !== id &&
                                            folderIdsForExport(
                                              other,
                                              folderRows,
                                              true,
                                            ).includes(id),
                                        ),
                                    );
                                    for (const id of roots)
                                      await window.pond.query(
                                        "folders.delete",
                                        {
                                          id,
                                          trashContainedSaves: false,
                                        },
                                      );
                                    await folders.refresh();
                                  },
                                }),
                            },
                            {
                              label: "Export Files",
                              onClick: () =>
                                void exportFolderFiles([
                                  ...new Set(
                                    organization.selected.flatMap((id) =>
                                      folderIdsForExport(
                                        id,
                                        folderRows,
                                        includeSubfolders,
                                      ),
                                    ),
                                  ),
                                ]),
                            },
                            {
                              label: "Export to CSV",
                              onClick: () =>
                                void exportFolderCsv([
                                  ...new Set(
                                    organization.selected.flatMap((id) =>
                                      folderIdsForExport(
                                        id,
                                        folderRows,
                                        includeSubfolders,
                                      ),
                                    ),
                                  ),
                                ]),
                            },
                          ]
                        : undefined
                    }
                    collapsed={tree.collapsed.has(folder.id)}
                    count={counts.folders[folder.id] ?? 0}
                    badgeStyle={sidebar.badgeStyle}
                    creating={creatingFolder}
                    depth={depth}
                    editing={editingFolderId === folder.id}
                    exportIds={folderIdsForExport(
                      folder.id,
                      folderRows,
                      includeThisFolder,
                    )}
                    folder={folder}
                    folderDrop={drag.folderDrop}
                    folderIcon={presentation?.icon}
                    folderSortDir={presentation?.sortDir ?? "desc"}
                    folderSortKey={presentation?.sortKey ?? "savedAt"}
                    hasChildren={tree.parentIds.has(folder.id)}
                    includeSubfolders={includeThisFolder}
                    nav={nav}
                    quickAccess={presentation?.quickAccess ?? false}
                    quickAccessFolderIds={quickFolders.map((entry) => entry.id)}
                    sameLevelHasChildren={folderRows.some(
                      (row) =>
                        row.parentId === folder.parentId &&
                        tree.parentIds.has(row.id),
                    )}
                    viewing={viewing}
                    dragHandlers={drag.handlersFor(folder)}
                    dragging={activeFolderId === folder.id}
                    coverSaveId={presentation?.coverSaveId}
                    onCreateFolder={(parentId) => void createFolder(parentId)}
                    onCustomize={() => setCustomizingFolderId(folder.id)}
                    onFinishEditing={() => folders.finishEditing(folder.id)}
                    onOpenTool={setFolderTool}
                    onStartEditing={folders.startEditing}
                    onToggleAll={tree.toggleAllFolders}
                    onToggleFolder={() => tree.toggleFolder(folder.id)}
                    doubleClickBehavior={sidebar.doubleClickBehavior}
                    onToggleSameLevel={(expanded) =>
                      tree.toggleSameLevel(folder.parentId, expanded)
                    }
                  />
                );
              })}
            </Sidebar.CollapsibleGroupContent>
          </SortableContext>
          {createPortal(
            <DragOverlay
              dropAnimation={
                reduceMotion || keyboardDrag ? null : SORTABLE_DROP_ANIMATION
              }
              modifiers={[restrictToVerticalAxis]}
            >
              {activeFolder ? (
                <div className={styles["folder-overlay"]}>
                  <Row
                    label={activeFolder.name}
                    icon={
                      <span
                        style={
                          activeFolder.color
                            ? {
                                color: folderColorCss(activeFolder.color),
                              }
                            : undefined
                        }
                      >
                        <FolderCover
                          icon={activeFolderPresentation?.icon}
                          coverSaveId={activeFolderPresentation?.coverSaveId}
                        />
                      </span>
                    }
                    status={
                      organization.selected.includes(activeFolder.id) &&
                      organization.selected.length > 1
                        ? `${organization.selected.length} folders`
                        : undefined
                    }
                    active={
                      libraryPage &&
                      nav.kind === "folder" &&
                      nav.id === activeFolder.id
                    }
                    badgeStyle={sidebar.badgeStyle}
                    count={
                      activeFolderCount > 0 &&
                      (tree.collapsed.has(activeFolder.id) ||
                        !activeFolderHasChildren)
                        ? activeFolderCount
                        : undefined
                    }
                    depth={activeFolderDepth}
                    tabIndex={-1}
                  />
                </div>
              ) : null}
            </DragOverlay>,
            document.body,
          )}
        </DndContext>
      </Sidebar.CollapsibleGroup>
      {folderTool ? (
        <FolderToolsDialog
          tool={folderTool}
          key={`${folderTool.kind}:${folderTool.id}`}
          onClose={() => setFolderTool(null)}
        />
      ) : null}
      {customizingFolder ? (
        <FolderCustomizeDialog
          key={customizingFolder.id}
          folder={customizingFolder}
          folderIcon={folderViews[customizingFolder.id]?.icon}
          onClose={() => setCustomizingFolderId(null)}
        />
      ) : null}
    </>
  );
}

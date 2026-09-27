import { IconDotsFill12 } from "@pond/icons/fill/12";
import { IconChevronRightOutline12 } from "@pond/icons/outline/12";
import {
  IconBarsFilterOutline18,
  IconColorPaletteOutline18,
  IconDuplicateOutline18,
  IconExportOutline18,
  IconFileExportOutline18,
  IconFolderSearchOutline18,
  IconGridOutline18,
  IconGridPlusOutline18,
  IconLink2Outline18,
  IconMoveObjDownOutline18,
  IconMoveObjUpOutline18,
  IconPencilOutline18,
  IconPlusOutline18,
  IconQuickAccessOutline18,
  IconRefreshOutline18,
  IconRenameOutline18,
  IconShapesOutline18,
  IconTableOutline18,
  IconTrash2Outline18,
  IconVersionsOutline18,
  IconViewPlusSignOutline18,
} from "@pond/icons/outline/18";
import type { Prefs } from "@pond/schema";
import type { SavedView } from "@pond/schema/db";
import { EMPTY_QUERY, type Query } from "@pond/schema/filters/types";
import {
  Button,
  cssVars,
  Dialog,
  Menu,
  type MenuItemSpec,
  Sidebar,
} from "@pond/ui";
import { librarySavedViewLink } from "@shared/library-links";
import { useSelector } from "@tanstack/react-store";
import { useId, useMemo, useState } from "react";
import { filterToolbar } from "@/features/library/components/filter-menu/toolbar-state";
import {
  combineQueries,
  groupMoveChoices,
  inheritedQueryFor,
  selectedViewRoots,
} from "@/features/library/lib/smart-folders";
import { useFolders } from "@/features/library/state/folders";
import { openOrganizationRenameDialog } from "@/features/library/state/organization-rename-dialog";
import { saveSavedViewPresentation } from "@/features/library/state/saved-view-presentation";
import {
  savedViews,
  useSavedViews,
} from "@/features/library/state/saved-views";
import { useViewStore } from "@/features/library/state/view-store";
import {
  exportSelectionCsv,
  exportSelectionFiles,
} from "@/features/saves/lib/selection";
import { savesStore } from "@/features/saves/state/pool";
import { usePrefs } from "@/features/settings/state/prefs";
import { useTags } from "@/features/tags/state/tags";
import { InlineNameEditor } from "@/shared/components/inline-name-editor";
import {
  SpecContextMenu,
  SpecMenu,
} from "@/shared/components/spec-context-menu/spec-context-menu";
import { notify } from "@/shared/lib/toast";
import { useOrganizationTree } from "../../hooks/use-organization-tree";
import { resetFilters, setQuery } from "../../state/view-store";
import {
  FOLDER_ICONS,
  FOLDER_SWATCHES,
  FolderIcon,
  folderColorCss,
} from "../folder-sidebar/folder-icons";
import { selectLibraryNav } from "../folder-sidebar/navigation";
import { RuleDialog } from "./rule-dialog";
import { newRule } from "./rule-editor";
import styles from "./styles.module.css";

type EditorRequest =
  | {
      mode: "create";
      kind: "smart_folder" | "group";
      parentId: string | null;
      onSaved: () => void;
    }
  | { mode: "edit"; view: SavedView };

type OpenEditor = (request: EditorRequest) => void;
type SavedViewPresentation = Prefs["savedViewViews"][string];

async function countMatches(query: Query): Promise<number> {
  const result = await window.pond.query("saves.queryCount", { query });
  return result.count;
}

const ENTRY_TYPES = {
  smart_folder: { label: "Smart Folder", icon: IconFolderSearchOutline18 },
  group: { label: "Group", icon: IconGridOutline18 },
  saved_view: { label: "Saved View", icon: IconVersionsOutline18 },
} satisfies Record<
  SavedView["kind"],
  { label: string; icon: React.ComponentType }
>;

const CREATE_ENTRY_ICONS = {
  smart_folder: IconFolderSearchOutline18,
  group: IconGridPlusOutline18,
  saved_view: IconViewPlusSignOutline18,
} satisfies Record<SavedView["kind"], React.ComponentType>;

async function runAction(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    notify({
      id: "smart-folders-action",
      title: "Couldn't update Smart Folders",
      description: error instanceof Error ? error.message : "Try again.",
    });
  }
}

function creationItems(
  parentId: string | null,
  onCreated: () => void,
  openEditor: OpenEditor,
  onStartRenaming: (id: string) => void,
): MenuItemSpec[] {
  const kinds: SavedView["kind"][] = ["smart_folder", "group", "saved_view"];
  return kinds.map((kind) => {
    const { label } = ENTRY_TYPES[kind];
    const Icon = CREATE_ENTRY_ICONS[kind];
    return {
      label: `New ${label}`,
      icon: <Icon />,
      onClick: () => {
        if (kind !== "saved_view") {
          openEditor({ mode: "create", kind, parentId, onSaved: onCreated });
          return;
        }
        void runAction(async () => {
          const view = await savedViews.create({
            name: "Untitled",
            kind,
            parentId,
          });
          onCreated();
          onStartRenaming(view.id);
        });
      },
    };
  });
}

interface EntryActions {
  view: SavedView;
  views: SavedView[];
  active: boolean;
  onSelect: () => void;
  onCreated: () => void;
  onRename: () => void;
  onStartRenaming: (id: string) => void;
  openEditor: OpenEditor;
  presentation: SavedViewPresentation;
  quickAccessIds: string[];
}

async function saveIdsForView(
  view: SavedView,
  views: SavedView[],
): Promise<string[]> {
  const result = await window.pond.query("saves.queryIds", {
    query: combineQueries([inheritedQueryFor(view, views), view.query]),
  });
  return result.ids;
}

async function moveSavedViewQuickAccess(
  id: string,
  ids: string[],
  offset: -1 | 1,
): Promise<void> {
  const current = ids.indexOf(id);
  const target = current + offset;
  if (current < 0 || target < 0 || target >= ids.length) return;
  const ordered = [...ids];
  const [moved] = ordered.splice(current, 1);
  if (!moved) return;
  ordered.splice(target, 0, moved);
  await Promise.all(
    ordered.map((viewId, quickAccessOrder) =>
      saveSavedViewPresentation(viewId, { quickAccessOrder }),
    ),
  );
}

function entryItems({
  view,
  views,
  active,
  onSelect,
  onCreated,
  onRename,
  onStartRenaming,
  openEditor,
  presentation,
  quickAccessIds,
}: EntryActions): MenuItemSpec[] {
  const { label } = ENTRY_TYPES[view.kind];
  const quickAccessIndex = quickAccessIds.indexOf(view.id);
  return [
    ...(view.kind === "group"
      ? [
          ...creationItems(view.id, onCreated, openEditor, onStartRenaming),
          { type: "separator" as const },
        ]
      : []),
    {
      label: "Edit Filters",
      icon: <IconBarsFilterOutline18 />,
      onClick: () => {
        if (view.kind !== "saved_view") {
          openEditor({ mode: "edit", view });
          return;
        }
        if (!active) onSelect();
        filterToolbar.setOpen(true);
      },
    },
    {
      label: view.kind === "saved_view" ? "Update Saved View" : "Save Filters",
      icon: <IconVersionsOutline18 />,
      disabled: !active,
      onClick: () => void runAction(() => savedViews.updateCurrent(view.id)),
    },
    {
      label: "Refresh",
      icon: <IconRefreshOutline18 />,
      onClick: () => void runAction(() => savedViews.refresh()),
    },
    {
      label: "Duplicate",
      icon: <IconDuplicateOutline18 />,
      onClick: () =>
        void runAction(async () => {
          const copy = await savedViews.duplicate(view.id);
          if (presentation.icon || presentation.color) {
            await saveSavedViewPresentation(copy.id, {
              icon: presentation.icon,
              color: presentation.color,
            });
          }
          onStartRenaming(copy.id);
        }),
    },
    {
      type: "submenu",
      label: "Export",
      icon: <IconExportOutline18 />,
      items: [
        {
          label: "Export Files",
          icon: <IconFileExportOutline18 />,
          onClick: () =>
            void runAction(async () => {
              const ids = await saveIdsForView(view, views);
              await exportSelectionFiles(ids);
            }),
        },
        {
          label: "Export to CSV",
          icon: <IconTableOutline18 />,
          onClick: () =>
            void runAction(async () => {
              const ids = await saveIdsForView(view, views);
              await exportSelectionCsv(ids);
            }),
        },
      ],
    },
    {
      type: "checkbox",
      label: "Quick Access",
      icon: <IconQuickAccessOutline18 />,
      checked: presentation.quickAccess ?? false,
      onCheckedChange: (quickAccess) =>
        void saveSavedViewPresentation(view.id, {
          quickAccess,
          quickAccessOrder: quickAccess ? quickAccessIds.length : undefined,
        }),
    },
    {
      label: "Move Up in Quick Access",
      icon: <IconMoveObjUpOutline18 />,
      hidden: !presentation.quickAccess || quickAccessIndex <= 0,
      onClick: () => void moveSavedViewQuickAccess(view.id, quickAccessIds, -1),
    },
    {
      label: "Move Down in Quick Access",
      icon: <IconMoveObjDownOutline18 />,
      hidden:
        !presentation.quickAccess ||
        quickAccessIndex < 0 ||
        quickAccessIndex >= quickAccessIds.length - 1,
      onClick: () => void moveSavedViewQuickAccess(view.id, quickAccessIds, 1),
    },
    {
      type: "submenu",
      label: "Icon",
      icon: <IconShapesOutline18 />,
      items: FOLDER_ICONS.map((option) => ({
        type: "checkbox",
        label: option.label,
        icon: <option.Icon />,
        checked: presentation.icon === option.id,
        onCheckedChange: () =>
          void saveSavedViewPresentation(view.id, { icon: option.id }),
      })),
    },
    {
      type: "submenu",
      label: "Color",
      icon: <IconColorPaletteOutline18 />,
      items: FOLDER_SWATCHES.map((option) => ({
        type: "checkbox",
        label: option.label,
        icon: (
          <span
            aria-hidden
            className={styles.colorSwatch}
            style={{ backgroundColor: option.css }}
          />
        ),
        checked: (presentation.color ?? null) === option.id,
        onCheckedChange: () =>
          void saveSavedViewPresentation(view.id, { color: option.id }),
      })),
    },
    {
      label: "Rename",
      icon: <IconPencilOutline18 />,
      onClick: onRename,
    },
    {
      label: "Batch Rename Smart Folders",
      icon: <IconRenameOutline18 />,
      onClick: () => openOrganizationRenameDialog("saved-views", view.id),
    },
    {
      label: "Copy Link",
      icon: <IconLink2Outline18 />,
      onClick: () => {
        void window.pond
          .query("clipboard.writeText", {
            text: librarySavedViewLink(window.pond.pondId(), view.id),
          })
          .then(() => notify({ id: "saved-view-link", title: "Link copied" }));
      },
    },
    {
      type: "submenu",
      label: "Move to Group",
      icon: <IconGridOutline18 />,
      items: [
        {
          label: "Smart Folders",
          icon: <IconFolderSearchOutline18 />,
          disabled: view.parentId === null,
          onClick: () => void runAction(() => savedViews.move(view.id, null)),
        },
        ...groupMoveChoices(view.id, views).map((group) => ({
          label: group.name,
          icon: <IconGridOutline18 />,
          disabled: view.parentId === group.id,
          onClick: () =>
            void runAction(() => savedViews.move(view.id, group.id)),
        })),
      ],
    },
    { type: "separator" },
    {
      label: "Delete",
      icon: <IconTrash2Outline18 />,
      variant: "destructive",
      onClick: () =>
        Dialog.confirm({
          title: `Delete ${label}`,
          description:
            view.kind === "group"
              ? "Entries in this group move up one level. Your Saves stay."
              : "The entry is removed. Your Saves stay.",
          confirmLabel: "Delete",
          confirmVariant: "destructive",
          onConfirm: () => savedViews.remove(view.id),
        }),
    },
  ];
}

interface EntryProps {
  organization: ReturnType<typeof useOrganizationTree>;
  view: SavedView;
  views: SavedView[];
  childrenByParent: Map<string | null, SavedView[]>;
  activeId: string | null;
  onSelect: () => void;
  depth: number;
  editingViewId: string | null;
  onFinishRenaming: () => void;
  onStartRenaming: (id: string) => void;
  openEditor: OpenEditor;
  presentations: Record<string, SavedViewPresentation>;
  quickAccessIds: string[];
}

function SmartFolderEntry({
  organization,
  view,
  views,
  childrenByParent,
  activeId,
  onSelect,
  depth,
  editingViewId,
  onFinishRenaming,
  onStartRenaming,
  openEditor,
  presentations,
  quickAccessIds,
}: EntryProps) {
  const [open, setOpen] = useState(true);
  const childrenId = useId();
  const active = activeId === view.id;
  const isGroup = view.kind === "group";
  const renaming = editingViewId === view.id;
  const children = childrenByParent.get(view.id) ?? [];
  const { label, icon: Icon } = ENTRY_TYPES[view.kind];
  const presentation = presentations[view.id] ?? {};
  const color = folderColorCss(presentation.color);
  const select = () => {
    savedViews.select(view.id);
    onSelect();
  };
  const selectedViews = views.filter((entry) =>
    organization.selected.includes(entry.id),
  );
  const moveRoots = selectedViewRoots(organization.selected, views);
  const items = (): MenuItemSpec[] =>
    selectedViews.length > 1 && organization.selected.includes(view.id)
      ? [
          {
            label: "Batch Rename Smart Folders",
            onClick: () =>
              openOrganizationRenameDialog(
                "saved-views",
                organization.selected,
              ),
          },
          {
            type: "submenu",
            label: "Move to Group",
            items: [
              {
                label: "Smart Folders",
                onClick: () =>
                  void runAction(async () => {
                    for (const entry of moveRoots)
                      await savedViews.move(entry.id, null);
                  }),
              },
              ...views
                .filter(
                  (group) =>
                    group.kind === "group" &&
                    selectedViews.every((entry) =>
                      groupMoveChoices(entry.id, views).some(
                        (choice) => choice.id === group.id,
                      ),
                    ),
                )
                .map((group) => ({
                  label: group.name,
                  onClick: () =>
                    void runAction(async () => {
                      for (const entry of moveRoots)
                        await savedViews.move(entry.id, group.id);
                    }),
                })),
            ],
          },
          {
            label: "Export Files",
            onClick: () =>
              void runAction(async () => {
                const ids = [
                  ...new Set(
                    (
                      await Promise.all(
                        selectedViews.map((entry) =>
                          saveIdsForView(entry, views),
                        ),
                      )
                    ).flat(),
                  ),
                ];
                await exportSelectionFiles(ids);
              }),
          },
          {
            label: "Export to CSV",
            onClick: () =>
              void runAction(async () => {
                const ids = [
                  ...new Set(
                    (
                      await Promise.all(
                        selectedViews.map((entry) =>
                          saveIdsForView(entry, views),
                        ),
                      )
                    ).flat(),
                  ),
                ];
                await exportSelectionCsv(ids);
              }),
          },
          {
            label: "Delete",
            variant: "destructive",
            onClick: () =>
              Dialog.confirm({
                title: `Delete ${selectedViews.length} Entries`,
                description:
                  "Your Saves stay in the Library. Entries inside deleted Groups move up one level.",
                confirmLabel: "Delete",
                confirmVariant: "destructive",
                onConfirm: async () => {
                  for (const entry of selectedViews.toSorted(
                    (a, b) =>
                      Number(a.kind === "group") - Number(b.kind === "group"),
                  ))
                    await savedViews.remove(entry.id);
                },
              }),
          },
        ]
      : entryItems({
          view,
          views,
          active,
          onSelect: select,
          openEditor,
          onRename: () => onStartRenaming(view.id),
          onStartRenaming,
          onCreated: () => {
            setOpen(true);
            onSelect();
          },
          presentation,
          quickAccessIds,
        });

  return (
    <Sidebar.CollapsibleGroup
      className={styles.branch}
      open={open}
      onOpenChange={setOpen}
    >
      <SpecContextMenu
        search
        searchLabel="Search Smart Folder operations"
        buildItems={items}
      >
        <div className={styles.row} style={cssVars({ "--entry-depth": depth })}>
          {isGroup ? (
            <Button
              icon
              size="xs"
              variant="text"
              className={styles.disclosure}
              aria-label={`${open ? "Collapse" : "Expand"} ${view.name}`}
              aria-expanded={open}
              aria-controls={childrenId}
              tabIndex={-1}
              onClick={(event) => {
                setOpen((value) => !value);
                event.currentTarget.parentElement
                  ?.querySelector<HTMLElement>('[role="treeitem"]')
                  ?.focus();
              }}
            >
              <IconChevronRightOutline12 data-open={open || undefined} />
            </Button>
          ) : null}
          {renaming ? (
            <div className={styles.editor}>
              <Sidebar.Icon className={styles.icon}>
                <span style={color ? { color } : undefined}>
                  {presentation.icon ? (
                    <FolderIcon name={presentation.icon} />
                  ) : (
                    <Icon />
                  )}
                </span>
              </Sidebar.Icon>
              <InlineNameEditor
                name={view.name}
                className={styles.field}
                ariaLabel={`${label} name`}
                onSave={(name) => savedViews.rename(view.id, name)}
                onFinish={onFinishRenaming}
              />
            </div>
          ) : (
            <Sidebar.Item
              className={styles.item}
              data-status={
                active || organization.selected.includes(view.id)
                  ? "active"
                  : undefined
              }
              aria-current={active ? "page" : undefined}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  "application/x-pond-saved-views",
                  (organization.selected.includes(view.id)
                    ? organization.selected
                    : [view.id]
                  ).join("\n"),
                );
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                if (
                  isGroup &&
                  event.dataTransfer.types.includes(
                    "application/x-pond-saved-views",
                  )
                ) {
                  event.preventDefault();
                  event.stopPropagation();
                  event.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(event) => {
                if (!isGroup) return;
                const ids = event.dataTransfer
                  .getData("application/x-pond-saved-views")
                  .split("\n")
                  .filter(Boolean);
                if (!ids.length) return;
                event.preventDefault();
                event.stopPropagation();
                const roots = selectedViewRoots(ids, views);
                if (
                  !roots.every((entry) =>
                    groupMoveChoices(entry.id, views).some(
                      (group) => group.id === view.id,
                    ),
                  )
                )
                  return;
                void runAction(async () => {
                  for (const entry of roots)
                    await savedViews.move(entry.id, view.id);
                  setOpen(true);
                });
              }}
              {...organization.rowProps(
                view.id,
                depth,
                isGroup ? open : undefined,
                () => setOpen((value) => !value),
              )}
            >
              <Sidebar.Icon>
                <span style={color ? { color } : undefined}>
                  {presentation.icon ? (
                    <FolderIcon name={presentation.icon} />
                  ) : (
                    <Icon />
                  )}
                </span>
              </Sidebar.Icon>
              <span className={styles.name}>{view.name}</span>
            </Sidebar.Item>
          )}
          {renaming ? null : (
            <SpecMenu
              search
              searchLabel="Search Smart Folder operations"
              align="end"
              buildItems={items}
            >
              <Menu.Trigger
                icon
                size="xs"
                variant="text"
                rounding="rounded"
                className={styles.more}
                aria-label={`More Actions for ${view.name}`}
                tabIndex={-1}
              >
                <IconDotsFill12 />
              </Menu.Trigger>
            </SpecMenu>
          )}
        </div>
      </SpecContextMenu>
      {isGroup ? (
        <Sidebar.CollapsibleGroupContent
          id={childrenId}
          inert={!open}
          aria-hidden={!open}
        >
          {children.map((child) => (
            <SmartFolderEntry
              organization={organization}
              key={child.id}
              view={child}
              views={views}
              childrenByParent={childrenByParent}
              activeId={activeId}
              onSelect={onSelect}
              depth={depth + 1}
              editingViewId={editingViewId}
              onFinishRenaming={onFinishRenaming}
              onStartRenaming={onStartRenaming}
              openEditor={openEditor}
              presentations={presentations}
              quickAccessIds={quickAccessIds}
            />
          ))}
        </Sidebar.CollapsibleGroupContent>
      ) : null}
    </Sidebar.CollapsibleGroup>
  );
}
export function SmartFoldersSection({
  onSelect,
  active = true,
}: {
  onSelect: () => void;
  active?: boolean;
}) {
  const views = useSavedViews();
  const { activeViewId } = useViewStore();
  const [presentations] = usePrefs("savedViewViews");
  const [open, setOpen] = useState(true);
  const [editor, setEditor] = useState<EditorRequest | null>(null);
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const childrenByParent = useMemo(() => {
    const groups = new Set(
      views.filter((view) => view.kind === "group").map((view) => view.id),
    );
    const children = new Map<string | null, SavedView[]>();
    for (const view of views) {
      const parentId =
        view.parentId && groups.has(view.parentId) ? view.parentId : null;
      const siblings = children.get(parentId) ?? [];
      siblings.push(view);
      children.set(parentId, siblings);
    }
    return children;
  }, [views]);
  const organization = useOrganizationTree(views, (ids) => {
    if (ids.length === 1 && ids[0]) {
      savedViews.select(ids[0]);
      onSelect();
    } else if (ids.length > 1) {
      resetFilters();
      selectLibraryNav({ kind: "all" });
      setQuery({
        combinator: "or",
        rules: views
          .filter((view) => ids.includes(view.id))
          .map((view) =>
            combineQueries([inheritedQueryFor(view, views), view.query]),
          ),
      });
      onSelect();
    }
  });
  const quickAccessIds = views
    .filter((view) => presentations[view.id]?.quickAccess)
    .toSorted(
      (left, right) =>
        (presentations[left.id]?.quickAccessOrder ?? Number.MAX_SAFE_INTEGER) -
          (presentations[right.id]?.quickAccessOrder ??
            Number.MAX_SAFE_INTEGER) ||
        left.sortOrder - right.sortOrder ||
        left.name.localeCompare(right.name),
    )
    .map((view) => view.id);
  const items = () =>
    creationItems(
      null,
      () => {
        setOpen(true);
        onSelect();
      },
      setEditor,
      setEditingViewId,
    );

  return (
    <>
      <Sidebar.CollapsibleGroup open={open} onOpenChange={setOpen}>
        <SpecContextMenu
          search
          searchLabel="Search Smart Folder operations"
          buildItems={items}
        >
          <Sidebar.GroupHeader>
            <Sidebar.CollapsibleGroupLabel>
              Smart Folders
            </Sidebar.CollapsibleGroupLabel>
            {organization.selected.length > 1 ? (
              <Sidebar.Count aria-live="polite">
                {organization.selected.length} selected
              </Sidebar.Count>
            ) : null}
            <Menu.Root>
              <Menu.Trigger
                icon
                size="sm"
                variant="ghost"
                aria-label="New Smart Folder, Group, or Saved View"
              >
                <IconPlusOutline18 />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner align="start" side="bottom">
                  <Menu.Popup>
                    <Menu.Items items={items()} />
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </Sidebar.GroupHeader>
        </SpecContextMenu>
        <Sidebar.CollapsibleGroupContent
          ref={organization.root}
          role="tree"
          aria-label="Smart Folders"
          aria-multiselectable
          inert={!open}
          aria-hidden={!open}
        >
          {(childrenByParent.get(null) ?? []).map((view) => (
            <SmartFolderEntry
              organization={organization}
              key={view.id}
              view={view}
              views={views}
              childrenByParent={childrenByParent}
              activeId={active ? activeViewId : null}
              onSelect={onSelect}
              depth={0}
              editingViewId={editingViewId}
              onFinishRenaming={() => setEditingViewId(null)}
              onStartRenaming={setEditingViewId}
              openEditor={setEditor}
              presentations={presentations}
              quickAccessIds={quickAccessIds}
            />
          ))}
        </Sidebar.CollapsibleGroupContent>
      </Sidebar.CollapsibleGroup>
      {editor ? (
        <SmartFolderEditor
          request={editor}
          views={views}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </>
  );
}
function SmartFolderEditor({
  request,
  views,
  onClose,
}: {
  request: EditorRequest;
  views: SavedView[];
  onClose: () => void;
}) {
  const libraryRevision = useSelector(savesStore, (state) => state.revision);
  const folders = useFolders();
  const tags = useTags();
  const view = request.mode === "edit" ? request.view : null;
  const parentId =
    request.mode === "edit" ? request.view.parentId : request.parentId;
  const parent = views.find((entry) => entry.id === parentId);
  const inheritedQuery = useMemo(
    () =>
      parent
        ? combineQueries([inheritedQueryFor(parent, views), parent.query])
        : EMPTY_QUERY,
    [parent, views],
  );
  const initialQuery = useMemo<Query>(
    () => view?.query ?? { combinator: "or", rules: [newRule()] },
    [view],
  );
  return (
    <RuleDialog
      libraryRevision={libraryRevision}
      kind={
        view?.kind === "group" ||
        (request.mode === "create" && request.kind === "group")
          ? "group"
          : "smart_folder"
      }
      name={view?.name}
      editing={request.mode === "edit"}
      query={initialQuery}
      inheritedQuery={inheritedQuery}
      parentName={parent?.name}
      choices={{
        folders: folders.map((folder) => ({
          value: folder.id,
          label: folder.name,
        })),
        tags: tags.map((tag) => ({ value: tag.name, label: tag.name })),
      }}
      count={countMatches}
      onClose={onClose}
      onSave={async (name, query) => {
        if (request.mode === "edit")
          await savedViews.edit(request.view.id, name, query);
        else {
          await savedViews.create({
            name,
            query,
            kind: request.kind,
            parentId: request.parentId,
          });
          request.onSaved();
        }
      }}
    />
  );
}

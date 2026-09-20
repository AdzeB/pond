import { IconDotsFill12 } from "@pond/icons/fill/12";
import { IconChevronRightOutline12 } from "@pond/icons/outline/12";
import {
  IconBarsFilterOutline18,
  IconFolderSearchOutline18,
  IconGridOutline18,
  IconLink2Outline18,
  IconPencilOutline18,
  IconPlusOutline18,
  IconTrash2Outline18,
  IconVersionsOutline18,
} from "@pond/icons/outline/18";
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
} from "@/features/library/lib/smart-folders";
import { useFolders } from "@/features/library/state/folders";
import { openOrganizationRenameDialog } from "@/features/library/state/organization-rename-dialog";
import {
  savedViews,
  useSavedViews,
} from "@/features/library/state/saved-views";
import { useViewStore } from "@/features/library/state/view-store";
import { savesStore } from "@/features/saves/state/pool";
import { useTags } from "@/features/tags/state/tags";
import { InlineNameEditor } from "@/shared/components/inline-name-editor";
import {
  SpecContextMenu,
  SpecMenu,
} from "@/shared/components/spec-context-menu/spec-context-menu";
import { notify } from "@/shared/lib/toast";
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
    const { label, icon: Icon } = ENTRY_TYPES[kind];
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
}: EntryActions): MenuItemSpec[] {
  const { label } = ENTRY_TYPES[view.kind];
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
      label: "Rename",
      icon: <IconPencilOutline18 />,
      onClick: onRename,
    },
    {
      label: "Batch Rename Smart Folders",
      icon: <IconPencilOutline18 />,
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
          disabled: view.parentId === null,
          onClick: () => void runAction(() => savedViews.move(view.id, null)),
        },
        ...groupMoveChoices(view.id, views).map((group) => ({
          label: group.name,
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
}

function SmartFolderEntry({
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
}: EntryProps) {
  const [open, setOpen] = useState(true);
  const childrenId = useId();
  const active = activeId === view.id;
  const isGroup = view.kind === "group";
  const renaming = editingViewId === view.id;
  const children = childrenByParent.get(view.id) ?? [];
  const { label, icon: Icon } = ENTRY_TYPES[view.kind];
  const select = () => {
    savedViews.select(view.id);
    onSelect();
  };
  const items = () =>
    entryItems({
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
              onClick={() => setOpen((value) => !value)}
            >
              <IconChevronRightOutline12 data-open={open || undefined} />
            </Button>
          ) : null}
          {renaming ? (
            <div className={styles.editor}>
              <Sidebar.Icon className={styles.icon}>
                <Icon />
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
              data-status={active ? "active" : undefined}
              aria-current={active ? "page" : undefined}
              onClick={select}
            >
              <Sidebar.Icon>
                <Icon />
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
                variant="ghost"
                rounding="rounded"
                className={styles.more}
                aria-label={`More Actions for ${view.name}`}
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
        <Sidebar.CollapsibleGroupContent inert={!open} aria-hidden={!open}>
          {(childrenByParent.get(null) ?? []).map((view) => (
            <SmartFolderEntry
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

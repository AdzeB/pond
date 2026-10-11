import {
  IconBarsFilterOutline18,
  IconColorPaletteOutline18,
  IconDuplicateOutline18,
  IconExportOutline18,
  IconFaceSmileOutline18,
  IconFileExportOutline18,
  IconFolderSearchOutline18,
  IconGridOutline18,
  IconGridPlusOutline18,
  IconLink2Outline18,
  IconMoveObjDownOutline18,
  IconMoveObjUpOutline18,
  IconPencilOutline18,
  IconQuickAccessOutline18,
  IconRefreshOutline18,
  IconRenameOutline18,
  IconTableOutline18,
  IconTrash2Outline18,
  IconVersionsOutline18,
  IconViewPlusSignOutline18,
} from "@pond/icons/outline/18";
import type { SavedView } from "@pond/schema/db";
import { Chip, type MenuItemSpec } from "@pond/ui";
import { librarySavedViewLink } from "@shared/library-links";
import { filterToolbar } from "@/features/library/components/filter-menu/toolbar-state";
import {
  combineQueries,
  groupMoveChoices,
  inheritedQueryFor,
} from "@/features/library/lib/smart-folders";
import { openOrganizationRenameDialog } from "@/features/library/state/organization-rename-dialog";
import { saveSavedViewPresentation } from "@/features/library/state/saved-view-presentation";
import { savedViews } from "@/features/library/state/saved-views";
import { exportSelectionCsv, exportSelectionFiles } from "@/features/saves";
import { errorCopy } from "@/shared/lib/error-copy";
import { FOLDER_MENU_ICONS, FOLDER_SWATCHES } from "@/shared/lib/folder-icons";
import { notify } from "@/shared/lib/toast";
import type { OpenEditor, SavedViewPresentation } from "./types";

interface EntryType {
  label: string;
  icon: React.ComponentType;
}

type EntryTypes = { [Kind in SavedView["kind"]]: EntryType };

export const ENTRY_TYPES: EntryTypes = {
  smart_folder: { label: "Smart Folder", icon: IconFolderSearchOutline18 },
  group: { label: "Group", icon: IconGridOutline18 },
  saved_view: { label: "Saved View", icon: IconVersionsOutline18 },
};

const CREATE_ENTRY_ICONS = {
  smart_folder: IconFolderSearchOutline18,
  group: IconGridPlusOutline18,
  saved_view: IconViewPlusSignOutline18,
} satisfies Record<SavedView["kind"], React.ComponentType>;

export async function runAction(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    notify({
      id: "smart-folders-action",
      title: "Couldn't update Smart Folders",
      description: errorCopy(error, "Try again."),
    });
  }
}

export function creationItems(
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

export async function saveIdsForView(
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

export function entryItems({
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
      icon: <IconFaceSmileOutline18 />,
      items: FOLDER_MENU_ICONS.map((option) => ({
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
        icon: <Chip.Swatch color={option.css} />,
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
            text: librarySavedViewLink(window.pond.libraryId(), view.id),
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
      onClick: () => {
        void savedViews.remove(view.id);
      },
    },
  ];
}

import { IconFolderFill18 as Folder } from "@pond/icons/fill/18";
import {
  IconFolderOutline18 as AddToGroup,
  IconArrowRightOutline18 as ArrowRight,
  IconBarsFilterOutline18 as Filter,
  IconMagnifierOutline18 as Magnifier,
  IconPencilOutline18 as Pencil,
  IconMinusOutline18 as RemoveFromGroup,
  IconStarOutline18 as Star,
  IconTrash2Outline18 as Trash,
} from "@pond/icons/outline/18";
import { ContextMenu, type MenuItemSpec } from "@pond/ui";
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useState,
} from "react";
import { z } from "zod";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import styles from "./context-menu.module.css";

const ICON = { width: 16, height: 16 } as const;

export interface TagMenuActions {
  groups: string[];
  inGroup: string | null;
  starred: boolean;
  onFilter: () => void;
  onSetStarred: (starred: boolean) => void;
  onAddToGroup: (group: string) => void;
  onMoveToGroup: (group: string) => void;
  onRemoveFromGroup: () => void;
  onRename: () => void;
  onRemove: () => void;
}

function groupItems(
  groups: string[],
  onSelect: (group: string) => void,
): MenuItemSpec[] {
  return groups.map((group) => ({
    label: group,
    icon: <Folder {...ICON} />,
    onClick: () => onSelect(group),
  }));
}

export function buildTagMenuItems(a: TagMenuActions): MenuItemSpec[] {
  const targets = a.groups.filter((group) => group !== a.inGroup);

  return [
    {
      label: "Filter Items with the Tag(s)",
      icon: <Filter {...ICON} />,
      onClick: a.onFilter,
    },
    { type: "separator" },
    {
      label: "Add to Starred",
      icon: <Star {...ICON} />,
      disabled: a.starred,
      onClick: () => a.onSetStarred(true),
    },
    {
      label: "Remove from Starred",
      icon: <Star {...ICON} />,
      disabled: !a.starred,
      onClick: () => a.onSetStarred(false),
    },
    {
      label: "Rename Tag",
      icon: <Pencil {...ICON} />,
      shortcut: shortcutGlyphs("tags.rename"),
      onClick: a.onRename,
    },
    { type: "separator" },
    {
      type: "submenu",
      label: "Add to Group…",
      icon: <AddToGroup {...ICON} />,
      disabled: targets.length === 0,
      items: groupItems(targets, a.onAddToGroup),
    },
    {
      type: "submenu",
      label: "Move to Group…",
      icon: <ArrowRight {...ICON} />,
      disabled: !a.inGroup || targets.length === 0,
      items: groupItems(targets, a.onMoveToGroup),
    },
    {
      label: "Remove from this Group",
      icon: <RemoveFromGroup {...ICON} />,
      disabled: !a.inGroup,
      onClick: a.onRemoveFromGroup,
    },
    { type: "separator" },
    {
      label: "Remove tag",
      icon: <Trash {...ICON} />,
      onClick: a.onRemove,
    },
  ];
}

function labelText(label: ReactNode): string {
  return z.string().catch("").parse(label);
}

function filterItems(items: MenuItemSpec[], query: string): MenuItemSpec[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;

  return items.flatMap<MenuItemSpec>((item) => {
    if (item.type === "separator" || item.type === "custom") return [item];
    if (item.type === "group") {
      const children = filterItems(item.items, needle);
      return children.length > 0 ? [{ ...item, items: children }] : [];
    }
    if (item.type === "submenu") {
      if (labelText(item.label).toLowerCase().includes(needle)) return [item];
      const children = filterItems(item.items, needle);
      return children.length > 0 ? [{ ...item, items: children }] : [];
    }
    return labelText(item.label).toLowerCase().includes(needle) ? [item] : [];
  });
}

interface PopupStyle extends CSSProperties {
  "--popup-width": string;
  "--popup-min-width": string;
}

const POPUP_STYLE: PopupStyle = {
  "--popup-width": "292px",
  "--popup-min-width": "292px",
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest('input, textarea, [contenteditable="true"]') != null;
}

export function TagContextMenu({
  buildItems,
  children,
}: {
  buildItems: () => MenuItemSpec[];
  children: ReactElement;
}) {
  const [search, setSearch] = useState("");
  const filtered = filterItems(buildItems(), search);

  return (
    <ContextMenu.Root
      onOpenChange={(open, eventDetails) => {
        if (!open) {
          setSearch("");
          return;
        }
        if (isEditableTarget(eventDetails.event?.target ?? null)) {
          eventDetails.cancel();
        }
      }}
    >
      <ContextMenu.Trigger render={children} />
      <ContextMenu.Portal>
        <ContextMenu.Positioner style={POPUP_STYLE}>
          <ContextMenu.Popup className={styles.popup}>
            <label className={styles.search}>
              <Magnifier aria-hidden="true" />
              <input
                type="search"
                value={search}
                placeholder="Search…"
                aria-label="Search tag operations"
                spellCheck={false}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key.length === 1 &&
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.altKey
                  ) {
                    event.stopPropagation();
                  }
                }}
              />
            </label>
            <ContextMenu.Separator />
            {filtered.some((item) => item.type !== "separator") ? (
              <ContextMenu.Items items={filtered} />
            ) : (
              <ContextMenu.Item disabled>
                <ContextMenu.ItemLabel>
                  No matching operations
                </ContextMenu.ItemLabel>
              </ContextMenu.Item>
            )}
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

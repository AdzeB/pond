import { Menu } from "@pond/ui";
import { createContext, use, useCallback, useMemo, useState } from "react";
import { type TagGroupRow, useTagGroups } from "@/core/data/tag-groups";
import { useTags } from "@/core/data/tags";
import type { Save } from "@/core/data/types";
import { TagMenu } from "@/features/tags/menus/tag-menu";

type PopoverAnchor = Element | null | (() => Element | null) | undefined;

export type TagPickerTarget =
  | { kind: "save"; save: Save }
  | { kind: "group"; group: TagGroupRow };

interface TagPickerContextValue {
  target: TagPickerTarget;
}

const TagPickerContext = createContext<TagPickerContextValue | null>(null);

function useTagPickerContext(): TagPickerContextValue {
  const ctx = use(TagPickerContext);
  if (!ctx) {
    throw new Error("TagPicker.* must be used inside <TagPicker.Root>");
  }
  return ctx;
}

interface RootProps {
  target: TagPickerTarget;
  /** Force the picker open from a keyboard shortcut. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

function Root({
  target,
  open: controlledOpen,
  onOpenChange,
  children,
}: RootProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;

  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <TagPickerContext.Provider value={{ target }}>
      <Menu.Root open={open} onOpenChange={setOpen}>
        {children}
      </Menu.Root>
    </TagPickerContext.Provider>
  );
}

const Trigger = Menu.Trigger;

interface ContentProps {
  anchor?: PopoverAnchor;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

function Content({
  anchor,
  side = "bottom",
  align = "start",
  sideOffset = 6,
}: ContentProps) {
  const { target } = useTagPickerContext();
  const tags = useTags();
  const groups = useTagGroups();

  const liveGroup = useMemo(() => {
    if (target.kind !== "group") return null;
    return groups.find((g) => g.id === target.group.id) ?? target.group;
  }, [target, groups]);

  const tagsByLowerName = useMemo(() => {
    const map = new Map<string, (typeof tags)[number]>();
    for (const t of tags) map.set(t.name.toLowerCase(), t);
    return map;
  }, [tags]);

  const appliedSet = useMemo(() => {
    if (target.kind === "save") {
      return new Set(target.save.tags.map((t) => t.toLowerCase()));
    }
    return new Set((liveGroup?.tagNames ?? []).map((t) => t.toLowerCase()));
  }, [target, liveGroup]);

  const toggle = useCallback(
    async (rawName: string) => {
      const cleaned = rawName.trim();
      if (!cleaned) return;
      const lower = cleaned.toLowerCase();
      if (target.kind === "save") {
        const save = target.save;
        const next = appliedSet.has(lower)
          ? save.tags.filter((t) => t.toLowerCase() !== lower)
          : [...save.tags, cleaned];
        await window.pond.query("tags.setForSave", {
          saveId: save.id,
          tags: next,
        });
        return;
      }
      const groupName = (liveGroup ?? target.group).name;
      if (appliedSet.has(lower)) {
        await window.pond.query("tagGroups.removeTag", {
          tag: cleaned,
          group: groupName,
        });
        return;
      }
      if (!tagsByLowerName.has(lower)) {
        await window.pond.query("tags.create", { name: cleaned });
      }
      await window.pond.query("tagGroups.addTags", {
        tags: [cleaned],
        group: groupName,
      });
    },
    [target, liveGroup, appliedSet, tagsByLowerName],
  );

  return (
    <Menu.Portal>
      <Menu.Positioner
        anchor={anchor}
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <Menu.Popup>
          <TagMenu
            appliedKeys={appliedSet}
            onToggle={(name) => void toggle(name)}
            allowCreate
            groupsAs="submenu"
          />
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export const TagPicker = { Root, Trigger, Content };

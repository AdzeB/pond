import {
  IconPlusOutline18 as Plus,
  IconTagsOutline18 as Tags,
} from "@pond/icons/outline/18";
import { normalizeLabelName } from "@pond/schema/label-name";
import { Menu } from "@pond/ui";
import { type ReactNode, useMemo, useState } from "react";
import { colorForName } from "@/lib/tags/color";
import { useTagGroups } from "@/stores/tag-groups";
import { useTags } from "@/stores/tags";
import styles from "./styles.module.css";

interface TagMenuProps {
  appliedKeys?: ReadonlySet<string>;
  counts?: ReadonlyMap<string, number>;
  onToggle: (name: string) => void;
  allowCreate?: boolean;
  groupsAs?: "submenu" | "section";
  placeholder?: string;
  emptyLabel?: ReactNode;
}

export function TagMenu({
  appliedKeys,
  counts,
  onToggle,
  allowCreate = false,
  groupsAs = "submenu",
  placeholder = "Change or add tags…",
  emptyLabel = "No tags yet.",
}: TagMenuProps) {
  const tags = useTags();
  const groups = useTagGroups();
  const [q, setQ] = useState("");

  const needle = q.trim().toLowerCase();

  const tagsByLower = useMemo(() => {
    const map = new Map<string, (typeof tags)[number]>();
    for (const t of tags) map.set(t.name.toLowerCase(), t);
    return map;
  }, [tags]);

  const colorByLower = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tags) {
      map.set(t.name.toLowerCase(), t.color ?? colorForName(t.name));
    }
    return map;
  }, [tags]);

  const matches = useMemo(
    () => (name: string) => !needle || name.toLowerCase().includes(needle),
    [needle],
  );

  const groupedTagIds = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) for (const id of g.tagIds) set.add(id);
    return set;
  }, [groups]);

  const uncategorised = useMemo(
    () =>
      tags
        .filter((t) => !groupedTagIds.has(t.id))
        .filter((t) => matches(t.name))
        .map((t) => t.name),
    [tags, groupedTagIds, matches],
  );

  const visibleGroups = useMemo(
    () =>
      groups
        .map((g) => ({
          id: g.id,
          name: g.name,
          items: g.tagNames.filter(matches),
        }))
        /** Sections only make sense with rows; submenus stay browsable empty. */
        .filter((g) => (groupsAs === "section" ? g.items.length > 0 : true))
        .filter((g) => (needle ? g.items.length > 0 : true)),
    [groups, matches, needle, groupsAs],
  );

  const createInfo = useMemo(() => {
    if (!allowCreate) return null;
    const raw = q.trim();
    if (!raw) return null;
    const slash = raw.indexOf("/");
    if (slash >= 0) {
      const group = normalizeLabelName(raw.slice(0, slash));
      const label = normalizeLabelName(raw.slice(slash + 1));
      if (!group || !label) return null;
      return { kind: "group" as const, group, label };
    }
    const label = normalizeLabelName(raw);
    if (!label) return null;
    if (tagsByLower.has(label.toLowerCase())) return null;
    return { kind: "plain" as const, label };
  }, [allowCreate, q, tagsByLower]);

  async function commitCreate() {
    if (!createInfo) return;
    if (createInfo.kind === "group") {
      const { group, label } = createInfo;
      try {
        if (!tagsByLower.has(label.toLowerCase())) {
          await window.pond.query("tags.create", { name: label });
        }
        await window.pond.query("tagGroups.create", { name: group });
        await window.pond.query("tagGroups.addTags", {
          tags: [label],
          group,
        });
      } catch {
        /* best-effort; surface nothing on a failed create */
      }
      onToggle(label);
    } else {
      onToggle(createInfo.label);
    }
    setQ("");
  }

  function renderRow(name: string) {
    const applied = appliedKeys?.has(name.toLowerCase()) ?? false;
    const count = counts?.get(name.toLowerCase());
    const trailing =
      count != null ? (
        <Menu.SecondaryLabel className={styles.count}>
          {count}
        </Menu.SecondaryLabel>
      ) : null;
    return (
      <Menu.CheckboxItem
        key={name}
        closeOnClick
        checked={applied}
        onCheckedChange={() => onToggle(name)}
      >
        <Menu.CheckboxItemIndicator />
        <Menu.ItemIcon>
          <span
            className={styles.dot}
            style={{
              background:
                colorByLower.get(name.toLowerCase()) ?? colorForName(name),
            }}
            aria-hidden
          />
        </Menu.ItemIcon>
        <Menu.ItemLabel>{name}</Menu.ItemLabel>
        {trailing}
      </Menu.CheckboxItem>
    );
  }

  const hasRows = uncategorised.length > 0 || visibleGroups.length > 0;

  return (
    <>
      <Menu.Input
        value={q}
        placeholder={placeholder}
        autoFocus
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && createInfo) {
            e.preventDefault();
            void commitCreate();
          }
        }}
      />

      {groupsAs === "submenu" ? (
        uncategorised.length > 0 || visibleGroups.length > 0 ? (
          <Menu.Group>
            <Menu.GroupLabel>Labels</Menu.GroupLabel>
            {uncategorised.map(renderRow)}
            {visibleGroups.map((group) => (
              <Menu.SubmenuRoot key={group.id}>
                <Menu.SubmenuTrigger>
                  <Menu.ItemIcon>
                    <Tags width={14} height={14} />
                  </Menu.ItemIcon>
                  <Menu.ItemLabel>{group.name}</Menu.ItemLabel>
                </Menu.SubmenuTrigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      {group.items.length > 0 ? (
                        group.items.map(renderRow)
                      ) : (
                        <div className={styles.empty}>No tags</div>
                      )}
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.SubmenuRoot>
            ))}
          </Menu.Group>
        ) : null
      ) : (
        <>
          {visibleGroups.map((group) => (
            <Menu.Group key={group.id} className={styles.section}>
              <Menu.GroupLabel>{group.name}</Menu.GroupLabel>
              {group.items.map(renderRow)}
            </Menu.Group>
          ))}
          {uncategorised.length > 0 ? (
            <Menu.Group>
              <Menu.GroupLabel>Labels</Menu.GroupLabel>
              {uncategorised.map(renderRow)}
            </Menu.Group>
          ) : null}
        </>
      )}

      {createInfo ? (
        <Menu.Item onClick={() => void commitCreate()}>
          <Menu.ItemIcon>
            <Plus width={14} height={14} />
          </Menu.ItemIcon>
          <Menu.ItemLabel>
            {createInfo.kind === "group" ? (
              <>
                Create "{createInfo.label}" in group "{createInfo.group}"
              </>
            ) : (
              <>Create "{createInfo.label}"</>
            )}
          </Menu.ItemLabel>
        </Menu.Item>
      ) : null}

      {!hasRows && !createInfo ? (
        <div className={styles.empty}>
          {needle ? "No matches." : emptyLabel}
        </div>
      ) : null}
    </>
  );
}

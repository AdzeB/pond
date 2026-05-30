import { normalizeLabelName } from "@pond/schema/label-name";
import { Input, Kbd, Menu, Popover } from "@pond/ui";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Ellipsis,
  LayoutGrid,
  ListChecks,
  Pin,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSaves } from "@/pool/hooks";
import { usePrefs } from "@/pool/prefs";
import { type TagGroupRow, useTagGroups } from "@/pool/tag-groups";
import { useTags } from "@/pool/tags";
import type { Save } from "@/pool/types";
import styles from "./styles.module.css";

type PopoverAnchor = Element | null | (() => Element | null) | undefined;

export type TagPickerTarget =
  | { kind: "save"; save: Save }
  | { kind: "group"; group: TagGroupRow };

interface TagPickerContextValue {
  target: TagPickerTarget;
}

const TagPickerContext = createContext<TagPickerContextValue | null>(null);

function useTagPickerContext(): TagPickerContextValue {
  const ctx = useContext(TagPickerContext);
  if (!ctx) {
    throw new Error("TagPicker.* must be used inside <TagPicker.Root>");
  }
  return ctx;
}

interface TagItem {
  name: string;
  count: number;
  starred: boolean;
  applied: boolean;
}

const RECOMMENDED_CAP = 12;

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
  const [prefs] = usePrefs("tagPicker");

  const setOpen = (next: boolean) => {
    // Pinned: swallow auto-close (outside click / Escape). Unpin to close.
    if (next === false && prefs.pinned) return;
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <TagPickerContext.Provider value={{ target }}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        {children}
      </Popover.Root>
    </TagPickerContext.Provider>
  );
}

const Trigger = Popover.Trigger;

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
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [prefs, patchPrefs] = usePrefs("tagPicker");
  const tags = useTags();
  const groups = useTagGroups();
  const saves = useSaves();

  useEffect(() => {
    setQ("");
  }, []);

  const liveGroup = useMemo(() => {
    if (target.kind !== "group") return null;
    return groups.find((g) => g.id === target.group.id) ?? target.group;
  }, [target, groups]);

  const groupsByTagId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const g of groups) {
      for (const id of g.tagIds) {
        const list = map.get(id);
        if (list) list.push(g.name);
        else map.set(id, [g.name]);
      }
    }
    return map;
  }, [groups]);

  const tagsByLowerName = useMemo(() => {
    const map = new Map<string, (typeof tags)[number]>();
    for (const t of tags) map.set(t.name.toLowerCase(), t);
    return map;
  }, [tags]);

  const countsByLower = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of saves) {
      if (s.deletedAt) continue;
      for (const t of s.tags) {
        const k = t.toLowerCase();
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    return counts;
  }, [saves]);

  const appliedSet = useMemo(() => {
    if (target.kind === "save") {
      return new Set(target.save.tags.map((t) => t.toLowerCase()));
    }
    return new Set((liveGroup?.tagNames ?? []).map((t) => t.toLowerCase()));
  }, [target, liveGroup]);

  const toItem = useCallback(
    (name: string): TagItem => {
      const lowered = name.toLowerCase();
      const meta = tagsByLowerName.get(lowered);
      return {
        name: meta?.name ?? name,
        count: countsByLower.get(lowered) ?? 0,
        starred: Boolean(meta?.starred),
        applied: appliedSet.has(lowered),
      };
    },
    [tagsByLowerName, countsByLower, appliedSet],
  );

  const needle = q.trim().toLowerCase();
  const matchesNeedle = useCallback(
    (name: string): boolean => {
      if (!needle) return true;
      if (name.toLowerCase().includes(needle)) return true;
      const meta = tagsByLowerName.get(name.toLowerCase());
      if (!meta) return false;
      const memberOf = groupsByTagId.get(meta.id) ?? [];
      return memberOf.some((g) => g.toLowerCase().includes(needle));
    },
    [needle, tagsByLowerName, groupsByTagId],
  );

  const starredItems = useMemo<TagItem[]>(() => {
    if (!prefs.showStarred) return [];
    return tags
      .filter((t) => t.starred && matchesNeedle(t.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => toItem(t.name));
  }, [tags, prefs.showStarred, toItem, matchesNeedle]);

  const recentItems = useMemo<TagItem[]>(() => {
    if (!prefs.showRecently) return [];
    const seen = new Set<string>();
    return tags
      .filter((t) => t.lastUsedAt != null)
      .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
      .filter((t) => {
        const k = t.name.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return matchesNeedle(t.name);
      })
      .slice(0, 12)
      .map((t) => toItem(t.name));
  }, [tags, prefs.showRecently, toItem, matchesNeedle]);

  const recommendedItems = useMemo<TagItem[]>(() => {
    if (!prefs.showRecommended) return [];
    if (target.kind === "save") {
      const save = target.save;
      const candidates = new Map<string, number>();
      for (const s of saves) {
        if (s.deletedAt) continue;
        if (s.id === save.id) continue;
        const sameSource = s.source === save.source;
        const sameAuthor =
          Boolean(save.author) && Boolean(s.author) && s.author === save.author;
        if (!sameSource && !sameAuthor) continue;
        for (const t of s.tags) {
          const k = t.toLowerCase();
          candidates.set(k, (candidates.get(k) ?? 0) + 1);
        }
      }
      return Array.from(candidates.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, RECOMMENDED_CAP)
        .filter(([name]) => matchesNeedle(name))
        .map(([name]) => toItem(name));
    }
    return Array.from(countsByLower.entries())
      .filter(([k]) => !appliedSet.has(k))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, RECOMMENDED_CAP)
      .map(([k]) => tagsByLowerName.get(k)?.name ?? k)
      .filter((name) => matchesNeedle(name))
      .map((name) => toItem(name));
  }, [
    target,
    saves,
    countsByLower,
    appliedSet,
    tagsByLowerName,
    prefs.showRecommended,
    toItem,
    matchesNeedle,
  ]);

  interface AllTagsSection {
    key: string;
    label: string;
    collapsed: boolean;
    items: TagItem[];
    onToggleCollapsed?: () => void;
  }

  const allTagsSections = useMemo<AllTagsSection[]>(() => {
    const taggedIds = new Set<string>();
    const sections: AllTagsSection[] = [];

    for (const group of groups) {
      const items = group.tagNames
        .filter((name) => matchesNeedle(name))
        .map((name) => toItem(name));
      for (const id of group.tagIds) taggedIds.add(id);
      sections.push({
        key: `g:${group.id}`,
        label: group.name,
        collapsed: group.collapsed,
        items,
        onToggleCollapsed: () => {
          void window.pond.query("tagGroups.update", {
            name: group.name,
            patch: { collapsed: !group.collapsed },
          });
        },
      });
    }

    const uncategorisedItems = tags
      .filter((t) => !taggedIds.has(t.id))
      .filter((t) => matchesNeedle(t.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => toItem(t.name));
    if (uncategorisedItems.length > 0 || groups.length === 0) {
      sections.push({
        key: "uncategorised",
        label: "Uncategorized",
        collapsed: false,
        items: uncategorisedItems,
      });
    }

    return sections;
  }, [groups, tags, toItem, matchesNeedle]);

  const totalAllTags = allTagsSections.reduce((n, s) => n + s.items.length, 0);
  const hasAny =
    starredItems.length +
      recentItems.length +
      recommendedItems.length +
      totalAllTags >
    0;

  const exactExists = needle.length > 0 && tagsByLowerName.has(needle);

  const toggle = useCallback(
    async (rawName: string) => {
      const cleaned = normalizeLabelName(rawName);
      if (!cleaned) return;
      const lower = cleaned.toLowerCase();
      setBusy(true);
      try {
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
      } finally {
        setBusy(false);
      }
    },
    [target, liveGroup, appliedSet, tagsByLowerName],
  );

  const toggleStar = useCallback(
    async (name: string) => {
      const meta = tagsByLowerName.get(name.toLowerCase());
      await window.pond.query("tags.setStarred", {
        name,
        starred: !meta?.starred,
      });
    },
    [tagsByLowerName],
  );

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!needle) return;
    const exact =
      starredItems.find((t) => t.name.toLowerCase() === needle) ??
      recentItems.find((t) => t.name.toLowerCase() === needle) ??
      recommendedItems.find((t) => t.name.toLowerCase() === needle) ??
      allTagsSections
        .flatMap((s) => s.items)
        .find((t) => t.name.toLowerCase() === needle);
    if (exact) {
      void toggle(exact.name);
      return;
    }
    void toggle(q);
  }

  const layout = prefs.layout ?? "list";
  const gridSize = prefs.gridSize ?? "md";

  return (
    <Popover.Portal>
      <Popover.Positioner
        anchor={anchor}
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <Popover.Popup className={styles["tag-picker-popup"]}>
          <div className={styles["tag-picker-header"]}>
            <span className={styles["tag-picker-header-icon"]} aria-hidden>
              <Search width={14} height={14} />
            </span>
            <Input.Field
              data-size="sm"
              className={styles["tag-picker-search"]}
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onSearchKeyDown}
              autoFocus
              spellCheck={false}
              disabled={busy}
            />
            <HeaderToolbar
              layout={layout}
              gridSize={gridSize}
              pinned={prefs.pinned ?? false}
              showStarred={prefs.showStarred ?? true}
              showRecently={prefs.showRecently ?? true}
              showRecommended={prefs.showRecommended ?? true}
              showCounts={prefs.showCounts ?? true}
              onPatch={patchPrefs}
            />
          </div>
          <div
            className={styles["tag-picker-body"]}
            data-layout={layout}
            data-grid-size={gridSize}
          >
            {starredItems.length > 0 ? (
              <Section
                title="Starred"
                count={starredItems.length}
                items={starredItems}
                layout={layout}
                showCounts={prefs.showCounts ?? true}
                onPick={toggle}
                onStar={toggleStar}
              />
            ) : null}
            {recentItems.length > 0 ? (
              <Section
                title="Recently"
                count={recentItems.length}
                items={recentItems}
                layout={layout}
                showCounts={prefs.showCounts ?? true}
                onPick={toggle}
                onStar={toggleStar}
              />
            ) : null}
            {recommendedItems.length > 0 ? (
              <Section
                title="Recommended"
                count={recommendedItems.length}
                items={recommendedItems}
                layout={layout}
                showCounts={prefs.showCounts ?? true}
                onPick={toggle}
                onStar={toggleStar}
              />
            ) : null}
            {allTagsSections.map((section) =>
              section.items.length === 0 ? null : (
                <Section
                  key={section.key}
                  title={section.label}
                  count={section.items.length}
                  items={section.items}
                  layout={layout}
                  showCounts={prefs.showCounts ?? true}
                  collapsible
                  collapsed={section.collapsed}
                  onToggleCollapsed={section.onToggleCollapsed}
                  onPick={toggle}
                  onStar={toggleStar}
                />
              ),
            )}
            {needle && !exactExists ? (
              <button
                type="button"
                className={styles["tag-picker-item"]}
                data-create
                onClick={() => void toggle(q)}
              >
                <span className={styles["tag-picker-item-icon"]} aria-hidden>
                  <Sparkles width={12} height={12} />
                </span>
                <span className={styles["tag-picker-item-name"]}>
                  Create "{normalizeLabelName(q) || q}"
                </span>
              </button>
            ) : null}
            {!hasAny && !needle ? (
              <div className={styles["tag-picker-empty"]}>No tags yet.</div>
            ) : null}
          </div>
          <div className={styles["tag-picker-footer"]}>
            <span className={styles["tag-picker-footer-cell"]}>
              <Kbd.Cluster keys={["↑", "↓", "←", "→"]} />
              <span className={styles["tag-picker-footer-label"]}>Move</span>
            </span>
            <span className={styles["tag-picker-footer-cell"]}>
              <Kbd.Key>↵</Kbd.Key>
              <span className={styles["tag-picker-footer-label"]}>Toggle</span>
            </span>
            <span className={styles["tag-picker-footer-cell"]}>
              <Kbd.Key>esc</Kbd.Key>
              <span className={styles["tag-picker-footer-label"]}>Close</span>
            </span>
          </div>
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  );
}

export const TagPicker = { Root, Trigger, Content };

function HeaderToolbar({
  layout,
  gridSize,
  pinned,
  showStarred,
  showRecently,
  showRecommended,
  showCounts,
  onPatch,
}: {
  layout: "list" | "grid";
  gridSize: "sm" | "md" | "lg";
  pinned: boolean;
  showStarred: boolean;
  showRecently: boolean;
  showRecommended: boolean;
  showCounts: boolean;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className={styles["tag-picker-toolbar"]}>
      <button
        type="button"
        className={styles["tag-picker-tool"]}
        data-active={layout === "list" || undefined}
        title="List layout"
        onClick={() => onPatch({ layout: "list" })}
      >
        <ListChecks width={14} height={14} />
      </button>
      <button
        type="button"
        className={styles["tag-picker-tool"]}
        data-active={layout === "grid" || undefined}
        title="Grid layout"
        onClick={() => onPatch({ layout: "grid" })}
      >
        <LayoutGrid width={14} height={14} />
      </button>
      {layout === "grid" ? (
        <Menu.Root>
          <Menu.Trigger className={styles["tag-picker-tool"]} title="Grid size">
            {gridSize.toUpperCase()}
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={6}>
              <Menu.Popup>
                {(["sm", "md", "lg"] as const).map((sz) => (
                  <Menu.CheckboxItem
                    key={sz}
                    checked={gridSize === sz}
                    onCheckedChange={() => onPatch({ gridSize: sz })}
                  >
                    <Menu.ItemLabel>
                      {sz === "sm" ? "Small" : sz === "md" ? "Medium" : "Large"}
                    </Menu.ItemLabel>
                  </Menu.CheckboxItem>
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ) : null}
      <Menu.Root>
        <Menu.Trigger
          className={styles["tag-picker-tool"]}
          title="Display options"
        >
          <Ellipsis width={14} height={14} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={6} align="end">
            <Menu.Popup>
              <Menu.CheckboxItem
                checked={showStarred}
                onCheckedChange={(v) => onPatch({ showStarred: v })}
              >
                <Menu.ItemLabel>Starred</Menu.ItemLabel>
              </Menu.CheckboxItem>
              <Menu.CheckboxItem
                checked={showRecently}
                onCheckedChange={(v) => onPatch({ showRecently: v })}
              >
                <Menu.ItemLabel>Recently</Menu.ItemLabel>
              </Menu.CheckboxItem>
              <Menu.CheckboxItem
                checked={showRecommended}
                onCheckedChange={(v) => onPatch({ showRecommended: v })}
              >
                <Menu.ItemLabel>Recommended</Menu.ItemLabel>
              </Menu.CheckboxItem>
              <Menu.Separator />
              <Menu.CheckboxItem
                checked={showCounts}
                onCheckedChange={(v) => onPatch({ showCounts: v })}
              >
                <Menu.ItemLabel>Show counts</Menu.ItemLabel>
              </Menu.CheckboxItem>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <button
        type="button"
        className={styles["tag-picker-tool"]}
        data-active={pinned || undefined}
        title="Pin picker"
        onClick={() => onPatch({ pinned: !pinned })}
      >
        <Pin width={14} height={14} />
      </button>
    </div>
  );
}

function Section({
  title,
  count,
  items,
  layout,
  showCounts,
  collapsible = false,
  collapsed = false,
  onToggleCollapsed,
  onPick,
  onStar,
}: {
  title: string;
  count: number;
  items: TagItem[];
  layout: "list" | "grid";
  showCounts: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onPick: (name: string) => void;
  onStar: (name: string) => void;
}) {
  return (
    <section className={styles["tag-picker-section"]}>
      {collapsible ? (
        <button
          type="button"
          className={styles["tag-picker-section-header"]}
          onClick={onToggleCollapsed}
        >
          <span className={styles["tag-picker-section-chevron"]} aria-hidden>
            {collapsed ? (
              <ChevronRight width={12} height={12} />
            ) : (
              <ChevronDown width={12} height={12} />
            )}
          </span>
          <span className={styles["tag-picker-section-title"]}>
            {title}{" "}
            <span className={styles["tag-picker-section-count"]}>
              ({count})
            </span>
          </span>
        </button>
      ) : (
        <h4 className={styles["tag-picker-section-title"]}>
          {title}{" "}
          <span className={styles["tag-picker-section-count"]}>({count})</span>
        </h4>
      )}
      {collapsible && collapsed ? null : (
        <div
          className={
            layout === "grid"
              ? styles["tag-picker-grid"]
              : styles["tag-picker-list"]
          }
        >
          {items.map((item) => (
            <button
              key={item.name}
              type="button"
              className={styles["tag-picker-item"]}
              data-applied={item.applied || undefined}
              onClick={() => onPick(item.name)}
              title={item.name}
            >
              <span className={styles["tag-picker-item-icon"]} aria-hidden>
                {item.applied ? <Check width={12} height={12} /> : null}
              </span>
              <span className={styles["tag-picker-item-name"]}>
                {item.name}
              </span>
              {showCounts && item.count > 0 ? (
                <span className={styles["tag-picker-item-count"]}>
                  {item.count}
                </span>
              ) : null}
              <button
                type="button"
                className={styles["tag-picker-item-star"]}
                data-active={item.starred || undefined}
                aria-label={item.starred ? "Unstar tag" : "Star tag"}
                onClick={(e) => {
                  e.stopPropagation();
                  onStar(item.name);
                }}
              >
                {item.starred ? (
                  <Star fill="currentColor" width={11} height={11} />
                ) : (
                  <Star width={11} height={11} />
                )}
              </button>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

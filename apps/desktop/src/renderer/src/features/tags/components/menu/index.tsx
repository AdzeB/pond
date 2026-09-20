import { IconChevronDownOutline12 as ChevronDown } from "@pond/icons/outline/12";
import { IconPlusOutline18 as Plus } from "@pond/icons/outline/18";
import { normalizeLabelName } from "@pond/schema/label-name";
import { Keyboard, Menu } from "@pond/ui";
import { type KeyboardEvent, type ReactNode, useMemo, useState } from "react";
import { useTagGroups } from "@/features/tags/state/tag-groups";
import { type TagRow, useTags } from "@/features/tags/state/tags";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import {
  buildTagNav,
  filterByNav,
  parseTagBatch,
  partitionPickerTags,
  type TagNavId,
} from "./lib";
import styles from "./styles.module.css";

interface TagMenuProps {
  appliedKeys?: ReadonlySet<string>;
  counts?: ReadonlyMap<string, number>;
  onToggle: (name: string) => void | Promise<void>;
  allowCreate?: boolean;
  placeholder?: string;
  emptyLabel?: ReactNode;
  recommendedNames?: readonly string[];
  layout?: "list" | "grid";
  gridSize?: "sm" | "md" | "lg";
  showStarred?: boolean;
  showRecently?: boolean;
  showRecommended?: boolean;
  showCounts?: boolean;
}

export function TagMenu({
  appliedKeys,
  counts,
  onToggle,
  allowCreate = false,
  placeholder = "Search…",
  emptyLabel = "No tags yet.",
  recommendedNames = [],
  layout = "list",
  gridSize = "md",
  showStarred = true,
  showRecently = true,
  showRecommended = true,
  showCounts = true,
}: TagMenuProps) {
  const tags = useTags();
  const groups = useTagGroups();
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [navId, setNavId] = useState<TagNavId>("all");
  const [pane, setPane] = useState<"nav" | "list">("list");
  const [recentOpen, setRecentOpen] = useState(true);
  const [othersOpen, setOthersOpen] = useState(true);
  const navFade = useScrollFade<HTMLDivElement>();
  const listFade = useScrollFade<HTMLDivElement>();

  const needle = q.trim().toLowerCase();

  const tagsByLower = useMemo(() => {
    const map = new Map<string, TagRow>();
    for (const tag of tags) map.set(tag.name.toLowerCase(), tag);
    return map;
  }, [tags]);

  const groupedTagIds = useMemo(() => {
    const set = new Set<string>();
    for (const group of groups) for (const id of group.tagIds) set.add(id);
    return set;
  }, [groups]);

  const groupTagIds = useMemo(() => {
    const map = new Map<string, ReadonlySet<string>>();
    for (const group of groups) map.set(group.id, new Set(group.tagIds));
    return map;
  }, [groups]);

  const matching = useMemo(
    () =>
      needle
        ? tags.filter((tag) => tag.name.toLowerCase().includes(needle))
        : tags,
    [tags, needle],
  );

  const matchingIds = useMemo(
    () => new Set(matching.map((tag) => tag.id)),
    [matching],
  );

  const navItems = useMemo(() => {
    const visibleGroups = groups
      .map((group) => ({
        id: group.id,
        name: group.name,
        count: group.tagIds.filter((id) => matchingIds.has(id)).length,
      }))
      .filter((group) => (needle ? group.count > 0 : true));
    const uncategorizedCount = matching.filter(
      (tag) => !groupedTagIds.has(tag.id),
    ).length;
    return buildTagNav(matching.length, visibleGroups, uncategorizedCount);
  }, [groups, matching, matchingIds, groupedTagIds, needle]);

  const showNav = groups.length > 0;
  const activeNav = navItems.some((item) => item.id === navId) ? navId : "all";

  const visibleTags = useMemo(
    () => filterByNav(matching, activeNav, groupedTagIds, groupTagIds),
    [matching, activeNav, groupedTagIds, groupTagIds],
  );

  const recommendedSet = useMemo(
    () => new Set(recommendedNames.map((name) => name.trim().toLowerCase())),
    [recommendedNames],
  );
  const sections = useMemo(() => {
    const partitioned = partitionPickerTags(visibleTags, recommendedSet);
    const others = [
      ...(showStarred ? [] : partitioned.starred),
      ...(showRecommended ? [] : partitioned.recommended),
      ...(showRecently ? [] : partitioned.recent),
      ...partitioned.others,
    ].sort((a, b) => a.name.localeCompare(b.name));
    return {
      starred: showStarred ? partitioned.starred : [],
      recommended: showRecommended ? partitioned.recommended : [],
      recent: showRecently ? partitioned.recent : [],
      others,
    };
  }, [recommendedSet, showRecently, showRecommended, showStarred, visibleTags]);
  const { starred, recommended, recent, others } = sections;

  const createInfo = useMemo(() => {
    if (!allowCreate) return null;
    const raw = q.trim();
    if (!raw) return null;
    const batch = parseTagBatch(raw).map(normalizeLabelName).filter(Boolean);
    if (batch.length > 1)
      return { kind: "batch" as const, labels: batch, label: batch.join(", ") };
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
    if (!createInfo || creating) return;
    setCreating(true);
    setError(null);
    try {
      const label = createInfo.label;
      if (createInfo.kind === "batch") {
        for (const item of createInfo.labels) {
          const lower = item.toLowerCase();
          if (!tagsByLower.has(lower))
            await window.pond.query("tags.create", { name: item });
          if (!appliedKeys?.has(lower)) await onToggle(item);
        }
        setQ("");
        return;
      }
      if (!tagsByLower.has(label.toLowerCase()))
        await window.pond.query("tags.create", { name: label });
      if (createInfo.kind === "group") {
        const group = groups.find(
          (group) =>
            group.name.toLowerCase() === createInfo.group.toLowerCase(),
        );
        if (!group)
          await window.pond.query("tagGroups.create", {
            name: createInfo.group,
          });
        await window.pond.query("tagGroups.addTags", {
          tags: [label],
          group: group?.name ?? createInfo.group,
        });
      }
      await onToggle(label);
      setQ("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create the tag. Try again.",
      );
    } finally {
      setCreating(false);
    }
  }

  function moveNav(delta: number) {
    const index = navItems.findIndex((item) => item.id === activeNav);
    const next =
      navItems[Math.max(0, Math.min(navItems.length - 1, index + delta))];
    if (next) setNavId(next.id);
  }

  function onPaneKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Tab" && showNav) {
      event.preventDefault();
      event.stopPropagation();
      setPane((current) => (current === "nav" ? "list" : "nav"));
      return;
    }
    if (!showNav) return;
    if (pane === "nav") {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        moveNav(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        moveNav(-1);
        return;
      }
      if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        setPane("list");
      }
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      setPane("nav");
    }
  }

  async function toggleTag(name: string) {
    setError(null);
    try {
      await onToggle(name);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update the tag. Try again.",
      );
    }
  }

  function renderRow(tag: TagRow) {
    const applied = appliedKeys?.has(tag.name.toLowerCase()) ?? false;
    const count = counts?.get(tag.name.toLowerCase()) ?? tag.usageCount;
    return (
      <Menu.CheckboxItem
        key={tag.id}
        closeOnClick={false}
        checked={applied}
        onCheckedChange={() => void toggleTag(tag.name)}
      >
        <Menu.CheckboxItemIndicator />
        <Menu.ItemLabel>{tag.name}</Menu.ItemLabel>
        {showCounts && count > 0 ? (
          <Menu.SecondaryLabel className={styles.count}>
            {count}
          </Menu.SecondaryLabel>
        ) : null}
      </Menu.CheckboxItem>
    );
  }

  function renderSection(
    label: string,
    items: TagRow[],
    open: boolean,
    onToggleOpen: () => void,
  ) {
    if (items.length === 0) return null;
    const showToggle =
      [starred, recommended, recent, others].filter((items) => items.length > 0)
        .length > 1;
    return (
      <Menu.Group>
        {showToggle && label !== "Starred" ? (
          <Menu.Row
            className={styles.section}
            data-collapsed={open ? undefined : ""}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleOpen();
            }}
          >
            <span>
              {label} ({items.length})
            </span>
            <ChevronDown />
          </Menu.Row>
        ) : (
          <Menu.GroupLabel>
            {label} ({items.length})
          </Menu.GroupLabel>
        )}
        {open ? items.map(renderRow) : null}
      </Menu.Group>
    );
  }

  const hasRows = visibleTags.length > 0;
  const bothSections =
    [starred, recommended, recent, others].filter((items) => items.length > 0)
      .length > 1;

  return (
    <div
      className={styles.root}
      data-nav={showNav ? "" : undefined}
      data-layout={layout}
      data-grid-size={gridSize}
    >
      <Menu.Input
        value={q}
        placeholder={placeholder}
        autoFocus
        onChange={(event) => {
          setQ(event.target.value);
          setPane("list");
        }}
        onKeyDown={(event) => {
          onPaneKeyDown(event);
          if (event.defaultPrevented) return;
          if (event.key === "Enter" && createInfo) {
            event.preventDefault();
            void commitCreate();
          }
        }}
      />

      <div className={styles.body}>
        {showNav ? (
          <div
            className={styles.nav}
            role="radiogroup"
            aria-label="Tag group"
            {...navFade}
          >
            {navItems.map((item) => (
              <Menu.Row
                key={item.id}
                role="radio"
                highlighted={item.id === activeNav}
                aria-checked={item.id === activeNav}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setNavId(item.id);
                  setPane("list");
                }}
              >
                <Menu.ItemLabel>{item.label}</Menu.ItemLabel>
                {showCounts ? (
                  <Menu.SecondaryLabel className={styles.count}>
                    {item.count}
                  </Menu.SecondaryLabel>
                ) : null}
              </Menu.Row>
            ))}
          </div>
        ) : null}

        <div className={styles.list} {...listFade}>
          {bothSections ? (
            <>
              {renderSection("Starred", starred, true, () => {})}
              {starred.length ? <Menu.Separator /> : null}
              {renderSection("Recommended", recommended, true, () => {})}
              {recommended.length ? <Menu.Separator /> : null}
              {renderSection("Recently", recent, recentOpen, () =>
                setRecentOpen((open) => !open),
              )}
              {others.length > 0 && recentOpen ? <Menu.Separator /> : null}
              {renderSection("Others", others, othersOpen, () =>
                setOthersOpen((open) => !open),
              )}
            </>
          ) : hasRows ? (
            <Menu.Group>{visibleTags.map(renderRow)}</Menu.Group>
          ) : null}

          {createInfo ? (
            <Menu.Item
              closeOnClick={false}
              disabled={creating}
              onClick={() => void commitCreate()}
            >
              <Menu.ItemIcon>
                <Plus />
              </Menu.ItemIcon>
              <Menu.ItemLabel>
                {createInfo.kind === "group" ? (
                  <>
                    Create "{createInfo.label}" in group "{createInfo.group}"
                  </>
                ) : createInfo.kind === "batch" ? (
                  <>Add {createInfo.labels.length} Tags</>
                ) : (
                  <>Create "{createInfo.label}"</>
                )}
              </Menu.ItemLabel>
            </Menu.Item>
          ) : null}

          {error ? (
            <div role="alert" className={styles.empty}>
              {error}
            </div>
          ) : null}
          {!hasRows && !createInfo ? (
            <div className={styles.empty}>
              {needle ? "No matches." : emptyLabel}
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.footer}>
        {showNav ? (
          <span className={styles.hint}>
            Switch
            <Keyboard.Key>Tab</Keyboard.Key>
          </span>
        ) : null}
        <span className={styles.hint}>
          Move
          <Keyboard.Cluster
            keys={showNav ? ["↑", "↓", "←", "→"] : ["↑", "↓"]}
          />
        </span>
        <span className={styles.hint}>
          Select
          <Keyboard.Key>⏎</Keyboard.Key>
        </span>
        <span className={styles.close}>
          Close
          <Keyboard.Key>Esc</Keyboard.Key>
        </span>
      </div>
    </div>
  );
}

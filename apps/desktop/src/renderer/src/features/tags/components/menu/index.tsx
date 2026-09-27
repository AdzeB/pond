import { IconChevronDownOutline12 as ChevronDown } from "@pond/icons/outline/12";
import { IconPlusOutline18 as Plus } from "@pond/icons/outline/18";
import { normalizeLabelName } from "@pond/schema/label-name";
import {
  PickerPanel,
  type PickerSelectionState,
  usePickerCursor,
} from "@pond/ui";
import { type ReactNode, useMemo, useState } from "react";
import {
  type TagGroupRow,
  useTagGroups,
} from "@/features/tags/state/tag-groups";
import { type TagRow, useTags } from "@/features/tags/state/tags";
import { parseTagBatch, partitionPickerTags } from "./lib";
import styles from "./styles.module.css";

interface TagMenuProps {
  appliedKeys?: ReadonlySet<string>;
  mixedKeys?: ReadonlySet<string>;
  counts?: ReadonlyMap<string, number>;
  onToggle: (name: string) => void | Promise<void>;
  allowCreate?: boolean;
  placeholder?: string;
  emptyLabel?: ReactNode;
  recommendedNames?: readonly string[];
  gridSize?: "sm" | "md" | "lg";
  showStarred?: boolean;
  showRecently?: boolean;
  showRecommended?: boolean;
  showCounts?: boolean;
  pinned?: boolean;
}

export interface TagMenuViewProps extends TagMenuProps {
  tags: readonly TagRow[];
  groups: readonly TagGroupRow[];
}

type CreateInfo =
  | { kind: "batch"; labels: string[]; label: string }
  | { kind: "group"; group: string; label: string }
  | { kind: "plain"; label: string };

type TagPickerRow =
  | { id: string; kind: "tag"; tag: TagRow }
  | { id: string; kind: "create"; create: CreateInfo };

interface TagSection {
  id: string;
  label: string;
  items: TagRow[];
  open: boolean;
  collapsible: boolean;
  toggle(): void;
}

function rowId(row: TagPickerRow) {
  return row.id;
}

function gridColumns(size: "sm" | "md" | "lg") {
  if (size === "sm") return 3;
  if (size === "md") return 2;
  return 1;
}

export function TagMenu(props: TagMenuProps) {
  const tags = useTags();
  const groups = useTagGroups();
  return <TagMenuView {...props} tags={tags} groups={groups} />;
}

export function TagMenuView({
  tags,
  groups,
  appliedKeys,
  mixedKeys,
  counts,
  onToggle,
  allowCreate = false,
  placeholder = "Search…",
  emptyLabel = "No tags yet.",
  recommendedNames = [],
  gridSize = "md",
  showStarred = true,
  showRecently = true,
  showRecommended = true,
  showCounts = true,
  pinned = false,
}: TagMenuViewProps) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [recentOpen, setRecentOpen] = useState(true);
  const [othersOpen, setOthersOpen] = useState(true);

  const needle = query.trim().toLowerCase();
  const tagsByLower = useMemo(() => {
    const map = new Map<string, TagRow>();
    for (const tag of tags) map.set(tag.name.toLowerCase(), tag);
    return map;
  }, [tags]);
  const matching = useMemo(
    () =>
      needle
        ? tags.filter((tag) => {
            if (tag.name.toLowerCase().includes(needle)) return true;
            return groups.some(
              (group) =>
                group.name.toLowerCase().includes(needle) &&
                group.tagIds.includes(tag.id),
            );
          })
        : tags,
    [groups, needle, tags],
  );
  const visibleTags = matching;
  const recommendedSet = useMemo(
    () => new Set(recommendedNames.map((name) => name.trim().toLowerCase())),
    [recommendedNames],
  );
  const partitioned = useMemo(() => {
    const result = partitionPickerTags(visibleTags, recommendedSet);
    return {
      ...result,
      others: [
        ...(showStarred ? [] : result.starred),
        ...(showRecommended ? [] : result.recommended),
        ...(showRecently ? [] : result.recent),
        ...result.others,
      ].toSorted((a, b) => a.name.localeCompare(b.name)),
    };
  }, [recommendedSet, showRecently, showRecommended, showStarred, visibleTags]);
  const visibleSectionCount = [
    showStarred ? partitioned.starred : [],
    showRecommended ? partitioned.recommended : [],
    showRecently ? partitioned.recent : [],
    partitioned.others,
  ].filter((items) => items.length > 0).length;
  const sections = useMemo<TagSection[]>(
    () => [
      {
        id: "starred",
        label: "Starred",
        items: showStarred ? partitioned.starred : [],
        open: true,
        collapsible: false,
        toggle: () => {},
      },
      {
        id: "recommended",
        label: "Recommended",
        items: showRecommended ? partitioned.recommended : [],
        open: true,
        collapsible: false,
        toggle: () => {},
      },
      {
        id: "recent",
        label: "Recently",
        items: showRecently ? partitioned.recent : [],
        open: recentOpen,
        collapsible: visibleSectionCount > 1,
        toggle: () => setRecentOpen((open) => !open),
      },
      {
        id: "others",
        label: "Others",
        items: partitioned.others,
        open: othersOpen,
        collapsible: visibleSectionCount > 1,
        toggle: () => setOthersOpen((open) => !open),
      },
    ],
    [
      othersOpen,
      partitioned,
      recentOpen,
      showRecently,
      showRecommended,
      showStarred,
      visibleSectionCount,
    ],
  );

  const createInfo = useMemo<CreateInfo | null>(() => {
    if (!allowCreate) return null;
    const raw = query.trim();
    if (!raw) return null;
    const batch = parseTagBatch(raw).map(normalizeLabelName).filter(Boolean);
    if (batch.length > 1)
      return { kind: "batch", labels: batch, label: batch.join(", ") };
    const slash = raw.indexOf("/");
    if (slash >= 0) {
      const group = normalizeLabelName(raw.slice(0, slash));
      const label = normalizeLabelName(raw.slice(slash + 1));
      if (!group || !label) return null;
      return { kind: "group", group, label };
    }
    const label = normalizeLabelName(raw);
    if (!label || tagsByLower.has(label.toLowerCase())) return null;
    return { kind: "plain", label };
  }, [allowCreate, query, tagsByLower]);

  const rows = useMemo<TagPickerRow[]>(() => {
    const tagRows = sections.flatMap((section) =>
      section.open
        ? section.items.map((tag) => ({
            id: `tag-${tag.id}`,
            kind: "tag" as const,
            tag,
          }))
        : [],
    );
    return createInfo
      ? [
          {
            id: `create-${createInfo.label}`,
            kind: "create",
            create: createInfo,
          },
          ...tagRows,
        ]
      : tagRows;
  }, [createInfo, sections]);

  async function commitCreate(info: CreateInfo) {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const label = info.label;
      if (info.kind === "batch") {
        for (const item of info.labels) {
          const lower = item.toLowerCase();
          if (!tagsByLower.has(lower))
            await window.pond.query("tags.create", { name: item });
          if (!appliedKeys?.has(lower)) await onToggle(item);
        }
        setQuery("");
        return;
      }
      if (!tagsByLower.has(label.toLowerCase()))
        await window.pond.query("tags.create", { name: label });
      if (info.kind === "group") {
        const group = groups.find(
          (candidate) =>
            candidate.name.toLowerCase() === info.group.toLowerCase(),
        );
        if (!group)
          await window.pond.query("tagGroups.create", { name: info.group });
        await window.pond.query("tagGroups.addTags", {
          tags: [label],
          group: group?.name ?? info.group,
        });
      }
      await onToggle(label);
      setQuery("");
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

  function activate(row: TagPickerRow) {
    if (row.kind === "create") void commitCreate(row.create);
    else void toggleTag(row.tag.name);
  }

  const cursor = usePickerCursor({
    items: rows,
    getId: rowId,
    columns: gridColumns(gridSize),
    onActivate: activate,
  });

  function renderTag(tag: TagRow) {
    const row: TagPickerRow = { id: `tag-${tag.id}`, kind: "tag", tag };
    const applied = appliedKeys?.has(tag.name.toLowerCase()) ?? false;
    const mixed = mixedKeys?.has(tag.name.toLowerCase()) ?? false;
    const selection: PickerSelectionState = mixed
      ? "mixed"
      : applied
        ? "checked"
        : "unchecked";
    const count = counts?.get(tag.name.toLowerCase()) ?? tag.usageCount;
    return (
      <PickerPanel.Item
        {...cursor.getItemProps(row)}
        key={tag.id}
        role="option"
        aria-label={mixed ? `${tag.name}, some selected` : tag.name}
        aria-selected={applied}
        selected={selection}
      >
        <PickerPanel.SelectionIndicator state={selection} />
        <PickerPanel.ItemLabel title={tag.name}>
          {tag.name}
        </PickerPanel.ItemLabel>
        {showCounts && count > 0 ? (
          <PickerPanel.ItemMeta className={styles.count}>
            {count}
          </PickerPanel.ItemMeta>
        ) : null}
      </PickerPanel.Item>
    );
  }

  return (
    <PickerPanel.Surface
      className={styles.root}
      data-layout="grid"
      data-grid-size={gridSize}
      data-pinned={pinned ? "" : undefined}
    >
      <PickerPanel.Header>
        <PickerPanel.Search
          {...cursor.inputProps}
          aria-label="Search Tags"
          value={query}
          placeholder={placeholder}
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
        />
      </PickerPanel.Header>

      <PickerPanel.Collection
        id={cursor.collectionId}
        className={styles.list}
        role="listbox"
        aria-label="Tags"
        aria-multiselectable="true"
      >
        {createInfo ? (
          <PickerPanel.Item
            {...cursor.getItemProps({
              id: `create-${createInfo.label}`,
              kind: "create",
              create: createInfo,
            })}
            role="option"
            selected="unchecked"
            data-create=""
          >
            <PickerPanel.ItemIcon>
              <Plus />
            </PickerPanel.ItemIcon>
            <PickerPanel.ItemLabel title={createInfo.label}>
              {createInfo.kind === "group"
                ? `Create “${createInfo.label}” in “${createInfo.group}”`
                : createInfo.kind === "batch"
                  ? `Add ${createInfo.labels.length} Tags`
                  : `Create “${createInfo.label}”`}
            </PickerPanel.ItemLabel>
          </PickerPanel.Item>
        ) : null}

        {sections.map((section) =>
          section.items.length ? (
            <PickerPanel.Group
              key={section.id}
              className={styles.tagGroup}
              role="group"
              aria-label={`${section.label}, ${section.items.length}`}
            >
              {section.collapsible ? (
                <PickerPanel.SectionButton
                  className={styles.section}
                  aria-expanded={section.open}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={section.toggle}
                >
                  <span>
                    {section.label} ({section.items.length})
                  </span>
                  <ChevronDown aria-hidden="true" />
                </PickerPanel.SectionButton>
              ) : (
                <PickerPanel.GroupLabel>
                  {section.label} ({section.items.length})
                </PickerPanel.GroupLabel>
              )}
              {section.open ? section.items.map(renderTag) : null}
            </PickerPanel.Group>
          ) : null,
        )}

        {error ? (
          <PickerPanel.Empty role="alert">{error}</PickerPanel.Empty>
        ) : null}
        {!visibleTags.length && !createInfo ? (
          <PickerPanel.Empty>
            {needle ? "No matches." : emptyLabel}
          </PickerPanel.Empty>
        ) : null}
      </PickerPanel.Collection>
    </PickerPanel.Surface>
  );
}

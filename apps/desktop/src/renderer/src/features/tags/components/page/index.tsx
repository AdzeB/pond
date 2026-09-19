import { IconBookmarkFill18 } from "@pond/icons/fill/18";
import {
  IconBookmarkOutline18,
  IconFolderOutline18,
  IconPlusOutline18,
  IconStarOutline18,
} from "@pond/icons/outline/18";
import { Button, DataTable, Empty, Tooltip } from "@pond/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { MatchesEmpty } from "@/features/library/components/empty";
import { TagsBulkActionBar } from "@/features/tags/components/manager/bulk-actions";
import { DraftRow } from "@/features/tags/components/manager/draft-row";
import { TagItem } from "@/features/tags/components/manager/item";
import { tagsColumns } from "@/features/tags/components/manager/lib/columns/columns";
import { TagsTableContext } from "@/features/tags/components/manager/lib/context";
import type { TagsRowData } from "@/features/tags/components/manager/lib/types";
import { TagPicker } from "@/features/tags/components/picker/picker";
import { useTagCreation } from "@/features/tags/hooks/use-tag-creation";
import { useTagsData } from "@/features/tags/hooks/use-tag-manager";
import {
  SearchChrome,
  SearchChromeInput,
} from "@/shared/components/search-chrome";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import styles from "./styles.module.css";

type Scope = "all" | "ungrouped" | "starred" | string;
type TagData = Extract<TagsRowData, { kind: "tag" }>;

interface AlphabetGroup {
  letter: string;
  rows: TagData[];
}

function alphabetKey(name: string): string {
  const first = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .charAt(0)
    .toUpperCase();
  return /^[A-Z]$/.test(first) ? first : "#";
}

function groupAlphabetically(rows: TagData[]): AlphabetGroup[] {
  const grouped = new Map<string, TagData[]>();
  for (const row of rows) {
    const key = alphabetKey(row.tag.name);
    const group = grouped.get(key);
    if (group) group.push(row);
    else grouped.set(key, [row]);
  }
  return [...grouped]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, items]) => ({
      letter,
      rows: items.toSorted((a, b) =>
        a.tag.name.localeCompare(b.tag.name, undefined, {
          sensitivity: "base",
        }),
      ),
    }));
}

export function TagsPage() {
  const {
    q,
    setQ,
    data,
    namesFromIds,
    groupOptions,
    groupSummaries,
    ungroupedTotal,
    starredTotal,
    total,
  } = useTagsData();
  const [scope, setScope] = useState<Scope>("all");
  const { creating, startCreate, cancelCreate, saveCreate } = useTagCreation();
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const cancelDescriptionRef = useRef(false);
  const clearRef = useRef<() => void>(() => {});
  const scrollFade = useScrollFade<HTMLDivElement>();
  const contextValue = useMemo(
    () => ({ groups: groupOptions }),
    [groupOptions],
  );

  useEffect(() => {
    if (
      scope !== "all" &&
      scope !== "ungrouped" &&
      scope !== "starred" &&
      !groupSummaries.some((group) => group.id === scope)
    ) {
      setScope("all");
    }
  }, [scope, groupSummaries]);

  const groups = data.filter(
    (row): row is Extract<TagsRowData, { kind: "group" }> =>
      row.kind === "group",
  );
  const ungrouped = data.filter((row): row is TagData => row.kind === "tag");
  const activeGroupRow =
    scope === "all" || scope === "ungrouped" || scope === "starred"
      ? undefined
      : groups.find((group) => group.id === scope);
  const visibleRows = useMemo(() => {
    if (scope === "ungrouped") return ungrouped;
    if (scope === "starred") {
      return [
        ...groups.flatMap((group) => group.children),
        ...ungrouped,
      ].filter((row): row is TagData => row.kind === "tag" && row.tag.starred);
    }
    if (scope !== "all") {
      return (
        groups
          .find((group) => group.id === scope)
          ?.children.filter((row): row is TagData => row.kind === "tag") ?? []
      );
    }
    return [...groups.flatMap((group) => group.children), ...ungrouped].filter(
      (row): row is TagData => row.kind === "tag",
    );
  }, [groups, scope, ungrouped]);
  const alphabet = useMemo(
    () => groupAlphabetically(visibleRows),
    [visibleRows],
  );

  useEffect(() => {
    cancelDescriptionRef.current = false;
    setDescriptionDraft(activeGroupRow?.group.description ?? "");
  }, [activeGroupRow?.group.description]);

  const scopeLabel =
    scope === "all"
      ? "All Tags"
      : scope === "ungrouped"
        ? "Uncategorized"
        : scope === "starred"
          ? "Starred"
          : (groupSummaries.find((group) => group.id === scope)?.name ??
            "All Tags");

  function commitGroupDescription() {
    const group = activeGroupRow?.group;
    if (!group || descriptionDraft.trim() === (group.description ?? "")) return;
    void window.pond.query("tagGroups.update", {
      name: group.name,
      patch: { description: descriptionDraft },
    });
  }

  return (
    <DataTable.Provider
      data={data}
      columns={tagsColumns}
      getRowId={(row) => row.id}
      getSubRows={(row) => (row.kind === "group" ? row.children : undefined)}
      expandCaret={false}
      onSelectionChange={() => {}}
      defaultSort={{ id: "name", desc: false }}
    >
      <div className={styles.page}>
        <SearchChrome>
          <SearchChromeInput
            value={q}
            onChange={(event) => setQ(event.target.value)}
            spellCheck={false}
            placeholder="Search tags…"
            aria-label="Search Tags"
            data-tags-search=""
          />
        </SearchChrome>

        <TagsTableContext value={contextValue}>
          <div className={styles.workspace}>
            <aside className={styles.sidebar} aria-label="Tag Collections">
              <nav className={styles.navigation}>
                <button
                  type="button"
                  className={styles.navItem}
                  data-active={scope === "all" || undefined}
                  aria-current={scope === "all" ? "page" : undefined}
                  onClick={() => setScope("all")}
                >
                  <IconBookmarkOutline18 aria-hidden="true" />
                  <span className={styles.navLabel}>All</span>
                  <span className={styles.count}>{total}</span>
                </button>
                <button
                  type="button"
                  className={styles.navItem}
                  data-active={scope === "ungrouped" || undefined}
                  aria-current={scope === "ungrouped" ? "page" : undefined}
                  onClick={() => setScope("ungrouped")}
                >
                  <IconFolderOutline18 aria-hidden="true" />
                  <span className={styles.navLabel}>Uncategorized</span>
                  <span className={styles.count}>{ungroupedTotal}</span>
                </button>
                <button
                  type="button"
                  className={styles.navItem}
                  data-active={scope === "starred" || undefined}
                  aria-current={scope === "starred" ? "page" : undefined}
                  onClick={() => setScope("starred")}
                >
                  <IconStarOutline18 aria-hidden="true" />
                  <span className={styles.navLabel}>Starred</span>
                  {starredTotal > 0 ? (
                    <span className={styles.count}>{starredTotal}</span>
                  ) : null}
                </button>
              </nav>

              <div className={styles.groupBlock}>
                <div className={styles.groupHeading}>
                  <div className={styles.groupMeta}>
                    <span>Groups</span>
                    <span>{groupSummaries.length}</span>
                  </div>
                  <Tooltip label="New Group" side="right">
                    <Button
                      icon
                      variant="ghost"
                      size="xs"
                      className={styles.groupAdd}
                      aria-label="New Group"
                      onClick={() => startCreate("group")}
                    >
                      <IconPlusOutline18 />
                    </Button>
                  </Tooltip>
                </div>
                {creating === "group" ? (
                  <div className={styles.groupDraft}>
                    <DraftRow
                      creating="group"
                      onSave={saveCreate}
                      onFinish={cancelCreate}
                    />
                  </div>
                ) : null}
                {groupSummaries.length > 0 ? (
                  <nav className={styles.navigation} aria-label="Tag Groups">
                    {groupSummaries.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        className={styles.navItem}
                        data-active={scope === group.id || undefined}
                        aria-current={scope === group.id ? "page" : undefined}
                        onClick={() => setScope(group.id)}
                      >
                        <IconFolderOutline18 aria-hidden="true" />
                        <span className={styles.navLabel}>{group.name}</span>
                        <span className={styles.count}>{group.count}</span>
                      </button>
                    ))}
                  </nav>
                ) : null}
              </div>
            </aside>

            <main className={styles.main} {...scrollFade}>
              {activeGroupRow ? (
                <section className={styles.groupDetail}>
                  <div className={styles.groupDetailTitle}>
                    <h1>
                      {activeGroupRow.group.name}
                      <span className={styles.groupDetailCount}>
                        ({visibleRows.length})
                      </span>
                    </h1>
                    <TagPicker.Root
                      target={{ kind: "group", group: activeGroupRow.group }}
                    >
                      <Tooltip label="Add Tags">
                        <TagPicker.Trigger
                          icon
                          variant="ghost"
                          size="xs"
                          aria-label={`Add Tags to ${activeGroupRow.group.name}`}
                        >
                          <IconPlusOutline18 />
                        </TagPicker.Trigger>
                      </Tooltip>
                      <TagPicker.Content align="start" />
                    </TagPicker.Root>
                  </div>
                  <input
                    className={styles.groupDescription}
                    value={descriptionDraft}
                    placeholder="Add a description…"
                    aria-label={`${activeGroupRow.group.name} description`}
                    onChange={(event) =>
                      setDescriptionDraft(event.target.value)
                    }
                    onFocus={() => {
                      cancelDescriptionRef.current = false;
                    }}
                    onBlur={() => {
                      if (cancelDescriptionRef.current) {
                        cancelDescriptionRef.current = false;
                        return;
                      }
                      commitGroupDescription();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                      if (event.key === "Escape") {
                        cancelDescriptionRef.current = true;
                        setDescriptionDraft(
                          activeGroupRow.group.description ?? "",
                        );
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </section>
              ) : null}

              {creating === "tag" ? (
                <div className={styles.draft}>
                  <DraftRow
                    creating="tag"
                    onSave={saveCreate}
                    onFinish={cancelCreate}
                  />
                </div>
              ) : null}

              {activeGroupRow && visibleRows.length > 0 ? (
                <div className={styles.groupTags}>
                  <div className={styles.tagGrid}>
                    {visibleRows.map((row) => (
                      <TagItem key={row.id} row={row} variant="index" />
                    ))}
                  </div>
                </div>
              ) : alphabet.length > 0 ? (
                <div className={styles.index}>
                  {alphabet.map((group) => (
                    <section className={styles.letterGroup} key={group.letter}>
                      <header className={styles.letterHeader}>
                        <h2>{group.letter}</h2>
                        <span>({group.rows.length})</span>
                      </header>
                      <div className={styles.tagGrid}>
                        {group.rows.map((row) => (
                          <TagItem key={row.id} row={row} variant="index" />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : total === 0 && !q ? (
                <Empty.Root className={styles.empty}>
                  <Empty.Media>
                    <IconBookmarkFill18 />
                  </Empty.Media>
                  <Empty.Title>No tags yet</Empty.Title>
                  <Empty.Description>
                    Create your first tag to start organizing your library.
                  </Empty.Description>
                  <Empty.Action>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => startCreate("tag")}
                    >
                      New Tag
                    </Button>
                  </Empty.Action>
                </Empty.Root>
              ) : q ? (
                <div className={styles.matches}>
                  <MatchesEmpty
                    actionLabel="Clear Search"
                    description="Try a different tag name."
                    onReset={() => setQ("")}
                  />
                </div>
              ) : (
                <Empty.Root
                  className={styles.scopeEmpty}
                  role="status"
                  aria-live="polite"
                >
                  <Empty.Media>
                    {scope === "starred" ? (
                      <IconStarOutline18 />
                    ) : scope === "ungrouped" ? (
                      <IconBookmarkFill18 />
                    ) : (
                      <IconFolderOutline18 />
                    )}
                  </Empty.Media>
                  <Empty.Title>No tags in {scopeLabel}</Empty.Title>
                  <Empty.Description>
                    {scope === "starred"
                      ? "Starred tags appear here."
                      : scope === "ungrouped"
                        ? "Tags that are not in a group appear here."
                        : `Add tags to ${scopeLabel} to see them here.`}
                  </Empty.Description>
                  <Empty.Action>
                    {activeGroupRow ? (
                      <TagPicker.Root
                        target={{
                          kind: "group",
                          group: activeGroupRow.group,
                        }}
                      >
                        <TagPicker.Trigger variant="primary" size="sm">
                          Add Tags
                        </TagPicker.Trigger>
                        <TagPicker.Content align="center" />
                      </TagPicker.Root>
                    ) : scope === "ungrouped" ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => startCreate("tag")}
                      >
                        New Tag
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setScope("all")}
                      >
                        View All Tags
                      </Button>
                    )}
                  </Empty.Action>
                </Empty.Root>
              )}
            </main>
          </div>
        </TagsTableContext>
      </div>
      <TagsBulkActionBar namesFromIds={namesFromIds} clearRef={clearRef} />
    </DataTable.Provider>
  );
}

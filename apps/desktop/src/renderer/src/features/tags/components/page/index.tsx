import {
  IconBookmark,
  IconBookmarkFill,
  IconFolder,
  IconPlus,
  IconStar,
} from "@pond/icons";
import { Button, DataTable, Empty, Input, Sidebar, Tooltip } from "@pond/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { TagsBulkActionBar } from "@/features/tags/components/manager/bulk-actions";
import { DraftRow } from "@/features/tags/components/manager/draft-row";
import { TagItem } from "@/features/tags/components/manager/item";
import { tagsColumns } from "@/features/tags/components/manager/lib/columns";
import { TagsTableContext } from "@/features/tags/components/manager/lib/context";
import type { TagsRowData } from "@/features/tags/components/manager/lib/types";
import { TagPicker } from "@/features/tags/components/picker";
import { useTagCreation } from "@/features/tags/hooks/use-tag-creation";
import { useTagsData } from "@/features/tags/hooks/use-tag-manager";
import { useTagCreationRequest } from "@/features/tags/state/creation";
import { MatchesEmpty } from "@/shared/components/matches-empty";
import { SearchChrome } from "@/shared/components/search-chrome";
import { usePrefs } from "@/shared/state/prefs";
import { TagSortMenu } from "./sort-menu";
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

function groupAlphabetically(
  rows: TagData[],
  direction: "asc" | "desc",
): AlphabetGroup[] {
  const grouped = new Map<string, TagData[]>();
  for (const row of rows) {
    const key = alphabetKey(row.tag.name);
    const group = grouped.get(key);
    if (group) group.push(row);
    else grouped.set(key, [row]);
  }
  const order = direction === "asc" ? 1 : -1;
  return [...grouped]
    .sort(([a], [b]) => a.localeCompare(b) * order)
    .map(([letter, items]) => ({
      letter,
      rows: items.toSorted(
        (a, b) =>
          a.tag.name.localeCompare(b.tag.name, undefined, {
            sensitivity: "base",
          }) * order,
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
  const [allTags, patchAllTags] = usePrefs("allTags");
  const [scope, setScope] = useState<Scope>("all");
  const { creating, startCreate, cancelCreate, saveCreate } = useTagCreation();
  const creationRequest = useTagCreationRequest();
  const handledCreationRequest = useRef(0);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const cancelDescriptionRef = useRef(false);
  const clearRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (
      creationRequest.token === 0 ||
      creationRequest.token === handledCreationRequest.current
    )
      return;
    handledCreationRequest.current = creationRequest.token;
    setScope(creationRequest.kind === "group" ? "all" : "ungrouped");
    startCreate(creationRequest.kind);
  }, [creationRequest, startCreate]);
  const contextValue = useMemo(
    () => ({
      groups: groupOptions,
      tags: [
        ...new Set(
          data.flatMap((row) =>
            row.kind === "tag"
              ? [row.tag.name]
              : row.children.flatMap((child) =>
                  child.kind === "tag" ? [child.tag.name] : [],
                ),
          ),
        ),
      ],
    }),
    [data, groupOptions],
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
  const orderedRows = useMemo(() => {
    const direction = allTags.sortDirection === "asc" ? 1 : -1;
    return visibleRows.toSorted((a, b) => {
      if (allTags.sort === "count")
        return (
          (a.saves - b.saves) * direction ||
          a.tag.name.localeCompare(b.tag.name)
        );
      if (allTags.sort === "recent")
        return (
          ((a.tag.lastUsedAt ?? 0) - (b.tag.lastUsedAt ?? 0)) * direction ||
          a.tag.name.localeCompare(b.tag.name)
        );
      return (
        a.tag.name.localeCompare(b.tag.name, undefined, {
          sensitivity: "base",
        }) * direction
      );
    });
  }, [allTags.sort, allTags.sortDirection, visibleRows]);
  const alphabet = useMemo(
    () => groupAlphabetically(orderedRows, allTags.sortDirection),
    [allTags.sortDirection, orderedRows],
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
        <SearchChrome.Root
          actions={
            <TagSortMenu
              sort={allTags.sort}
              direction={allTags.sortDirection}
              onChange={(sort, sortDirection) =>
                void patchAllTags({ sort, sortDirection })
              }
            />
          }
        >
          <SearchChrome.Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            spellCheck={false}
            placeholder="Search tags…"
            aria-label="Search Tags"
            data-tags-search=""
          />
        </SearchChrome.Root>

        <TagsTableContext value={contextValue}>
          <div className={styles.workspace}>
            <aside className={styles.sidebar} aria-label="Tag Collections">
              <Sidebar.Root width="full">
                <Sidebar.Scroll>
                  <nav>
                    <Sidebar.Group className={styles["scope-group"]}>
                      <Sidebar.Item
                        type="button"
                        data-status={scope === "all" ? "active" : undefined}
                        aria-current={scope === "all" ? "page" : undefined}
                        onClick={() => setScope("all")}
                      >
                        <Sidebar.Icon>
                          <IconBookmark size={12} aria-hidden="true" />
                        </Sidebar.Icon>
                        <Sidebar.ItemLabel>All</Sidebar.ItemLabel>
                        <Sidebar.Count>{total}</Sidebar.Count>
                      </Sidebar.Item>
                      <Sidebar.Item
                        type="button"
                        data-status={
                          scope === "ungrouped" ? "active" : undefined
                        }
                        aria-current={
                          scope === "ungrouped" ? "page" : undefined
                        }
                        onClick={() => setScope("ungrouped")}
                      >
                        <Sidebar.Icon>
                          <IconFolder size={12} aria-hidden="true" />
                        </Sidebar.Icon>
                        <Sidebar.ItemLabel>Uncategorized</Sidebar.ItemLabel>
                        <Sidebar.Count>{ungroupedTotal}</Sidebar.Count>
                      </Sidebar.Item>
                      <Sidebar.Item
                        type="button"
                        data-status={scope === "starred" ? "active" : undefined}
                        aria-current={scope === "starred" ? "page" : undefined}
                        onClick={() => setScope("starred")}
                      >
                        <Sidebar.Icon>
                          <IconStar size={12} aria-hidden="true" />
                        </Sidebar.Icon>
                        <Sidebar.ItemLabel>Starred</Sidebar.ItemLabel>
                        {starredTotal > 0 ? (
                          <Sidebar.Count>{starredTotal}</Sidebar.Count>
                        ) : null}
                      </Sidebar.Item>
                    </Sidebar.Group>
                  </nav>

                  <Sidebar.Group>
                    <Sidebar.GroupHeader>
                      <Sidebar.GroupLabel>
                        Groups
                        <Sidebar.Count>{groupSummaries.length}</Sidebar.Count>
                      </Sidebar.GroupLabel>
                      <Tooltip label="New Group" side="right">
                        <Button
                          icon
                          variant="ghost"
                          size="xs"
                          aria-label="New Group"
                          onClick={() => startCreate("group")}
                        >
                          <IconPlus size={12} />
                        </Button>
                      </Tooltip>
                    </Sidebar.GroupHeader>
                    {creating === "group" ? (
                      <div className={styles["group-draft"]}>
                        <DraftRow
                          creating="group"
                          onSave={saveCreate}
                          onFinish={cancelCreate}
                        />
                      </div>
                    ) : null}
                    {groupSummaries.length > 0 ? (
                      <nav
                        className={styles["group-navigation"]}
                        aria-label="Tag Groups"
                      >
                        {groupSummaries.map((group) => (
                          <Sidebar.Item
                            key={group.id}
                            type="button"
                            data-status={
                              scope === group.id ? "active" : undefined
                            }
                            aria-current={
                              scope === group.id ? "page" : undefined
                            }
                            onClick={() => setScope(group.id)}
                          >
                            <Sidebar.Icon>
                              <IconFolder size={12} aria-hidden="true" />
                            </Sidebar.Icon>
                            <Sidebar.ItemLabel>{group.name}</Sidebar.ItemLabel>
                            <Sidebar.Count>{group.count}</Sidebar.Count>
                          </Sidebar.Item>
                        ))}
                      </nav>
                    ) : null}
                  </Sidebar.Group>
                </Sidebar.Scroll>
              </Sidebar.Root>
            </aside>

            <main className={styles.main}>
              {activeGroupRow ? (
                <section className={styles["group-detail"]}>
                  <div className={styles["group-detail-title"]}>
                    <h1>
                      {activeGroupRow.group.name}
                      <span className={styles["group-detail-count"]}>
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
                          <IconPlus size={12} />
                        </TagPicker.Trigger>
                      </Tooltip>
                      <TagPicker.Content align="start" />
                    </TagPicker.Root>
                  </div>
                  <Input.Root
                    className={styles["group-description"]}
                    size="xs"
                    variant="borderless"
                  >
                    <Input.Field
                      value={descriptionDraft}
                      placeholder="Add a description"
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
                  </Input.Root>
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

              {(activeGroupRow || allTags.sort !== "name") &&
              orderedRows.length > 0 ? (
                <div className={styles["group-tags"]}>
                  <div className={styles["tag-grid"]}>
                    {orderedRows.map((row) => (
                      <TagItem key={row.id} row={row} variant="index" />
                    ))}
                  </div>
                </div>
              ) : alphabet.length > 0 ? (
                <div className={styles.index}>
                  {alphabet.map((group) => (
                    <section
                      className={styles["letter-group"]}
                      key={group.letter}
                    >
                      <header className={styles["letter-header"]}>
                        <h2>{group.letter}</h2>
                        <span>({group.rows.length})</span>
                      </header>
                      <div className={styles["tag-grid"]}>
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
                    <IconBookmarkFill />
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
                  className={styles["scope-empty"]}
                  role="status"
                  aria-live="polite"
                >
                  <Empty.Media>
                    {scope === "starred" ? (
                      <IconStar />
                    ) : scope === "ungrouped" ? (
                      <IconBookmarkFill />
                    ) : (
                      <IconFolder />
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

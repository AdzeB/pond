import { IconMagnifierOutline18 as Magnifier } from "@pond/icons/outline/18";
import { normalizeLabelName } from "@pond/schema/label-name";
import { Button, DataTable, Input, Settings } from "@pond/ui";
import { useCallback, useMemo, useRef, useState } from "react";
import { TagsBulkActionBar } from "./bulk-actions";
import { DraftRow } from "./draft-row";
import { tagsColumns } from "./lib/columns";
import { TagsTableContext } from "./lib/context";
import { TagRow as TagRowRenderer } from "./lib/row-context";
import styles from "./styles.module.css";
import { useTagsData } from "./use-tags-data";

type Creating = "tag" | "group" | null;

export function TagsSection() {
  const {
    q,
    setQ,
    data,
    expandedIds,
    onToggleExpand,
    namesFromIds,
    groupOptions,
    total,
  } = useTagsData();

  const [creating, setCreating] = useState<Creating>(null);
  const [draft, setDraft] = useState("");
  const clearRef = useRef<() => void>(() => {});
  const ctxValue = useMemo(() => ({ groups: groupOptions }), [groupOptions]);
  const onSelectionChange = useCallback(() => {}, []);

  async function commitCreate() {
    const kind = creating;
    const cleaned = normalizeLabelName(draft);
    setDraft("");
    setCreating(null);
    if (!kind || !cleaned) return;
    await window.pond.query(
      kind === "group" ? "tagGroups.create" : "tags.create",
      { name: cleaned },
    );
  }

  function startCreate(kind: "tag" | "group") {
    setDraft("");
    setCreating(kind);
  }

  return (
    <DataTable.Provider
      data={data}
      columns={tagsColumns}
      getRowId={(row) => row.id}
      getSubRows={(row) => (row.kind === "group" ? row.children : undefined)}
      onSelectionChange={onSelectionChange}
      defaultSort={{ id: "name", desc: false }}
      expandedIds={expandedIds}
      onToggleExpand={onToggleExpand}
      renderRow={(args) => <TagRowRenderer {...args} />}
    >
      <Settings.Page width="wide">
        <Settings.Header>
          <Settings.HeaderText>
            <Settings.Title>Tags</Settings.Title>
            <Settings.Description>
              Organise your saves with tags and groups.
            </Settings.Description>
          </Settings.HeaderText>
        </Settings.Header>

        <div className={styles.content}>
          <DataTable.Toolbar className={styles.toolbar}>
            <Input.Root className={styles.search}>
              <Input.Icon>
                <Magnifier width={14} height={14} />
              </Input.Icon>
              <Input.Field
                value={q}
                onChange={(e) => setQ(e.target.value)}
                spellCheck={false}
                placeholder="Search…"
              />
            </Input.Root>
            <div className={styles.spacer} />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => startCreate("group")}
            >
              New Group
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => startCreate("tag")}
            >
              New Tag
            </Button>
          </DataTable.Toolbar>

          <TagsTableContext value={ctxValue}>
            <DataTable.Root className={styles["table-wrapper"]}>
              <DataTable.ExtraRow>
                {creating ? (
                  <DraftRow
                    creating={creating}
                    draft={draft}
                    setDraft={setDraft}
                    onCommit={() => void commitCreate()}
                    onCancel={() => {
                      setDraft("");
                      setCreating(null);
                    }}
                  />
                ) : null}
              </DataTable.ExtraRow>
              <DataTable.Empty>
                <div className={styles.empty}>
                  <span className={styles["empty-title"]}>
                    {total === 0 ? "No Tags Yet" : "No matches"}
                  </span>
                  <span className={styles["empty-text"]}>
                    {total === 0
                      ? "Labels keep your saves organised. Create one, then add it to a group to build a hierarchy."
                      : "Try a different search."}
                  </span>
                </div>
              </DataTable.Empty>
            </DataTable.Root>
          </TagsTableContext>
        </div>
      </Settings.Page>

      <TagsBulkActionBar namesFromIds={namesFromIds} clearRef={clearRef} />
    </DataTable.Provider>
  );
}

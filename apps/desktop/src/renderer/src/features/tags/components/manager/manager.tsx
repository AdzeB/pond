import { IconTagFill18 } from "@pond/icons/fill/18";
import { IconMagnifierOutline12 as Magnifier } from "@pond/icons/outline/12";
import { Accordion, Button, DataTable, Empty, Input, Settings } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useMemo, useRef } from "react";
import { MatchesEmpty } from "@/features/library/components/empty/empty";
import { useTagCreation } from "@/features/tags/hooks/use-tag-creation";
import { gentleSpring } from "@/shared/lib/motion";
import { useTagsData } from "../../hooks/use-tag-manager";
import { TagsBulkActionBar } from "./bulk-actions";
import { DraftRow } from "./draft-row/draft-row";
import { TagGroup } from "./group/group";
import { TagItem } from "./item/item";
import { tagsColumns } from "./lib/columns/columns";
import { TagsTableContext } from "./lib/context";
import type { TagsRowData } from "./lib/types";
import styles from "./manager.module.css";

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

  const { creating, draft, setDraft, startCreate, cancelCreate, commitCreate } =
    useTagCreation();
  const clearRef = useRef<() => void>(() => {});
  const ctxValue = useMemo(() => ({ groups: groupOptions }), [groupOptions]);
  const onSelectionChange = useCallback(() => {}, []);
  const reduceMotion = useReducedMotion();
  const motionTransition = reduceMotion ? { duration: 0 } : gentleSpring;

  const groups = data.filter(
    (row): row is Extract<TagsRowData, { kind: "group" }> =>
      row.kind === "group",
  );
  const ungrouped = data.filter(
    (row): row is Extract<TagsRowData, { kind: "tag" }> => row.kind === "tag",
  );

  const hasList = creating != null || groups.length > 0 || ungrouped.length > 0;

  return (
    <DataTable.Provider
      data={data}
      columns={tagsColumns}
      getRowId={(row) => row.id}
      getSubRows={(row) => (row.kind === "group" ? row.children : undefined)}
      expandCaret={false}
      onSelectionChange={onSelectionChange}
      defaultSort={{ id: "name", desc: false }}
      expandedIds={expandedIds}
      onToggleExpand={onToggleExpand}
    >
      <Settings.Page>
        <Settings.Header>
          <Settings.HeaderText>
            <Settings.Title>Tags</Settings.Title>
            <Settings.Description>
              Organize saves with tags and groups.
            </Settings.Description>
          </Settings.HeaderText>
        </Settings.Header>

        <div className={styles.content}>
          <DataTable.Toolbar className={styles.toolbar}>
            <Input.Root className={styles.search}>
              <Input.Icon>
                <Magnifier />
              </Input.Icon>
              <Input.Field
                value={q}
                onChange={(e) => setQ(e.target.value)}
                spellCheck={false}
                placeholder="Search…"
              />
            </Input.Root>
            <div className={styles.spacer} />
            <Button variant="secondary" onClick={() => startCreate("group")}>
              New Group
            </Button>
            <Button variant="secondary" onClick={() => startCreate("tag")}>
              New Tag
            </Button>
          </DataTable.Toolbar>

          <TagsTableContext value={ctxValue}>
            {hasList ? (
              <div className={styles.list}>
                <AnimatePresence initial={false}>
                  {creating ? (
                    <motion.div
                      key="draft"
                      className={styles.draft}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={motionTransition}
                    >
                      <DraftRow
                        creating={creating}
                        draft={draft}
                        setDraft={setDraft}
                        onCommit={() => void commitCreate()}
                        onCancel={cancelCreate}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                {groups.length > 0 ? (
                  <Accordion.Root
                    multiple
                    value={expandedIds}
                    onValueChange={(next) => {
                      const open = new Set(next);
                      for (const group of groups) {
                        const was = expandedIds.includes(group.id);
                        const now = open.has(group.id);
                        if (was !== now) onToggleExpand(group.id, now);
                      }
                    }}
                    className={styles.groups}
                  >
                    {groups.map((group) => (
                      <TagGroup
                        key={group.id}
                        row={group}
                        open={expandedIds.includes(group.id)}
                      />
                    ))}
                  </Accordion.Root>
                ) : null}
                {ungrouped.map((row) => (
                  <TagItem key={row.id} row={row} variant="card" />
                ))}
              </div>
            ) : total === 0 ? (
              <Empty.Root>
                <Empty.Media>
                  <IconTagFill18 />
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
            ) : (
              <MatchesEmpty
                actionLabel="Clear Search"
                description="Try a different tag name."
                onReset={() => setQ("")}
              />
            )}
          </TagsTableContext>
        </div>
      </Settings.Page>

      <TagsBulkActionBar namesFromIds={namesFromIds} clearRef={clearRef} />
    </DataTable.Provider>
  );
}

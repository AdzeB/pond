import { IconChevronRightOutline12 as ChevronRight } from "@pond/icons/outline/12";
import { Accordion } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Ref } from "react";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
import { gentleSpring } from "@/lib/ui/motion";
import { TagItem } from "../item";
import { ActionsCell } from "../lib/cells";
import { focusInput } from "../lib/helpers";
import { TagRowProvider, useTagRow } from "../lib/row-context";
import { TagCheckbox } from "../lib/select";
import type { TagsRowData } from "../lib/types";
import styles from "./styles.module.css";

export function TagGroup({
  row,
  open,
}: {
  row: Extract<TagsRowData, { kind: "group" }>;
  open: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <Accordion.Item value={row.id} className={styles.card}>
      <TagRowProvider row={row}>
        <GroupHeader />
      </TagRowProvider>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className={styles.panel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : gentleSpring}
          >
            {row.children.map((child) =>
              child.kind === "tag" ? (
                <TagItem key={child.id} row={child} />
              ) : null,
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Accordion.Item>
  );
}

function GroupHeader() {
  const {
    row,
    rowRef,
    renaming,
    renameDraft,
    setRenameDraft,
    commitRename,
    cancelRename,
    buildMenuItems,
  } = useTagRow();
  if (row.kind !== "group") return null;
  const members = row.children.length;

  const title = members > 0 ? `${row.group.name}` : row.group.name;

  return (
    <SpecContextMenu buildItems={buildMenuItems}>
      <div
        ref={rowRef as Ref<HTMLDivElement>}
        className={styles.header}
        data-tag-row=""
        tabIndex={-1}
        title={row.group.name}
      >
        <TagCheckbox rowId={row.id} name={row.group.name} />
        {renaming ? (
          <span className={styles.rename}>
            <span className={styles.caret} aria-hidden>
              <ChevronRight />
            </span>
            <input
              ref={focusInput}
              className={styles.input}
              value={renameDraft}
              spellCheck={false}
              onChange={(e) => setRenameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitRename();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelRename();
                }
              }}
            />
          </span>
        ) : (
          <Accordion.Header className={styles.heading}>
            <Accordion.Trigger className={styles.trigger}>
              <span className={styles.title}>{title}</span>
              <span className={styles.caret} aria-hidden>
                <ChevronRight />
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
        )}
        <ActionsCell />
      </div>
    </SpecContextMenu>
  );
}

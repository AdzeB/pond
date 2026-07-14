import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import {
  IconTextAFill18 as ContentIcon,
  IconCalendarFill18 as DateIcon,
  IconFileFill18 as FileIcon,
} from "@pond/icons/fill/18";
import { IconChevronLeftOutline12 as BackIcon } from "@pond/icons/outline/12";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useId } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import { Dock } from "@/components/library-view-menu-group";
import type { SortDir } from "@/hooks/use-filtered-saves";
import { type SortKey, useView } from "@/hooks/use-view";
import { snappySpring } from "@/lib/ui/motion";
import { dockMode } from "@/stores/dock-mode";
import styles from "./styles.module.css";

type KeyOption = { value: SortKey; label: string };
export type SortGroupId = "date" | "content" | "file";

const KEY_GROUPS: Array<{
  id: SortGroupId;
  section: "sort-date" | "sort-content" | "sort-file";
  label: string;
  icon: ReactNode;
  options: KeyOption[];
}> = [
  {
    id: "date",
    section: "sort-date",
    label: "Date",
    icon: <DateIcon size={18} />,
    options: [
      { value: "savedAt", label: "Date Saved" },
      { value: "createdAt", label: "Date Added" },
    ],
  },
  {
    id: "content",
    section: "sort-content",
    label: "Content",
    icon: <ContentIcon size={18} />,
    options: [
      { value: "title", label: "Title" },
      { value: "type", label: "Type" },
      { value: "creator", label: "Creator" },
      { value: "source", label: "Source" },
    ],
  },
  {
    id: "file",
    section: "sort-file",
    label: "File",
    icon: <FileIcon size={18} />,
    options: [
      { value: "fileSize", label: "Size" },
      { value: "fileCount", label: "Count" },
      { value: "dimensions", label: "Dimensions" },
    ],
  },
];

const DIRECTIONS = [
  { value: "asc" as const, label: "Ascending" },
  { value: "desc" as const, label: "Descending" },
];

type SortState = { key: SortKey; dir: SortDir };

/** Cancel restores the sort from when the family opened; the main card unmounts while a subview is shown, so the snapshot outlives the components and clears when the dock leaves the sort family. */
let snapshot: SortState | null = null;
dockMode.subscribe((mode) => {
  if (!mode.startsWith("sort")) snapshot = null;
});

function useHighlightTransition() {
  const reduceMotion = useReducedMotion();
  return reduceMotion ? { duration: 0 } : snappySpring;
}

export function SortSection() {
  const { state, actions } = useView();
  const dock = useDock();
  const { key, dir } = state.sort;
  const groupId = useId();
  const highlightTransition = useHighlightTransition();
  snapshot ??= state.sort;

  return (
    <Dock.Root>
      <Dock.Close />
      <Dock.Header>
        <Dock.Title>Sort Library</Dock.Title>
        <Dock.Separator />
        <Dock.Description>
          Pick which detail your library is ordered by, and flip the direction
          to show the newest, largest, or first alphabetically at the top.
        </Dock.Description>
      </Dock.Header>
      <div className={styles.groups}>
        {KEY_GROUPS.map((group) => {
          const selected = group.options.find((option) => option.value === key);
          return (
            <button
              key={group.id}
              type="button"
              className={styles.group}
              onClick={() => dock.openViewMenu(group.section)}
            >
              {selected ? (
                <motion.span
                  aria-hidden
                  layoutId={`${groupId}-groups`}
                  className={styles.highlight}
                  transition={highlightTransition}
                />
              ) : null}
              <span className={styles["group-icon"]}>{group.icon}</span>
              <span className={styles["group-label"]}>{group.label}</span>
              {selected ? (
                <span className={styles["group-value"]}>{selected.label}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <ToggleGroup aria-label="Sort direction" className={styles.directions}>
        {DIRECTIONS.map((direction) => {
          const active = direction.value === dir;
          return (
            <Toggle
              key={direction.value}
              title={direction.label}
              className={styles.direction}
              onClick={() => actions.setSort({ key, dir: direction.value })}
            >
              {active ? (
                <motion.span
                  aria-hidden
                  layoutId={`${groupId}-direction`}
                  className={styles["toggle-highlight"]}
                  transition={highlightTransition}
                />
              ) : null}
              <span className={styles.label}>{direction.label}</span>
            </Toggle>
          );
        })}
      </ToggleGroup>
      <Dock.Footer>
        <Dock.Cancel
          onClick={() => {
            if (snapshot) actions.setSort(snapshot);
          }}
        />
        <Dock.Confirm />
      </Dock.Footer>
    </Dock.Root>
  );
}

export function SortGroupSection({ group }: { group: SortGroupId }) {
  const { state, actions } = useView();
  const dock = useDock();
  const { key, dir } = state.sort;
  const groupId = useId();
  const highlightTransition = useHighlightTransition();
  snapshot ??= state.sort;

  const spec = KEY_GROUPS.find((entry) => entry.id === group);
  if (!spec) return null;

  return (
    <Dock.Root>
      <button
        type="button"
        aria-label="Back"
        className={styles.back}
        onClick={() => dock.openViewMenu("sort")}
      >
        <BackIcon strokeWidth={2} />
      </button>
      <Dock.Header>
        <Dock.Title>{spec.label}</Dock.Title>
        <Dock.Separator />
      </Dock.Header>
      <div className={styles.rows}>
        {spec.options.map((option) => {
          const active = option.value === key;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              className={styles.option}
              onClick={() => {
                actions.setSort({ key: option.value, dir });
                dock.openViewMenu("sort");
              }}
            >
              {active ? (
                <motion.span
                  aria-hidden
                  layoutId={`${groupId}-options`}
                  className={styles.highlight}
                  transition={highlightTransition}
                />
              ) : null}
              <span className={styles.label}>{option.label}</span>
            </button>
          );
        })}
      </div>
    </Dock.Root>
  );
}

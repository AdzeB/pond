import {
  IconAscendingSortingOutline12,
  IconDescendingSortingOutline12,
} from "@pond/icons/outline/12";
import {
  Button,
  Select,
  type SelectItemSpec,
  Toggle,
  ToggleGroup,
} from "@pond/ui";
import { isSortKey } from "@/features/library/hooks/use-filtered-saves";
import { type SortKey, useView } from "@/features/library/hooks/use-view";
import { useLibraryNav } from "@/features/library/state/library-chrome";
import { shuffleOrder } from "@/features/library/state/view-store";
import styles from "../view-menu.module.css";

type KeyOption = { value: SortKey; label: string };

const KEY_GROUPS: Array<{
  label: string;
  options: KeyOption[];
}> = [
  {
    label: "Arrange",
    options: [
      { value: "random", label: "Random" },
      { value: "manual", label: "Manual" },
    ],
  },
  {
    label: "Date",
    options: [
      { value: "savedAt", label: "Date Saved" },
      { value: "createdAt", label: "Date Added" },
      { value: "publishedAt", label: "Date Published" },
    ],
  },
  {
    label: "Content",
    options: [
      { value: "title", label: "Title" },
      { value: "type", label: "Type" },
      { value: "creator", label: "Creator" },
      { value: "source", label: "Source" },
      { value: "tagName", label: "First Tag" },
      { value: "tagCount", label: "Tag Count" },
      { value: "rating", label: "Rating" },
    ],
  },
  {
    label: "Media",
    options: [
      { value: "duration", label: "Duration" },
      { value: "width", label: "Width" },
      { value: "height", label: "Height" },
      { value: "dimensions", label: "Dimensions" },
      { value: "aspectRatio", label: "Aspect Ratio" },
    ],
  },
  {
    label: "File",
    options: [
      { value: "fileSize", label: "Size" },
      { value: "fileCount", label: "Count" },
    ],
  },
];

function labelFor(key: SortKey): string {
  for (const group of KEY_GROUPS) {
    const option = group.options.find((item) => item.value === key);
    if (option) return option.label;
  }
  return key;
}

export function SortSection({ onArrange }: { onArrange?: () => void }) {
  const nav = useLibraryNav();
  const items: SelectItemSpec<SortKey>[] = KEY_GROUPS.map((group) => ({
    type: "group",
    label: group.label,
    items: group.options.map((option) => ({
      ...option,
      disabled: option.value === "manual" && nav.kind !== "folder",
    })),
  }));
  const { state, actions } = useView();
  const { key, dir } = state.sort;

  return (
    <>
      <Select.Root
        items={KEY_GROUPS.flatMap((group) => group.options)}
        value={key}
        onValueChange={(value) => {
          if (value && isSortKey(value))
            actions.setSort({
              key: value,
              dir: value === "manual" ? "asc" : dir,
            });
        }}
      >
        <div className={styles.row}>
          <Select.Label className={styles.label}>Sort By</Select.Label>
          <div className={styles.controls}>
            <Select.Trigger size="sm" className={styles.select}>
              <Select.Value>{labelFor(key)}</Select.Value>
            </Select.Trigger>
            <ToggleGroup
              className={styles.direction}
              value={[dir]}
              onValueChange={(value) => {
                const next = value[0];
                if (next === "asc" || next === "desc") {
                  actions.setSort({ key, dir: next });
                }
              }}
              aria-label="Sort Direction"
            >
              <Toggle value="asc" size="sm" aria-label="Ascending">
                <IconAscendingSortingOutline12 />
              </Toggle>
              <Toggle value="desc" size="sm" aria-label="Descending">
                <IconDescendingSortingOutline12 />
              </Toggle>
            </ToggleGroup>
          </div>
        </div>
        <Select.Portal>
          <Select.Positioner align="end" sideOffset={6}>
            <Select.Popup>
              <Select.Items items={items} />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      {key === "random" ? (
        <Button size="sm" variant="secondary" onClick={shuffleOrder}>
          Shuffle Again
        </Button>
      ) : null}
      {nav.kind === "folder" ? (
        <div className={styles.row}>
          <span className={styles.label}>Saved for this folder</span>
          <Button size="sm" variant="secondary" onClick={onArrange}>
            Arrange Folder
          </Button>
        </div>
      ) : null}
    </>
  );
}

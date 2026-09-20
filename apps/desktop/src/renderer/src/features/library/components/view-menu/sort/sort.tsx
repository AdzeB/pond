import {
  IconAscendingSortingOutline18,
  IconDescendingSortingOutline18,
} from "@pond/icons/outline/18";
import { Button, Select } from "@pond/ui";
import { isSortKey } from "@/features/library/hooks/use-filtered-saves";
import { type SortKey, useView } from "@/features/library/hooks/use-view";
import { useLibraryNav } from "@/features/library/state/library-chrome";
import {
  reseedRandomSort,
  toggleSortDir,
} from "@/features/library/state/view-store";
import styles from "../styles.module.css";

const KEY_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "random", label: "Random" },
  { value: "savedAt", label: "Date Saved" },
  { value: "createdAt", label: "Date Added" },
  { value: "publishedAt", label: "Date Published" },
  { value: "title", label: "Title" },
  { value: "type", label: "Type" },
  { value: "creator", label: "Creator" },
  { value: "source", label: "Source" },
  { value: "tagName", label: "First Tag" },
  { value: "tagCount", label: "Tag Count" },
  { value: "rating", label: "Rating" },
  { value: "duration", label: "Duration" },
  { value: "width", label: "Width" },
  { value: "height", label: "Height" },
  { value: "dimensions", label: "Dimensions" },
  { value: "aspectRatio", label: "Aspect Ratio" },
  { value: "fileSize", label: "Size" },
  { value: "fileCount", label: "Count" },
];

function labelFor(key: SortKey): string {
  return KEY_OPTIONS.find((item) => item.value === key)?.label ?? key;
}

export function SortSection({ onArrange }: { onArrange?: () => void }) {
  const nav = useLibraryNav();
  const { state, actions } = useView();
  const { key, dir } = state.sort;

  return (
    <>
      <Select.Root
        items={KEY_OPTIONS}
        value={key}
        onValueChange={(value) => {
          if (value && isSortKey(value)) actions.setSort({ key: value, dir });
        }}
      >
        <div className={styles.row}>
          <Select.Label className={styles.label}>Sort By</Select.Label>
          <div className={styles.controls}>
            <Select.Trigger size="sm" className={styles.select}>
              <Select.Value>{labelFor(key)}</Select.Value>
            </Select.Trigger>
            <Button
              icon
              size="sm"
              variant="secondary"
              className={styles.direction}
              aria-label="Toggle Sort Direction"
              onClick={toggleSortDir}
            >
              {dir === "asc" ? (
                <IconAscendingSortingOutline18 />
              ) : (
                <IconDescendingSortingOutline18 />
              )}
            </Button>
          </div>
        </div>
        <Select.Portal>
          <Select.Positioner align="end" sideOffset={6}>
            <Select.Popup>
              <Select.Items items={KEY_OPTIONS} />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      {key === "random" ? (
        <div className={styles.row}>
          <span className={styles.label}>Random Order</span>
          <Button size="sm" variant="secondary" onClick={reseedRandomSort}>
            Reshuffle
          </Button>
        </div>
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

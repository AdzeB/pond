import { IconDescendingSortingOutline18 } from "@pond/icons/outline/18";
import { Button, Select, type SelectItemSpec, Tooltip } from "@pond/ui";
import { ShortcutKeys } from "@/components/shared/shortcut-keys";
import { type SortKey, useView } from "@/hooks/use-view";
import { toggleSortDir } from "@/stores/view-store";
import sharedStyles from "../styles.module.css";
import styles from "./styles.module.css";

type KeyOption = { value: SortKey; label: string };

const KEY_GROUPS: Array<{
  label: string;
  options: KeyOption[];
}> = [
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

const OPTIONS = KEY_GROUPS.flatMap((group) => group.options);
const ITEMS: SelectItemSpec<SortKey>[] = KEY_GROUPS.map((group) => ({
  type: "group",
  label: group.label,
  items: group.options,
}));

export function SortSection() {
  const { state, actions } = useView();
  const { key, dir } = state.sort;

  return (
    <Select.Root
      items={OPTIONS}
      value={key}
      onValueChange={(value) => {
        if (value !== null) actions.setSort({ key: value, dir });
      }}
    >
      <div className={sharedStyles.row}>
        <Select.Label className={sharedStyles.label}>Sort By</Select.Label>
        <div className={styles.controls}>
          <Tooltip
            label="Toggle Sort Direction"
            shortcut={<ShortcutKeys id="view.sort-dir" />}
            side="bottom"
          >
            <Button
              icon
              size="sm"
              variant="ghost"
              aria-label={dir === "asc" ? "Ascending" : "Descending"}
              onClick={() => toggleSortDir()}
            >
              <IconDescendingSortingOutline18
                className={styles.icon}
                data-asc={dir === "asc" || undefined}
              />
            </Button>
          </Tooltip>
          <Select.Trigger size="sm" className={sharedStyles.select}>
            <Select.Value />
          </Select.Trigger>
        </div>
      </div>
      <Select.Portal>
        <Select.Positioner align="end" sideOffset={6}>
          <Select.Popup>
            <Select.Items items={ITEMS} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

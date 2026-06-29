import {
  IconAscendingSortingFill18 as AscendingIcon,
  IconDescendingSortingFill18 as DescendingIcon,
} from "@pond/icons/fill/18";
import { Select } from "@pond/ui";
import styles from "@/components/library-view-menu/styles.module.css";
import { Group } from "@/components/library-view-menu-group";
import { type SortKey, useView } from "@/hooks/use-view";
import { VIEW_DEFAULTS } from "@/stores/view-store";

type KeyOption = { value: SortKey; label: string };

const KEY_GROUPS: Array<{ label: string; options: KeyOption[] }> = [
  {
    label: "Date",
    options: [
      { value: "savedAt", label: "Date saved" },
      { value: "createdAt", label: "Date added" },
    ],
  },
  {
    label: "Content",
    options: [
      { value: "title", label: "Title" },
      { value: "type", label: "Type" },
      { value: "creator", label: "Creator" },
      { value: "source", label: "Source" },
    ],
  },
  {
    label: "File",
    options: [
      { value: "fileSize", label: "Size" },
      { value: "fileCount", label: "File count" },
      { value: "dimensions", label: "Dimensions" },
    ],
  },
];

const KEY_LABELS: Record<SortKey, string> = Object.fromEntries(
  KEY_GROUPS.flatMap((g) => g.options).map((o) => [o.value, o.label]),
) as Record<SortKey, string>;

export function SortSection() {
  const { state, actions } = useView();
  const { key, dir } = state.sort;
  const changed =
    key !== VIEW_DEFAULTS.sortKey || dir !== VIEW_DEFAULTS.sortDir;

  return (
    <Group title="Sort by" changed={changed}>
      <div className={styles.sortRow}>
        <Select.Root
          value={key}
          onValueChange={(value) =>
            actions.setSort({ key: value as SortKey, dir })
          }
        >
          <Select.Trigger className={styles.sortField}>
            <Select.Value>{(value: SortKey) => KEY_LABELS[value]}</Select.Value>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <Select.List>
                  {KEY_GROUPS.map((group, i) => (
                    <Select.Group key={group.label}>
                      {i > 0 ? <Select.Separator /> : null}
                      <Select.GroupLabel>{group.label}</Select.GroupLabel>
                      {group.options.map(({ label, value }) => (
                        <Select.Item key={value} value={value}>
                          <Select.ItemText>{label}</Select.ItemText>
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Group>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>

        <button
          type="button"
          className={styles.dirButton}
          aria-label="Toggle sort direction"
          onClick={() =>
            actions.setSort({ key, dir: dir === "asc" ? "desc" : "asc" })
          }
        >
          {dir === "asc" ? (
            <AscendingIcon size={14} />
          ) : (
            <DescendingIcon size={14} />
          )}
          {dir === "asc" ? "Asc" : "Desc"}
        </button>
      </div>
    </Group>
  );
}

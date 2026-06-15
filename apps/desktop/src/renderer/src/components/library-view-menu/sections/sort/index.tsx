import {
  IconAscendingSortingFill18 as AscendingIcon,
  IconDescendingSortingFill18 as DescendingIcon,
  IconSortingFill18 as SortIcon,
} from "@pond/icons/fill/18";
import { Select } from "@pond/ui";
import { type SortKey, useView } from "@/hooks/use-view";
import { ViewSubmenu } from "../../submenu";
import submenu from "../../submenu.module.css";

const KEY_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "savedAt", label: "Date saved" },
  { value: "title", label: "Title" },
  { value: "fileSize", label: "Size" },
];

const KEY_LABELS: Record<SortKey, string> = Object.fromEntries(
  KEY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<SortKey, string>;

export function SortSection({ standalone }: { standalone?: boolean }) {
  const { state, actions } = useView();
  const { key, dir } = state.sort;

  return (
    <ViewSubmenu icon={<SortIcon />} label="Sort by" standalone={standalone}>
      <div className={submenu.sortRow}>
        <Select.Root
          value={key}
          onValueChange={(value) =>
            actions.setSort({ key: value as SortKey, dir })
          }
        >
          <Select.Trigger className={submenu.sortField}>
            <Select.Value>{(value: SortKey) => KEY_LABELS[value]}</Select.Value>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <Select.List>
                  {KEY_OPTIONS.map(({ label, value }) => (
                    <Select.Item key={value} value={value}>
                      <Select.ItemText>{label}</Select.ItemText>
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>

        <button
          type="button"
          className={submenu.dirButton}
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
    </ViewSubmenu>
  );
}

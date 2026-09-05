import { IconDescendingSortingOutline18 } from "@pond/icons/outline/18";
import { Menu, Toggle, ToggleGroup, Tooltip } from "@pond/ui";
import { isSortKey } from "@/features/library/hooks/use-filtered-saves";
import { type SortKey, useView } from "@/features/library/hooks/use-view";
import { libraryHeader } from "@/features/library/state/library-header";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import styles from "./sort.module.css";

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

export function SortMenu() {
  const { state, actions } = useView();
  const { key, dir } = state.sort;
  const scrollFade = useScrollFade<HTMLDivElement>();

  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (open) libraryHeader.closePopover();
      }}
    >
      <Tooltip label="Sort" side="bottom">
        <Menu.Trigger icon size="sm" variant="ghost" aria-label="Sort">
          <IconDescendingSortingOutline18
            className={styles.icon}
            data-asc={dir === "asc" || undefined}
          />
        </Menu.Trigger>
      </Tooltip>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6}>
          <Menu.Popup className={styles.popup} {...scrollFade}>
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
              <Toggle value="asc" size="sm">
                Ascending
              </Toggle>
              <Toggle value="desc" size="sm">
                Descending
              </Toggle>
            </ToggleGroup>
            <Menu.Separator />
            {KEY_GROUPS.map((group) => (
              <Menu.SubmenuRoot key={group.label}>
                <Menu.SubmenuTrigger>
                  <Menu.ItemLabel>{group.label}</Menu.ItemLabel>
                </Menu.SubmenuTrigger>
                <Menu.Portal>
                  <Menu.Positioner
                    side="inline-end"
                    align="start"
                    sideOffset={6}
                  >
                    <Menu.Popup>
                      <Menu.RadioGroup
                        value={key}
                        onValueChange={(value) => {
                          if (isSortKey(value)) {
                            actions.setSort({ key: value, dir });
                          }
                        }}
                      >
                        {group.options.map((option) => (
                          <Menu.RadioItem
                            key={option.value}
                            value={option.value}
                          >
                            <Menu.RadioItemIndicator />
                            <Menu.ItemLabel>{option.label}</Menu.ItemLabel>
                          </Menu.RadioItem>
                        ))}
                      </Menu.RadioGroup>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.SubmenuRoot>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

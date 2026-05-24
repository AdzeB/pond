import { Menu } from "@pond/ui";
import { Bookmark, CircleQuestionMark, Ellipsis } from "lucide-react";
import { Rail } from "./rail";
import styles from "./styles.module.css";
import { TagItem } from "./tag-item";

interface EmptyStateProps {
  hasAnyTags: boolean;
  needle: string;
  query: string;
}

function EmptyState({ hasAnyTags, needle, query }: EmptyStateProps) {
  if (needle) {
    return (
      <div className={styles.empty}>
        <div className={styles["empty-title"]}>No matches</div>
        <div className={styles["empty-subtitle"]}>No tags match "{query}".</div>
      </div>
    );
  }
  return (
    <div className={styles.empty}>
      <div className={styles["empty-art"]} aria-hidden>
        <Bookmark width={56} height={56} />
        <span className={styles["empty-art-overlay"]}>
          <CircleQuestionMark width={18} height={18} />
        </span>
      </div>
      <div className={styles["empty-title"]}>No Tags Yet</div>
      <div className={styles["empty-subtitle"]}>
        {hasAnyTags
          ? "This section is empty. Drag tags here or pick one from the rail."
          : "Add tags to your saves for a proper organization. Tags also help when searching."}
      </div>
    </div>
  );
}

interface DisplayMenuProps {
  prefs: {
    showCounts?: boolean;
    sort?: "name" | "count" | "recent";
    gridSize?: "sm" | "md" | "lg";
  };
  patch: (next: Record<string, unknown>) => void;
}

function DisplayMenu({ prefs, patch }: DisplayMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <button
            type="button"
            className={styles["display-trigger"]}
            aria-label="Display options"
            title="Display options"
          >
            <Ellipsis width={16} height={16} />
          </button>
        }
      />
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6}>
          <Menu.Popup>
            <Menu.CheckboxItem
              closeOnClick={false}
              checked={prefs.showCounts ?? true}
              onCheckedChange={(v) => patch({ showCounts: v })}
            >
              <Menu.ItemLabel>Show Counts</Menu.ItemLabel>
            </Menu.CheckboxItem>
            <Menu.Separator />
            <Menu.RadioGroup
              value={prefs.sort ?? "name"}
              onValueChange={(v) => patch({ sort: v })}
            >
              <Menu.RadioItem value="name">
                <Menu.ItemLabel>Sort by Name</Menu.ItemLabel>
              </Menu.RadioItem>
              <Menu.RadioItem value="count">
                <Menu.ItemLabel>Sort by Count</Menu.ItemLabel>
              </Menu.RadioItem>
              <Menu.RadioItem value="recent">
                <Menu.ItemLabel>Sort by Recently Used</Menu.ItemLabel>
              </Menu.RadioItem>
            </Menu.RadioGroup>
            <Menu.Separator />
            <Menu.RadioGroup
              value={prefs.gridSize ?? "md"}
              onValueChange={(v) => patch({ gridSize: v })}
            >
              <Menu.RadioItem value="sm">
                <Menu.ItemLabel>Small Tiles</Menu.ItemLabel>
              </Menu.RadioItem>
              <Menu.RadioItem value="md">
                <Menu.ItemLabel>Medium Tiles</Menu.ItemLabel>
              </Menu.RadioItem>
              <Menu.RadioItem value="lg">
                <Menu.ItemLabel>Large Tiles</Menu.ItemLabel>
              </Menu.RadioItem>
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export const AllTags = { Rail, TagItem, EmptyState, DisplayMenu };
export type { RailKey } from "./rail";
export type { DisplayItem } from "./tag-item";

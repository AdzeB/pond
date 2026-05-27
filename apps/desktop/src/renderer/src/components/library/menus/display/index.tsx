import { Menu } from "@pond/ui";
import { Ellipsis } from "lucide-react";
import styles from "./styles.module.css";

interface DisplayMenuProps {
  prefs: {
    showCounts?: boolean;
    sort?: "name" | "count" | "recent";
    gridSize?: "sm" | "md" | "lg";
  };
  patch: (next: Record<string, unknown>) => void;
}

export function DisplayMenu({ prefs, patch }: DisplayMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        type="button"
        className={styles.trigger}
        aria-label="Display options"
        title="Display options"
      >
        <Ellipsis width={16} height={16} />
      </Menu.Trigger>
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

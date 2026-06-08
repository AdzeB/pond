import { Button, Menu } from "@pond/ui";
import { useState } from "react";
import { TagMenu } from "@/components/primitives/menus/tag-menu";

interface BulkTagsComboboxProps {
  onPick: (name: string) => void;
  disabled?: boolean;
}

/**
 * A creatable tag picker: filters existing tags as you type and offers to
 * create a new tag (optionally inside a group via `Group/Label`) when there is
 * no exact match. Selecting an item commits the tag (the caller decides what
 * "commit" means) and closes the menu.
 */
export function BulkTagsCombobox({ onPick, disabled }: BulkTagsComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Menu.Trigger
        disabled={disabled}
        render={
          <Button size="sm" disabled={disabled}>
            Add tag…
          </Button>
        }
      />
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start">
          <Menu.Popup>
            <TagMenu
              onToggle={onPick}
              closeOnSelect
              allowCreate
              groupsAs="submenu"
              placeholder="Add tag…"
              emptyLabel="No tags."
            />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

import { IconDotsFill18 as Ellipsis } from "@pond/icons/fill/18";
import { Menu } from "@pond/ui";
import { useState } from "react";
import { buildSaveMenu } from "@/features/saves/lib/menu";
import type { Save } from "@/features/saves/types";
import { tagClipboard } from "@/features/tags/state/tag-clipboard";

export function KebabMenu({
  save,
  fileIndex = null,
}: {
  save: Save;
  fileIndex?: number | null;
}) {
  const [clipboardEmpty, setClipboardEmpty] = useState(
    () => tagClipboard.get().length === 0,
  );
  const items = buildSaveMenu(save, { clipboardEmpty, fileIndex });

  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (open) setClipboardEmpty(tagClipboard.get().length === 0);
      }}
    >
      <Menu.Trigger variant="ghost" size="xs" icon aria-label="Save Actions">
        <Ellipsis />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" sideOffset={6}>
          <Menu.Popup>
            <Menu.Items items={items} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

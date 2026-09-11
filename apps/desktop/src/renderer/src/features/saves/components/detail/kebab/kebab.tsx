import { IconDotsFill18 as Ellipsis } from "@pond/icons/fill/18";
import { Menu } from "@pond/ui";
import { useState } from "react";
import {
  buildSaveMenu,
  loadOpenWithApps,
  type OpenWithApp,
  openWithKind,
  peekOpenWithApps,
} from "@/features/saves/lib/menu";
import type { Save } from "@/features/saves/types";
import { tagClipboard } from "@/features/tags/state/tag-clipboard";
import { SpecMenu } from "@/shared/components/spec-context-menu/spec-context-menu";

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
  const [openWithApps, setOpenWithApps] = useState<OpenWithApp[]>([]);

  return (
    <SpecMenu
      search
      searchLabel="Search save operations"
      buildItems={() => {
        const peeked = peekOpenWithApps(openWithKind(save, fileIndex));
        return buildSaveMenu(save, {
          clipboardEmpty,
          fileIndex,
          openWithApps: peeked.length ? peeked : openWithApps,
        });
      }}
      onOpen={() => {
        setClipboardEmpty(tagClipboard.get().length === 0);
        void loadOpenWithApps({
          ids: [save.id],
          fileIndex,
          kind: openWithKind(save, fileIndex),
          onApps: setOpenWithApps,
        });
      }}
    >
      <Menu.Trigger variant="ghost" size="xs" icon aria-label="Save Actions">
        <Ellipsis />
      </Menu.Trigger>
    </SpecMenu>
  );
}

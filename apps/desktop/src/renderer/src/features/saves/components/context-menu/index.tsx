import type { ReactElement } from "react";
import { useState } from "react";
import {
  buildSaveMenu,
  contextMenuSaves,
  loadOpenWithApps,
  type OpenWithApp,
  openWithKind,
  peekOpenWithApps,
} from "@/features/saves/lib/menu";
import { selectOnlySave } from "@/features/saves/lib/select";
import { selection } from "@/features/saves/state/selection";
import type { Save } from "@/features/saves/types";
import { tagClipboard } from "@/features/tags";
import { SpecContextMenu } from "@/shared/components/spec-context-menu";

interface SaveContextMenuProps {
  save: Save;
  children: ReactElement;
}

export function SaveContextMenu({ save, children }: SaveContextMenuProps) {
  const [openWithApps, setOpenWithApps] = useState<OpenWithApp[]>([]);
  return (
    <SpecContextMenu
      search
      searchLabel="Search save operations"
      minWidth="280px"
      onOpen={() => {
        if (!selection.has(save.id)) selectOnlySave(save.id);
        const targets = contextMenuSaves(save);
        const kind = openWithKind(targets[0] ?? save);
        void loadOpenWithApps({
          ids: targets.map((item) => item.id),
          kind,
          onApps: setOpenWithApps,
        });
      }}
      buildItems={() => {
        const targets = contextMenuSaves(save);
        const peeked = peekOpenWithApps(openWithKind(targets[0] ?? save));
        return buildSaveMenu(targets, {
          clipboardEmpty: tagClipboard.get().length === 0,
          openWithApps: peeked.length ? peeked : openWithApps,
        });
      }}
    >
      {children}
    </SpecContextMenu>
  );
}

import { useDataTable } from "@pond/ui";
import type { ReactElement } from "react";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import { sourceDetail } from "@/features/sources/state/source-detail";
import { SpecContextMenu } from "@/shared/components/spec-context-menu";
import type { SourceTableRow } from "./lib/helpers";
import { buildSourceMenu, contextMenuSources } from "./lib/menu";

interface SourcesContextMenuProps {
  row: SourceTableRow;
  children: ReactElement;
}

export function SourcesContextMenu({ row, children }: SourcesContextMenuProps) {
  const { selectionStore, actions } = useDataTable<SourceTableRow>();
  const { accounts } = useAccounts();
  return (
    <SpecContextMenu
      onOpen={() => {
        if (selectionStore.state.selectedIds.has(row.id)) return;
        actions.replaceSelection([row.id]);
      }}
      buildItems={() =>
        buildSourceMenu(contextMenuSources(row), {
          accounts,
          onChanged: sourceDetail.changed,
        })
      }
    >
      {children}
    </SpecContextMenu>
  );
}

import type { MenuItemSpec } from "@pond/ui";
import type { CardModel } from "@/components/library-sync-monitor/lib/helpers";
import type { AccountRow } from "@/hooks/use-accounts";

/** Maintenance actions shared by the dock account "More" dropdown and the source tile right-click menu. */
export function buildAccountMenu(
  account: AccountRow,
  model: CardModel,
): MenuItemSpec[] {
  const { source } = account;
  return [
    {
      label: "Backfill",
      disabled: !(model.connected && model.tone !== "run"),
      onClick: () =>
        void window.pond.syncRunNow(account.id, { forceFull: true }),
    },
    {
      label: "Refresh Metadata",
      disabled: !model.connected,
      onClick: () => void window.pond.refreshBackfillStart({ source }),
    },
    {
      label: "Download Full Quality",
      disabled: !model.connected,
      onClick: () =>
        void window.pond.refreshBackfillStart({ source, overwrite: true }),
    },
  ];
}

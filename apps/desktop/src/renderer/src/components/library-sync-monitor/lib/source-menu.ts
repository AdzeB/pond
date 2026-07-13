import type { Source } from "@pond/schema/db";
import type { NativeMenuItem } from "@/lib/ui/native-menu";
import type { CardModel } from "./helpers";

/** Sync actions target the account; connect and metadata refresh stay per-platform. */
export function buildAccountMenu(
  account: { id: string; source: Source },
  model: CardModel,
  onOpen: () => void,
): NativeMenuItem[] {
  const { id, source } = account;
  const running = model.tone === "run";

  const primary: NativeMenuItem = running
    ? {
        label: "Cancel sync",
        onSelect: () => void window.pond.syncCancel(id),
      }
    : model.tone === "paused"
      ? {
          label: "Reconnect",
          onSelect: () => void window.pond.connectSource(source),
        }
      : model.tone === "err"
        ? {
            label: "Retry now",
            onSelect: () => void window.pond.syncRunNow(id),
          }
        : !model.connected
          ? {
              label: "Connect",
              onSelect: () => void window.pond.connectSource(source),
            }
          : {
              label: "Sync now",
              onSelect: () => void window.pond.syncRunNow(id),
            };

  const items: NativeMenuItem[] = [primary];

  if (model.connected && !running) {
    items.push(
      {
        label: "Backfill",
        onSelect: () => void window.pond.syncRunNow(id, { forceFull: true }),
      },
      {
        label: "Refresh metadata",
        onSelect: () => void window.pond.refreshBackfillStart({ source }),
      },
      {
        label: "Re-download at full quality",
        onSelect: () =>
          void window.pond.refreshBackfillStart({ source, overwrite: true }),
      },
    );
  }

  items.push(
    { type: "separator" },
    { label: "Open settings", onSelect: onOpen },
  );

  return items;
}

import type { Source } from "@pond/schema/db";
import type { NativeMenuItem } from "@/lib/ui/native-menu";
import type { CardModel } from "./helpers";

// The per-source action menu for the sources dock tray, kept in lockstep with
// the live status (`cardModel`).
export function buildSourceMenu(
  source: Source,
  model: CardModel,
  onOpen: (source: Source) => void,
): NativeMenuItem[] {
  const running = model.tone === "run";

  const primary: NativeMenuItem = running
    ? {
        label: "Cancel sync",
        onSelect: () => void window.pond.syncCancel(source),
      }
    : model.tone === "paused"
      ? {
          label: "Reconnect",
          onSelect: () => void window.pond.connectSource(source),
        }
      : model.tone === "err"
        ? {
            label: "Retry now",
            onSelect: () => void window.pond.syncRunNow(source),
          }
        : !model.connected
          ? {
              label: "Connect",
              onSelect: () => void window.pond.connectSource(source),
            }
          : {
              label: "Sync now",
              onSelect: () => void window.pond.syncRunNow(source),
            };

  const items: NativeMenuItem[] = [primary];

  if (model.connected && !running) {
    items.push(
      {
        label: "Backfill",
        onSelect: () =>
          void window.pond.syncRunNow(source, { forceFull: true }),
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
    { label: "Open settings", onSelect: () => onOpen(source) },
  );

  return items;
}

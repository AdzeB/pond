import type { Source } from "@pond/schema/db";
import { TrayCard } from "@pond/ui";
import { useDock } from "@/components/library-dock/lib/context";
import { SourcePicker } from "@/components/source-picker";
import { WATCHABLE } from "@/hooks/use-watches";
import { watchFlow } from "@/stores/watch-flow";

/** Watch-source picker in the dock tray; picking moves to the handle card. */
export function WatchSourceSection() {
  const dock = useDock();

  const pick = (source: Source) => {
    watchFlow.pick(source);
    dock.openViewMenu("watch-target");
  };

  return (
    <>
      <TrayCard.Close />
      <TrayCard.Header position="center">
        <TrayCard.Title>Watch an Account</TrayCard.Title>
        <TrayCard.Separator />
        <TrayCard.Description>
          Follow someone's public posts — read-only, nothing is posted or
          followed on your behalf.
        </TrayCard.Description>
      </TrayCard.Header>
      <SourcePicker sources={WATCHABLE} onPick={pick} />
    </>
  );
}

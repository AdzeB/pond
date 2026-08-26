import type { Source } from "@pond/schema/db";
import { TrayCard } from "@pond/ui";
import { useDock } from "@/components/library/dock/lib/context";
import { SourcePicker } from "@/components/shared/source-picker";
import { WATCHABLE, watchKindsFor } from "@/hooks/use-watches";
import { watchFlow } from "@/stores/watch-flow";

export function WatchSourceSection() {
  const dock = useDock();

  const pick = (source: Source) => {
    watchFlow.pick(source);
    dock.openViewMenu(
      watchKindsFor(source).length > 1 ? "watch-kind" : "watch-target",
    );
  };

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Help onClick={() => dock.openViewMenu("watch-help")} />
        <TrayCard.Title position="center">Watch an Account</TrayCard.Title>
        <TrayCard.Close
          onClick={(e) => {
            e.preventDefault();
            dock.openViewMenu("source-new");
          }}
        />
        <TrayCard.Separator />
      </TrayCard.Header>
      <SourcePicker sources={WATCHABLE} onPick={pick} />
    </>
  );
}

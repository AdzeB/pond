import { SOURCES, type Source } from "@pond/schema/db";
import { TrayCard } from "@pond/ui";
import { useDock } from "@/components/library-dock/lib/context";
import { SourcePicker } from "@/components/source-picker";
import { useAccounts } from "@/hooks/use-accounts";
import { connectFlow } from "@/stores/connect-flow";

/** `local` and `web` aren't sources you sign in to. */
const SYNCABLE: readonly Source[] = SOURCES.filter(
  (s) => s !== "local" && s !== "web",
);

/** Source picker in the dock tray; picking starts the browser sign-in and moves to the connect-wait card. */
export function ConnectSourceSection() {
  const dock = useDock();
  const { accounts } = useAccounts();

  const pick = (source: Source) => {
    connectFlow.start(
      source,
      accounts.filter((a) => a.connected).map((a) => a.id),
    );
    dock.openViewMenu("connect-wait");
  };

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Help onClick={() => dock.openViewMenu("connect-help")} />
        <TrayCard.Title position="center">Connect a Source</TrayCard.Title>
        <TrayCard.Close
          onClick={(e) => {
            e.preventDefault();
            dock.openViewMenu("source-new");
          }}
        />
        <TrayCard.Separator />
      </TrayCard.Header>
      <SourcePicker sources={SYNCABLE} onPick={pick} />
    </>
  );
}

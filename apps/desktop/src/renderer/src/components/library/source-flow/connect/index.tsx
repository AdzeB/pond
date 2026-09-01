import { SOURCES, type Source } from "@pond/schema/db";
import { SourcePicker } from "@/components/shared/source-picker";
import { useAccounts } from "@/hooks/use-accounts";
import { connectFlow } from "@/stores/connect-flow";
import { sourceFlow } from "@/stores/source-flow";

const SYNCABLE: readonly Source[] = SOURCES.filter(
  (s) => s !== "local" && s !== "web",
);

export function ConnectSourceSection() {
  const { accounts } = useAccounts();

  const pick = (source: Source) => {
    connectFlow.start(
      source,
      accounts.filter((a) => a.connected).map((a) => a.id),
    );
    sourceFlow.push("connect-wait");
  };

  return <SourcePicker sources={SYNCABLE} onPick={pick} />;
}

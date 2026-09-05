import { SOURCES, type Source } from "@pond/schema/db";
import { SourcePicker } from "@/features/sources/components/picker/picker";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import { connectFlow } from "@/features/sources/state/connect-flow";
import { sourceFlow } from "@/features/sources/state/source-flow";

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

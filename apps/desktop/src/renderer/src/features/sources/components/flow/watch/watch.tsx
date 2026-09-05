import type { Source } from "@pond/schema/db";
import { SourcePicker } from "@/features/sources/components/picker/picker";
import { WATCHABLE, watchKindsFor } from "@/features/sources/hooks/use-watches";
import { sourceFlow } from "@/features/sources/state/source-flow";
import { watchFlow } from "@/features/sources/state/watch-flow";

export function WatchSourceSection() {
  const pick = (source: Source) => {
    watchFlow.pick(source);
    sourceFlow.push(
      watchKindsFor(source).length > 1 ? "watch-kind" : "watch-target",
    );
  };

  return <SourcePicker sources={WATCHABLE} onPick={pick} />;
}

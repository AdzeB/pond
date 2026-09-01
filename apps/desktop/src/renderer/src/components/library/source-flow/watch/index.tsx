import type { Source } from "@pond/schema/db";
import { SourcePicker } from "@/components/shared/source-picker";
import { WATCHABLE, watchKindsFor } from "@/hooks/use-watches";
import { sourceFlow } from "@/stores/source-flow";
import { watchFlow } from "@/stores/watch-flow";

export function WatchSourceSection() {
  const pick = (source: Source) => {
    watchFlow.pick(source);
    sourceFlow.push(
      watchKindsFor(source).length > 1 ? "watch-kind" : "watch-target",
    );
  };

  return <SourcePicker sources={WATCHABLE} onPick={pick} />;
}

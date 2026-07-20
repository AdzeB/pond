import { SourceTile } from "@/components/library-sources-page";
import type { MockTile } from "./lib/mock";

/** Ships today: the real component, fed the same lines the sources page computes. */
export function VariantCurrent({ tile }: { tile: MockTile }) {
  const busy =
    tile.tone === "run" || tile.tone === "err" || tile.tone === "paused";

  return (
    <SourceTile
      source={tile.source}
      avatarUrl={tile.avatar}
      name={tile.name}
      sub={busy ? (tile.status ?? tile.identity) : tile.identity}
      value={tile.value}
      tone={tile.tone}
      progress={tile.progress}
      onOpen={() => {}}
    />
  );
}

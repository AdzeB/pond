import type { MockTile } from "./lib/mock";
import { Cover, Frame, Name, Sub } from "./lib/parts";
import css from "./variants.module.css";

/** Proposal F: Attio-style. A tiny dot before the sub line is the only signal; text stays neutral. */
export function VariantDot({ tile }: { tile: MockTile }) {
  const busy =
    tile.tone === "run" ||
    tile.tone === "err" ||
    tile.tone === "paused" ||
    tile.tone === "ok";

  return (
    <Frame tile={tile}>
      <Cover tile={tile} />
      <Name>{tile.name}</Name>
      <Sub>
        {busy ? (
          <>
            <span className={css.dot} data-tone={tile.tone} />
            {tile.status ?? tile.value}
          </>
        ) : (
          tile.value
        )}
      </Sub>
    </Frame>
  );
}

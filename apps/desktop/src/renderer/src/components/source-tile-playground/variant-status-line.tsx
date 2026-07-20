import type { MockTile } from "./lib/mock";
import { Cover, Frame, Name, Sub } from "./lib/parts";
import css from "./variants.module.css";

/** Proposal D: name and identity always stay put; a third line trades between the count and the state. */
export function VariantStatusLine({ tile }: { tile: MockTile }) {
  const busy =
    tile.tone === "run" || tile.tone === "err" || tile.tone === "paused";

  return (
    <Frame tile={tile}>
      <Cover tile={tile}>
        {tile.tone === "run" ? <span className={css["ring-spin"]} /> : null}
      </Cover>
      <Name>{tile.name}</Name>
      <Sub>{tile.identity}</Sub>
      <span className={css.third} data-tone={busy ? tile.tone : undefined}>
        {busy ? (tile.status ?? tile.value) : tile.value}
      </span>
    </Frame>
  );
}

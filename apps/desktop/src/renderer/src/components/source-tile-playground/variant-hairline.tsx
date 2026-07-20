import type { MockTile } from "./lib/mock";
import { Cover, Frame, Name, Sub } from "./lib/parts";
import css from "./variants.module.css";

/** Proposal G: downloads-manager shape. A hairline under the avatar fills with progress; broken states leave a toned mark. */
export function VariantHairline({ tile }: { tile: MockTile }) {
  const busy =
    tile.tone === "run" || tile.tone === "err" || tile.tone === "paused";

  return (
    <Frame tile={tile}>
      <Cover tile={tile} />
      <span className={css.hairline} data-active={busy || undefined}>
        {tile.tone === "run" ? (
          tile.progress != null ? (
            <span
              className={css["hairline-fill"]}
              style={{ width: `${tile.progress * 100}%` }}
            />
          ) : (
            <span className={css["hairline-slide"]} />
          )
        ) : busy ? (
          <span className={css["hairline-fill"]} data-tone={tile.tone} />
        ) : null}
      </span>
      <Name>{tile.name}</Name>
      <Sub>{busy ? (tile.status ?? tile.value) : tile.value}</Sub>
    </Frame>
  );
}

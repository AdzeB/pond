import { IconKey2Fill12, IconTriangleWarningFill12 } from "@pond/icons/fill/12";
import type { MockTile } from "./lib/mock";
import { Cover, Frame, Name, Sub } from "./lib/parts";
import css from "./variants.module.css";

/** Proposal E: App Store install treatment; the artwork dims and carries its own progress. */

const R = 10;
const C = 2 * Math.PI * R;

function MiniRing({ progress }: { progress: number }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      role="img"
      aria-label="Sync progress"
    >
      <circle
        cx="13"
        cy="13"
        r={R}
        fill="none"
        stroke="rgb(255 255 255 / 35%)"
        strokeWidth="2.5"
      />
      <circle
        cx="13"
        cy="13"
        r={R}
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - progress)}
        transform="rotate(-90 13 13)"
      />
    </svg>
  );
}

export function VariantVeil({ tile }: { tile: MockTile }) {
  const busy =
    tile.tone === "run" || tile.tone === "err" || tile.tone === "paused";

  return (
    <Frame tile={tile}>
      <Cover tile={tile} hideBrand={busy}>
        {busy ? (
          <span
            className={css.veil}
            data-shape={tile.avatar ? "round" : "app"}
            data-tone={tile.tone}
          >
            {tile.tone === "run" ? (
              tile.progress != null ? (
                <MiniRing progress={tile.progress} />
              ) : (
                <span className={css["veil-spinner"]} />
              )
            ) : tile.tone === "paused" ? (
              <IconKey2Fill12 width={14} height={14} />
            ) : (
              <IconTriangleWarningFill12 width={14} height={14} />
            )}
          </span>
        ) : null}
      </Cover>
      <Name>{tile.name}</Name>
      <Sub>{busy ? (tile.status ?? tile.value) : tile.value}</Sub>
    </Frame>
  );
}

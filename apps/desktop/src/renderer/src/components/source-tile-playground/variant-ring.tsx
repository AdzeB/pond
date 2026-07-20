import type { MockTile } from "./lib/mock";
import { Cover, Frame, Name, Sub } from "./lib/parts";
import css from "./variants.module.css";

/** Proposal C: the ring is the status channel; determinate when the total is known, toned when broken. */

const R = 31;
const C = 2 * Math.PI * R;

function ProgressRing({ progress }: { progress: number }) {
  return (
    <svg
      className={css.ring}
      viewBox="0 0 66 66"
      role="img"
      aria-label="Sync progress"
    >
      <circle
        className={css["ring-track"]}
        cx="33"
        cy="33"
        r={R}
        fill="none"
        strokeWidth="2"
      />
      <circle
        className={css["ring-fill"]}
        cx="33"
        cy="33"
        r={R}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - progress)}
        transform="rotate(-90 33 33)"
      />
    </svg>
  );
}

export function VariantRing({ tile }: { tile: MockTile }) {
  const warn = tile.tone === "err" || tile.tone === "paused";
  const subTone =
    tile.tone === "run"
      ? ("run" as const)
      : tile.tone === "err"
        ? ("err" as const)
        : tile.tone === "paused"
          ? ("warn" as const)
          : undefined;

  return (
    <Frame tile={tile}>
      <Cover tile={tile}>
        {tile.tone === "run" ? (
          tile.progress != null ? (
            <ProgressRing progress={tile.progress} />
          ) : (
            <span className={css["ring-spin"]} />
          )
        ) : warn ? (
          <span className={css["ring-tone"]} data-tone={tile.tone} />
        ) : null}
      </Cover>
      <Name>{tile.name}</Name>
      <Sub tone={subTone}>
        {tile.tone === "run" || warn ? (tile.status ?? tile.value) : tile.value}
      </Sub>
    </Frame>
  );
}

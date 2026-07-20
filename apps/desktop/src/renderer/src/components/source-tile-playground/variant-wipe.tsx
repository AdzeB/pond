import { getSourceDef } from "@/lib/save/sources-registry";
import type { MockTile } from "./lib/mock";
import { Frame, Name, Sub } from "./lib/parts";
import parts from "./lib/parts.module.css";
import css from "./variants.module.css";

/** Proposal H: broken sources drain to grayscale; syncing pours the color back in with progress. */
export function VariantWipe({ tile }: { tile: MockTile }) {
  const { logo } = getSourceDef(tile.source);
  const src = tile.avatar ?? logo ?? undefined;
  const shapeClass = tile.avatar ? parts.pfp : parts.appicon;
  const broken = tile.tone === "err" || tile.tone === "paused";
  const running = tile.tone === "run";
  const drained = broken || running;

  const subTone =
    tile.tone === "err"
      ? ("err" as const)
      : tile.tone === "paused"
        ? ("warn" as const)
        : undefined;

  return (
    <Frame tile={tile}>
      <span className={parts.cover}>
        <span className={parts.frame}>
          <img
            src={src}
            alt=""
            className={shapeClass}
            data-drained={drained || undefined}
          />
          {running ? (
            tile.progress != null ? (
              <img
                src={src}
                alt=""
                className={`${shapeClass} ${css.wipe}`}
                style={{
                  clipPath: `inset(${(1 - tile.progress) * 100}% 0 0 0)`,
                }}
              />
            ) : (
              <img
                src={src}
                alt=""
                className={`${shapeClass} ${css.wipe} ${css["wipe-pulse"]}`}
              />
            )
          ) : null}
          {tile.avatar && logo ? (
            <img
              width={16}
              height={16}
              src={logo}
              alt=""
              className={parts.brand}
            />
          ) : null}
        </span>
      </span>
      <Name>{tile.name}</Name>
      <Sub tone={subTone}>
        {running || broken ? (tile.status ?? tile.value) : tile.value}
      </Sub>
    </Frame>
  );
}

import {
  IconCheckFill12,
  IconKey2Fill12,
  IconTriangleWarningFill12,
} from "@pond/icons/fill/12";
import type { MockTile, TileTone } from "./lib/mock";
import { Cover, Frame, Name, Sub } from "./lib/parts";
import css from "./variants.module.css";

/** Proposal B: the corner chip carries state, so name and count never get displaced. */

function StatusBadge({ tone }: { tone: TileTone }) {
  if (tone === "idle") return null;
  return (
    <span className={css["status-badge"]} data-tone={tone}>
      {tone === "run" ? (
        <span className={css["badge-spinner"]} />
      ) : tone === "ok" ? (
        <IconCheckFill12 width={9} height={9} />
      ) : tone === "paused" ? (
        <IconKey2Fill12 width={9} height={9} />
      ) : (
        <IconTriangleWarningFill12 width={9} height={9} />
      )}
    </span>
  );
}

export function VariantBadge({ tile }: { tile: MockTile }) {
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
      <Cover tile={tile} hideBrand={tile.tone !== "idle"}>
        <StatusBadge tone={tile.tone} />
      </Cover>
      <Name>{tile.name}</Name>
      <Sub tone={subTone}>
        {tile.tone === "run" || warn ? (tile.status ?? tile.value) : tile.value}
      </Sub>
    </Frame>
  );
}

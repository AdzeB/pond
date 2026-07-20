import { getSourceDef } from "@/lib/save/sources-registry";
import type { MockTile } from "./lib/mock";
import css from "./redesigns.module.css";

/** Ten structural redesigns of the source tile, from list rows to posters; see redesigns.module.css. */

type Shape = "circle" | "squircle" | "square";

function Art({
  tile,
  size,
  shape,
  brand = false,
}: {
  tile: MockTile;
  size: number;
  shape?: Shape;
  brand?: boolean;
}) {
  const { logo } = getSourceDef(tile.source);
  const resolved: Shape = shape ?? (tile.avatar ? "circle" : "squircle");

  return (
    <span
      className={css.art}
      data-shape={resolved === "circle" ? undefined : resolved}
      style={{ width: size, height: size }}
    >
      {tile.avatar ? (
        <img src={tile.avatar} alt="" className={css.artImg} />
      ) : logo ? (
        <img src={logo} alt="" className={css.artLogo} />
      ) : null}
      {brand && tile.avatar && logo ? (
        <img
          src={logo}
          alt=""
          width={Math.round(size * 0.34)}
          height={Math.round(size * 0.34)}
          className={css.artBrand}
        />
      ) : null}
    </span>
  );
}

/** Bare number from the "1,204 items" value line. */
function countOf(tile: MockTile): string {
  return tile.value.split(" ")[0] ?? tile.value;
}

function busyTone(tile: MockTile): boolean {
  return tile.tone === "run" || tile.tone === "err" || tile.tone === "paused";
}

/** Dot + status while active, otherwise the given resting text. */
function StatusText({ tile, resting }: { tile: MockTile; resting: string }) {
  if (!busyTone(tile)) return <>{resting}</>;
  return (
    <>
      <span className={css.statusDot} data-tone={tile.tone} />
      {tile.status ?? resting}
    </>
  );
}

/** R1: settings-style list row; name and status left, count right. */
export function RedesignRow({ tile }: { tile: MockTile }) {
  return (
    <button type="button" className={css.row}>
      <Art tile={tile} size={32} brand />
      <span className={css.rowText}>
        <span className={css.rowName}>{tile.name}</span>
        <span className={css.rowSub}>
          <StatusText tile={tile} resting={tile.identity} />
        </span>
      </span>
      <span className={css.rowValue}>{tile.value}</span>
    </button>
  );
}

/** R2: profile card; blurred artwork band with the avatar overlapping it. */
export function RedesignCard({ tile }: { tile: MockTile }) {
  const { logo } = getSourceDef(tile.source);
  const backdrop = tile.avatar ?? logo;

  return (
    <button type="button" className={css.card}>
      <span className={css.cardBand}>
        {backdrop ? (
          <img src={backdrop} alt="" className={css.blurImg} />
        ) : null}
      </span>
      <span className={css.cardArt}>
        <Art tile={tile} size={44} brand />
      </span>
      <span className={css.cardName}>{tile.name}</span>
      <span className={css.cardSub}>
        <StatusText tile={tile} resting={tile.identity} />
      </span>
      <span className={css.cardMeta}>{tile.value}</span>
    </button>
  );
}

/** R3: poster; the artwork is the tile, text sits on a scrim. */
export function RedesignPoster({ tile }: { tile: MockTile }) {
  const { logo } = getSourceDef(tile.source);

  return (
    <button type="button" className={css.poster}>
      {tile.avatar ? (
        <img src={tile.avatar} alt="" className={css.posterImg} />
      ) : logo ? (
        <img src={logo} alt="" className={css.posterLogo} />
      ) : null}
      <span className={css.posterScrim} />
      <span className={css.posterText}>
        <span className={css.posterName}>{tile.name}</span>
        <span className={css.posterSub}>
          <StatusText tile={tile} resting={tile.value} />
        </span>
      </span>
    </button>
  );
}

/** R4: editorial; left-aligned squircle artwork over flush-left text. */
export function RedesignEditorial({ tile }: { tile: MockTile }) {
  return (
    <button type="button" className={css.editorial}>
      <Art tile={tile} size={40} shape="squircle" brand />
      <span>
        <span className={css.editorialName}>{tile.name}</span>
        <span className={css.editorialSub}>
          <StatusText tile={tile} resting={tile.value} />
        </span>
      </span>
    </button>
  );
}

/** R5: launcher; a big centered app icon with a short label. */
export function RedesignAppIcon({ tile }: { tile: MockTile }) {
  return (
    <button type="button" className={css.appIcon}>
      <Art tile={tile} size={56} shape="squircle" brand />
      <span className={css.appIconName}>{tile.name}</span>
      <span className={css.appIconSub}>
        <StatusText tile={tile} resting={tile.value} />
      </span>
    </button>
  );
}

/** R6: split card; bordered, artwork left, everything else stacked right. */
export function RedesignSplit({ tile }: { tile: MockTile }) {
  return (
    <button type="button" className={css.split}>
      <Art tile={tile} size={40} brand />
      <span className={css.splitText}>
        <span className={css.splitName}>{tile.name}</span>
        <span className={css.splitSub}>
          <StatusText tile={tile} resting={tile.identity} />
        </span>
        <span className={css.splitValue}>{tile.value}</span>
      </span>
    </button>
  );
}

/** R7: stat card; the item count leads, the source identifies itself below. */
export function RedesignStat({ tile }: { tile: MockTile }) {
  return (
    <button type="button" className={css.stat}>
      <span className={css.statValue}>{countOf(tile)}</span>
      <span>
        <span className={css.statWho}>
          <Art tile={tile} size={16} />
          {tile.name}
        </span>
        <span className={css.statSub}>
          <StatusText tile={tile} resting={tile.identity} />
        </span>
      </span>
    </button>
  );
}

/** R8: chip; sources as compact pills that wrap like tags. */
export function RedesignChip({ tile }: { tile: MockTile }) {
  return (
    <button type="button" className={css.chip}>
      <Art tile={tile} size={22} />
      <span className={css.chipName}>{tile.name}</span>
      <span className={css.chipMeta}>
        <StatusText tile={tile} resting={countOf(tile)} />
      </span>
    </button>
  );
}

/** R9: table row; dense, scannable, status in its own column. */
export function RedesignTable({ tile }: { tile: MockTile }) {
  return (
    <button type="button" className={css.tableRow}>
      <Art tile={tile} size={20} />
      <span className={css.tableName}>{tile.name}</span>
      <span className={css.tableStatus}>
        <StatusText tile={tile} resting={tile.identity} />
      </span>
      <span className={css.tableValue}>{tile.value}</span>
    </button>
  );
}

/** R10: banner; blurred artwork bleeds in from the left edge of a wide bar. */
export function RedesignBanner({ tile }: { tile: MockTile }) {
  const { logo } = getSourceDef(tile.source);
  const backdrop = tile.avatar ?? logo;

  return (
    <button type="button" className={css.banner}>
      <span className={css.bannerBackdrop}>
        {backdrop ? (
          <img src={backdrop} alt="" className={css.blurImg} />
        ) : null}
      </span>
      <span className={css.bannerContent}>
        <Art tile={tile} size={36} brand />
        <span className={css.bannerText}>
          <span className={css.bannerName}>{tile.name}</span>
          <span className={css.bannerSub}>
            <StatusText tile={tile} resting={tile.identity} />
          </span>
        </span>
        <span className={css.bannerValue}>{tile.value}</span>
      </span>
    </button>
  );
}

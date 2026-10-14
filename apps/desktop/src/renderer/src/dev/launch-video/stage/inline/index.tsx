import type { ComponentType, SVGProps } from "react";
import { clamp, ease, mix, progress } from "../timeline";
import styles from "./styles.module.css";

type Glyph = ComponentType<SVGProps<SVGSVGElement>>;

/** Brand marks are full-colour tiles; provider marks are glyphs on a white tile. */
export type Kind = "brand" | "glyph";

const back = (p: number) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2;

interface TileProps {
  Icon: Glyph;
  kind: Kind;
  pop?: number;
}

function Tile({ Icon, kind, pop = 1 }: TileProps) {
  return (
    <span
      className={styles.tile}
      data-kind={kind}
      style={{
        opacity: clamp(pop * 3),
        transform: `scale(${mix(0.3, 1, back(pop))})`,
      }}
    >
      <Icon className={styles.icon} />
    </span>
  );
}

interface RowProps {
  t: number;
  at: number;
  icons: readonly Glyph[];
  kind: Kind;
}

/** Marks that pop in one after another inside a sentence. */
function Row({ t, at, icons, kind }: RowProps) {
  return (
    <span className={styles.row}>
      {icons.map((Icon, k) => (
        <Tile
          // biome-ignore lint/suspicious/noArrayIndexKey: icon lists are static
          key={k}
          Icon={Icon}
          kind={kind}
          pop={progress(t, at + k * 90, 520)}
        />
      ))}
    </span>
  );
}

interface CycleProps {
  t: number;
  at: number;
  icons: readonly Glyph[];
  kind: Kind;
  step?: number;
}

/** One slot that rolls through marks and rests on the last. */
function Cycle({ t, at, icons, kind, step = 360 }: CycleProps) {
  const index = clamp(Math.floor((t - at) / step), 0, icons.length - 1);
  const swap = ease.outQuint(progress(t, at + index * step, 280));
  const pop = progress(t, at, 520);
  const current = icons[index];
  const previous = index > 0 ? icons[index - 1] : undefined;
  return (
    <span className={styles.slot}>
      {previous ? (
        <span
          className={styles.layer}
          style={{
            opacity: 1 - swap,
            transform: `translateY(${-swap * 0.55}em)`,
            filter: `blur(${swap * 6}px)`,
          }}
        >
          <Tile Icon={previous} kind={kind} />
        </span>
      ) : null}
      {current ? (
        <span
          className={styles.layer}
          style={
            index > 0
              ? {
                  opacity: swap,
                  transform: `translateY(${(1 - swap) * 0.55}em)`,
                  filter: swap < 0.95 ? `blur(${(1 - swap) * 6}px)` : undefined,
                }
              : undefined
          }
        >
          <Tile Icon={current} kind={kind} pop={index > 0 ? 1 : pop} />
        </span>
      ) : null}
    </span>
  );
}

export const Inline = { Tile, Row, Cycle };

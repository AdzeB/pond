import type { ReactNode } from "react";
import { ease, envelope, mix, progress, styled } from "../../stage/timeline";
import { Caption } from "../caption";
import { end, live, start } from "../timeline";
import { Art } from "./art";
import styles from "./styles.module.css";

interface Tile {
  id: string;
  column: string;
  row: string;
  /** Feature name under the art; stat tiles carry their own type. */
  label?: string;
  art: (t: number, at: number) => ReactNode;
}

const TILES: Tile[] = [
  {
    id: "raycast",
    column: "1 / span 2",
    row: "1 / span 2",
    label: "Raycast",
    art: (t, at) => <Art.Raycast t={t} at={at} />,
  },
  {
    id: "smart",
    column: "3 / span 3",
    row: "1",
    label: "Smart Folders",
    art: (t, at) => <Art.Smart t={t} at={at} />,
  },
  {
    id: "cli",
    column: "6 / span 2",
    row: "1",
    label: "CLI",
    art: (t, at) => <Art.Cli t={t} at={at} />,
  },
  {
    id: "similar",
    column: "8",
    row: "1 / span 2",
    label: "Visual Similarity",
    art: (t, at) => <Art.Similar t={t} at={at} />,
  },
  {
    id: "transcription",
    column: "3",
    row: "2 / span 2",
    label: "Transcription",
    art: (t, at) => <Art.Transcript t={t} at={at} />,
  },
  { id: "hero", column: "4 / span 2", row: "2 / span 2", art: () => null },
  {
    id: "models",
    column: "6",
    row: "2 / span 2",
    label: "3D Models",
    art: (t, at) => <Art.Model t={t} at={at} />,
  },
  {
    id: "free",
    column: "7",
    row: "2",
    art: () => <Art.Stat value="Free" detail="and open source" />,
  },
  {
    id: "eagle",
    column: "1",
    row: "3 / span 2",
    label: "Eagle Import",
    art: (t, at) => <Art.Eagle t={t} at={at} />,
  },
  {
    id: "libraries",
    column: "2",
    row: "3 / span 2",
    label: "Multiple Libraries",
    art: (t, at) => <Art.Libraries t={t} at={at} />,
  },
  {
    id: "duplicates",
    column: "7 / span 2",
    row: "3",
    label: "Find Duplicates",
    art: (t, at) => <Art.Duplicates t={t} at={at} />,
  },
  {
    id: "formats",
    column: "3 / span 2",
    row: "4",
    label: "140+ File Formats",
    art: (t, at) => <Art.Formats t={t} at={at} />,
  },
  {
    id: "syncing",
    column: "5 / span 2",
    row: "4",
    label: "Paced Syncing",
    art: (t, at) => <Art.Syncing t={t} at={at} />,
  },
  {
    id: "fonts",
    column: "7",
    row: "4",
    label: "Font Specimens",
    art: (t, at) => <Art.Specimen t={t} at={at} />,
  },
  {
    id: "mac",
    column: "8",
    row: "4",
    art: () => (
      <Art.Stat value="macOS" detail="12 or later, Apple silicon and Intel" />
    ),
  },
];

const span = (track: string) => {
  const [first, size] = track.split(" / span ");
  return Number(first) + (Number(size ?? 1) - 1) / 2;
};

/** Tiles arrive outward from the hero at the grid's center. */
const distance = (tile: Tile) =>
  Math.hypot(span(tile.column) - 4.5, (span(tile.row) - 2.5) * 1.4);

/** Features the cut never shows, edge to edge around the line that says there are more. */
export function Bento({ t }: { t: number }) {
  if (!live(t, "bento")) return null;
  const open = start("bento");
  const close = end("bento") - 450;
  const settle = ease.outQuint(progress(t, open, 1800));
  return (
    <div
      className={styles.bento}
      style={{ transform: `scale(${mix(1.06, 1, settle)})` }}
    >
      <div className={styles.grid}>
        {TILES.map((tile, index) => {
          const enter = open + distance(tile) * 140;
          const e = envelope(t, enter, close, { duration: 800, rise: 20 });
          const scale = mix(0.95, 1, ease.outQuint(progress(t, enter, 800)));
          return (
            <section
              key={tile.id}
              className={styles.tile}
              data-hero={tile.id === "hero" || undefined}
              style={{
                gridColumn: tile.column,
                gridRow: tile.row,
                ...styled(e, `scale(${scale})`),
              }}
            >
              <div className={styles.art}>
                {tile.art(t, open + 650 + index * 70)}
              </div>
              {tile.label ? (
                <span className={styles.label}>{tile.label}</span>
              ) : null}
            </section>
          );
        })}
      </div>
      <Caption t={t} text="And a lot more." enter={open + 450} exit={close} />
    </div>
  );
}

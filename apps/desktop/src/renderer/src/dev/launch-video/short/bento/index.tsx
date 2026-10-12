import type { ReactNode } from "react";
import { envelope, mix, progress, styled } from "../../stage/timeline";
import { Caption } from "../caption";
import { Shift } from "../shift";
import { end, start } from "../timeline";
import { Art } from "./art";
import styles from "./styles.module.css";

interface Feature {
  id: string;
  title: string;
  description: string;
  column: string;
  row: number;
  art: (t: number, at: number) => ReactNode;
}

const FEATURES: Feature[] = [
  {
    id: "raycast",
    title: "Raycast",
    description: "Search and save without opening Pond.",
    column: "1",
    row: 1,
    art: (t, at) => <Art.Raycast t={t} at={at} />,
  },
  {
    id: "smart",
    title: "Smart Folders",
    description: "Folders that fill themselves from rules.",
    column: "2 / span 2",
    row: 1,
    art: (t, at) => <Art.Smart t={t} at={at} />,
  },
  {
    id: "cli",
    title: "CLI",
    description: "Script your library from the terminal.",
    column: "4",
    row: 1,
    art: (t, at) => <Art.Cli t={t} at={at} />,
  },
  {
    id: "transcription",
    title: "Transcription",
    description: "Search videos by what's said in them.",
    column: "1",
    row: 2,
    art: (t, at) => <Art.Transcript t={t} at={at} />,
  },
  {
    id: "similar",
    title: "Visual Similarity",
    description: "Find images that look alike.",
    column: "4",
    row: 2,
    art: (t, at) => <Art.Similar t={t} at={at} />,
  },
  {
    id: "eagle",
    title: "Eagle Import",
    description: "Bring your folders over intact.",
    column: "1",
    row: 3,
    art: (t, at) => <Art.Eagle t={t} at={at} />,
  },
  {
    id: "duplicates",
    title: "Find Duplicates",
    description: "Catch the same image saved twice.",
    column: "2",
    row: 3,
    art: (t, at) => <Art.Duplicates t={t} at={at} />,
  },
  {
    id: "sensitive",
    title: "Sensitive Content",
    description: "Blur thumbnails, checked on your Mac.",
    column: "3 / span 2",
    row: 3,
    art: (t, at) => <Art.Sensitive t={t} at={at} />,
  },
];

/** The grid's middle, where the line sits; tiles arrive outward from it. */
const ORIGIN = { column: 2.5, row: 2 };

const distance = ({ column, row }: Feature) => {
  const [first, span] = column.split(" / span ");
  const center = Number(first) + (Number(span ?? 1) - 1) / 2;
  return Math.hypot(center - ORIGIN.column, (row - ORIGIN.row) * 0.8);
};

/** Features the cut never shows, around the line that says there are more. */
export function Bento({ t }: { t: number }) {
  const open = start("bento");
  const close = end("bento") - 450;
  return (
    <Shift t={t} scene="bento" y={0}>
      <div className={styles.grid}>
        {FEATURES.map((feature, index) => {
          const enter = open + distance(feature) * 260;
          const e = envelope(t, enter, close, { duration: 800, rise: 24 });
          const scale = mix(0.94, 1, progress(t, enter, 800) ** 0.4);
          return (
            <section
              key={feature.id}
              className={styles.tile}
              style={{
                gridColumn: feature.column,
                gridRow: feature.row,
                ...styled(e, `scale(${scale})`),
              }}
            >
              <div className={styles.art}>
                {feature.art(t, open + 700 + index * 110)}
              </div>
              <div className={styles.label}>
                <span className={styles.title}>{feature.title}</span>
                <span className={styles.description}>
                  {feature.description}
                </span>
              </div>
            </section>
          );
        })}
      </div>
      <Caption t={t} text="And a lot more." enter={open + 450} exit={close} />
    </Shift>
  );
}

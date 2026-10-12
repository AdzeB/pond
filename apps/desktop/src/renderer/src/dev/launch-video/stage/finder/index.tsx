import {
  IconChevronLeft,
  IconChevronRight,
  IconCircleDashedClock,
  IconComputer,
  IconDownload,
  IconFile,
  IconFolder,
  IconFolderFill,
  IconGrid,
  IconImage,
} from "@pond/icons";
import { useRef } from "react";
import { Cursor, glide, pressing } from "../cursor";
import { useLayout } from "../layout";
import { cover, SAMPLES, sample } from "../media";
import {
  clamp,
  closes,
  ease,
  lift,
  mix,
  opens,
  progress,
  styled,
} from "../timeline";
import styles from "./styles.module.css";

interface Entry {
  name: string;
  kind: "folder" | "file" | "image";
  count?: string;
}

const PICK = sample("Aimé Leon Dore Yankees hand-knit sweater");
const SAVE_DIR = `${PICK.id}.info`;

const LIBRARY: readonly Entry[] = [
  { name: "backup", kind: "folder" },
  { name: "items", kind: "folder", count: "5,070" },
  { name: "metadata.json", kind: "file" },
  { name: "organization.json", kind: "file" },
  { name: "settings.json", kind: "file" },
  { name: "tags.json", kind: "file" },
  { name: "trash", kind: "folder", count: "12" },
];

const ITEMS: readonly Entry[] = SAMPLES.map((entry) => entry.id)
  .sort()
  .slice(-13)
  .map((id) => ({ name: `${id}.info`, kind: "folder" }));

const SAVE: readonly Entry[] = [
  { name: "avatar.jpg", kind: "image" },
  { name: "enrichment.json", kind: "file" },
  { name: "info.json", kind: "file" },
  { name: "media-1.jpg", kind: "image" },
  { name: "source.json", kind: "file" },
];

const FAVORITES = [
  { label: "Recents", Icon: IconCircleDashedClock },
  { label: "Applications", Icon: IconGrid },
  { label: "Documents", Icon: IconFile },
  { label: "Downloads", Icon: IconDownload },
  { label: "Pond", Icon: IconFolder },
];

const DETAILS = [
  ["Created", "Sep 4, 2026 at 9:12"],
  ["Dimensions", "960×1440"],
  ["Where", `items › ${PICK.id.slice(0, 10)}…`],
] as const;

const CLICKS = ["items", SAVE_DIR, "media-1.jpg"] as const;

function Glyph({ kind }: { kind: Entry["kind"] }) {
  if (kind === "folder")
    return <IconFolderFill size={16} className={styles.folder} />;
  if (kind === "image") return <IconImage size={16} />;
  return <IconFile size={16} />;
}

function Column({
  t,
  entries,
  selected,
  at,
  focus,
  steps,
}: {
  t: number;
  entries: readonly Entry[];
  selected: string;
  at: number;
  focus: number | null;
  steps: readonly number[];
}) {
  const shown = at < 0 ? 1 : ease.out(progress(t, at, 220));
  const pick = focus !== null && t >= focus;
  const next = steps.find((step) => focus !== null && step > focus);
  const blurred = pick && next !== undefined && t >= next;
  return (
    <ul
      className={styles.column}
      style={{
        opacity: shown,
        transform: `translateX(${(1 - shown) * -14}px)`,
      }}
    >
      {entries.map((entry) => (
        <li
          key={entry.name}
          className={styles.row}
          data-name={entry.name}
          data-selected={
            pick && entry.name === selected
              ? blurred
                ? "inactive"
                : "active"
              : undefined
          }
        >
          <Glyph kind={entry.kind} />
          <span className={styles.name}>{entry.name}</span>
          {entry.count ? (
            <span className={styles.count}>{entry.count}</span>
          ) : null}
          {entry.kind === "folder" ? (
            <IconChevronRight size={12} className={styles.chevron} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Finder column view walking from the library folder into one save's files. */
export function Finder({
  t,
  open = opens("own"),
  close = closes("own"),
}: {
  t: number;
  open?: number;
  close?: number;
}) {
  const steps = [open + 900, open + 1350, open + 1800] as const;
  const root = useRef<HTMLDivElement>(null);
  const rows = useLayout(() => {
    const box = root.current?.getBoundingClientRect();
    return CLICKS.map((name) => {
      const row = root.current
        ?.querySelector(`[data-name="${name}"]`)
        ?.getBoundingClientRect();
      return box && row
        ? { x: row.x - box.x + 60, y: row.y - box.y + row.height / 2 }
        : { x: 0, y: 0 };
    });
  }, []);
  const w = lift(t, open, close);
  const pointer = glide(t, [
    { at: open, x: 620, y: 420 },
    ...rows.map((row, index) => ({
      at: (steps[index] ?? open) - 60,
      ...row,
      move: 420,
    })),
    {
      at: steps[2] + 700,
      x: (rows[2]?.x ?? 0) + 60,
      y: (rows[2]?.y ?? 0) + 70,
    },
  ]);
  const preview = ease.outQuint(progress(t, steps[2] + 40, 500));
  const title =
    t >= steps[1] ? SAVE_DIR : t >= steps[0] ? "items" : "My Pond.pond";
  const path = [
    "Macintosh HD",
    "Users",
    "mira",
    "Pond",
    "My Pond.pond",
    ...(t >= steps[0] ? ["items"] : []),
    ...(t >= steps[1] ? [SAVE_DIR] : []),
    ...(t >= steps[2] ? ["media-1.jpg"] : []),
  ];
  return (
    <div
      ref={root}
      className={styles.window}
      style={styled({ opacity: w.opacity, dy: w.dy, blur: w.blur })}
    >
      <aside className={styles.sidebar}>
        <span className={styles.lights}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.group}>Favorites</span>
        {FAVORITES.map(({ label, Icon }) => (
          <span
            key={label}
            className={styles.place}
            data-current={label === "Pond" || undefined}
          >
            <Icon size={16} className={styles.folder} />
            {label}
          </span>
        ))}
        <span className={styles.group}>Locations</span>
        <span className={styles.place}>
          <IconComputer size={16} className={styles.folder} />
          Macintosh HD
        </span>
      </aside>
      <section className={styles.content}>
        <header className={styles.bar}>
          <IconChevronLeft size={18} />
          <IconChevronRight size={18} className={styles.dim} />
          <span className={styles.title}>{title}</span>
        </header>
        <div className={styles.columns}>
          <Column
            t={t}
            entries={LIBRARY}
            selected="items"
            at={-1}
            focus={steps[0]}
            steps={steps}
          />
          <Column
            t={t}
            entries={ITEMS}
            selected={SAVE_DIR}
            at={steps[0]}
            focus={steps[1]}
            steps={steps}
          />
          <Column
            t={t}
            entries={SAVE}
            selected="media-1.jpg"
            at={steps[1]}
            focus={steps[2]}
            steps={steps}
          />
          <div
            className={styles.preview}
            style={{
              opacity: preview,
              transform: `scale(${mix(0.9, 1, preview)})`,
            }}
          >
            <img alt="" src={cover(PICK.id)} className={styles.image} />
            <span className={styles.file}>media-1.jpg</span>
            <span className={styles.meta}>JPEG image · 270 KB</span>
            <dl className={styles.info}>
              <dt className={styles.heading}>Information</dt>
              {DETAILS.map(([label, value]) => (
                <div key={label} className={styles.detail}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <footer className={styles.path}>
          {path.map((part, index) => (
            <span key={part} className={styles.crumb}>
              {index ? (
                <IconChevronRight size={10} className={styles.dim} />
              ) : null}
              {part}
            </span>
          ))}
        </footer>
      </section>
      <Cursor
        x={pointer.x}
        y={pointer.y}
        scale={pressing(t, steps) ? 0.86 : 1}
        opacity={clamp((t - open - 400) / 200)}
      />
    </div>
  );
}

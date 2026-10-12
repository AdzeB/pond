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
import { cover, SAMPLES, sample } from "../media";
import { closes, ease, lift, mix, opens, progress, styled } from "../timeline";
import styles from "./styles.module.css";

interface Entry {
  name: string;
  kind: "folder" | "file" | "image";
}

const PICK = sample("Lancia Delta in snow");
const SAVE_DIR = `${PICK.id}.info`;

const LIBRARY: readonly Entry[] = [
  { name: "backup", kind: "folder" },
  { name: "items", kind: "folder" },
  { name: "metadata.json", kind: "file" },
  { name: "organization.json", kind: "file" },
  { name: "settings.json", kind: "file" },
  { name: "tags.json", kind: "file" },
  { name: "trash", kind: "folder" },
];

const ITEMS: readonly Entry[] = [
  ...new Set([
    ...SAMPLES.map((entry) => entry.id)
      .sort()
      .slice(14, 31),
    PICK.id,
  ]),
]
  .sort()
  .map((id) => ({ name: `${id}.info`, kind: "folder" }));

const SAVE: readonly Entry[] = [
  { name: "avatar.jpg", kind: "image" },
  { name: "enrichment.json", kind: "file" },
  { name: "info.json", kind: "file" },
  { name: "media-1.jpg", kind: "image" },
  { name: "media-1.jpg_thumbnail.png", kind: "image" },
  { name: "source.json", kind: "file" },
];

const FAVORITES = [
  { label: "Recents", Icon: IconCircleDashedClock },
  { label: "Applications", Icon: IconGrid },
  { label: "Desktop", Icon: IconComputer },
  { label: "Documents", Icon: IconFile },
  { label: "Downloads", Icon: IconDownload },
  { label: "Pond", Icon: IconFolder },
];

const OPEN = opens("own");
const CLOSE = closes("own");
const STEPS = [OPEN + 700, OPEN + 1250, OPEN + 1800] as const;

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
}: {
  t: number;
  entries: readonly Entry[];
  selected: string;
  at: number;
  focus: number | null;
}) {
  const shown = at < 0 ? 1 : ease.out(progress(t, at, 220));
  const pick = focus !== null && t >= focus;
  const next = STEPS.find((step) => focus !== null && step > focus);
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
          {entry.kind === "folder" ? (
            <IconChevronRight size={12} className={styles.chevron} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Finder column view walking from the library folder into one save's files. */
export function Finder({ t }: { t: number }) {
  const w = lift(t, OPEN, CLOSE);
  if (w.opacity <= 0) return null;
  const preview = ease.outQuint(progress(t, STEPS[2] + 40, 500));
  const title =
    t >= STEPS[2]
      ? "media-1.jpg"
      : t >= STEPS[1]
        ? SAVE_DIR
        : t >= STEPS[0]
          ? "items"
          : "Personal.pond";
  const path = [
    "Macintosh HD",
    "Users",
    "you",
    "Pond",
    "Personal.pond",
    ...(t >= STEPS[0] ? ["items"] : []),
    ...(t >= STEPS[1] ? [SAVE_DIR] : []),
    ...(t >= STEPS[2] ? ["media-1.jpg"] : []),
  ];
  return (
    <div
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
            focus={STEPS[0]}
          />
          <Column
            t={t}
            entries={ITEMS}
            selected={SAVE_DIR}
            at={STEPS[0]}
            focus={STEPS[1]}
          />
          <Column
            t={t}
            entries={SAVE}
            selected="media-1.jpg"
            at={STEPS[1]}
            focus={STEPS[2]}
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
            <span className={styles.meta}>JPEG image · 1,556 × 1,600</span>
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
    </div>
  );
}

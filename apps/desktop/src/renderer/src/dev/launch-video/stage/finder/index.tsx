import { IconFile, IconFolderFill, IconImage } from "@pond/icons";
import { cover, LANCIA } from "../media";
import { BEATS, clamp, ease, presence, progress } from "../timeline";
import styles from "./styles.module.css";

interface Entry {
  name: string;
  kind: "folder" | "file" | "image";
}

const LIBRARY: readonly Entry[] = [
  { name: "backup", kind: "folder" },
  { name: "items", kind: "folder" },
  { name: "trash", kind: "folder" },
  { name: "metadata.json", kind: "file" },
  { name: "organization.json", kind: "file" },
  { name: "settings.json", kind: "file" },
  { name: "tags.json", kind: "file" },
];

const ITEMS: readonly Entry[] = [
  "01M1Z5DRY5FRAXPA2HZT6QX6GG",
  "01M1Z5DRY6MME2JGW1936CNXW8",
  "01M1Z5DRY94FHC0VGHMYJ66RWA",
  "01M1Z5DRYDGRCEAKW1KJQE0FAX",
  "01M1Z5DRYE6T1NGY9JM58J499X",
  LANCIA,
  "01M1Z5DRYHE6JBEHS4VY5WZYQG",
  "01M1Z5DRYHZFA4CA4RF6NZQW4D",
  "01M1Z5DRYJGMT2GXY761XXB0B1",
  "01M1Z5DRYK36TSW4QCXX4S2M05",
  "01M1Z5DRYN26WE5HGJH70T65D6",
  "01M1Z5DRYPF1EG0WTVJA5BM4QB",
  "01M1Z5DRYQ1V499KC0EG5A69YR",
].map((id) => ({ name: `${id}.info`, kind: "folder" }));

const SAVE: readonly Entry[] = [
  { name: "avatar.jpg", kind: "image" },
  { name: "enrichment.json", kind: "file" },
  { name: "info.json", kind: "file" },
  { name: "media-1.jpg", kind: "image" },
  { name: "media-1.jpg_thumbnail.png", kind: "image" },
  { name: "source.json", kind: "file" },
];

function Glyph({ kind }: { kind: Entry["kind"] }) {
  if (kind === "folder")
    return <IconFolderFill size={16} className={styles.folder} />;
  if (kind === "image") return <IconImage size={16} />;
  return <IconFile size={16} />;
}

function Column({
  entries,
  selected,
  shown,
}: {
  entries: readonly Entry[];
  selected: string | null;
  shown: number;
}) {
  if (shown <= 0) return null;
  return (
    <ul
      className={styles.column}
      style={{
        opacity: shown,
        transform: `translateX(${(1 - shown) * -16}px)`,
      }}
    >
      {entries.map((entry) => (
        <li
          key={entry.name}
          className={styles.row}
          data-selected={entry.name === selected || undefined}
        >
          <Glyph kind={entry.kind} />
          <span className={styles.name}>{entry.name}</span>
          {entry.kind === "folder" ? (
            <span className={styles.chevron}>›</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Finder column view walking from the library into one save's files. */
export function Finder({ t }: { t: number }) {
  const opacity = presence(t, "own", 420, 320);
  if (opacity <= 0) return null;
  const start = BEATS.own[0];
  const rise = ease.out(progress(t, start, 700));
  const step = (offset: number) => ease.out(progress(t, start + offset, 260));
  const items = t >= start + 700;
  const save = t >= start + 1400;
  const media = t >= start + 2100;
  const title = [
    [media, "media-1.jpg"],
    [save, `${LANCIA}.info`],
    [items, "items"],
  ].find(([open]) => open)?.[1];
  return (
    <div
      className={styles.window}
      style={{ opacity, transform: `translateY(${(1 - rise) * 40}px)` }}
    >
      <header className={styles.bar}>
        <span className={styles.lights}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.title}>{title ?? "Personal.pond"}</span>
      </header>
      <div className={styles.columns}>
        <Column entries={LIBRARY} selected={items ? "items" : null} shown={1} />
        <Column
          entries={ITEMS}
          selected={save ? `${LANCIA}.info` : null}
          shown={step(800)}
        />
        <Column
          entries={SAVE}
          selected={media ? "media-1.jpg" : null}
          shown={step(1500)}
        />
        <div className={styles.preview} style={{ opacity: clamp(step(2200)) }}>
          <img alt="" src={cover(LANCIA)} className={styles.image} />
          <span className={styles.file}>media-1.jpg</span>
          <span className={styles.meta}>JPEG image · 1,556 × 1,600</span>
        </div>
      </div>
    </div>
  );
}

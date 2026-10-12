import {
  IconCircleCheckFill,
  IconFolder,
  IconFolderBolt,
  IconFolderImport,
  IconMagnifier,
} from "@pond/icons";
import { Logo } from "@pond/ui/logo";
import { brand } from "../../../stage/brands";
import { cover, sample } from "../../../stage/media";
import {
  clamp,
  ease,
  envelope,
  mix,
  progress,
  styled,
} from "../../../stage/timeline";
import styles from "./styles.module.css";

interface ArtProps {
  t: number;
  at: number;
}

const pop = (t: number, at: number, rise = 8) =>
  styled(envelope(t, at, Number.POSITIVE_INFINITY, { duration: 500, rise }));

const typed = (t: number, at: number, text: string, step: number) =>
  text.slice(0, clamp(Math.floor((t - at) / step), 0, text.length));

const BROWN = [
  "Chuncky brown shoes",
  "Fall Outfits You'll FALL in Love With",
  "Dark academia outfit",
  "Layered work jacket",
  "Patchwork knit",
  "Balloon Washed Denims",
].map(sample);

function Raycast({ t, at }: ArtProps) {
  const query = "brown shoes";
  const text = typed(t, at, query, 55);
  const shown = at + query.length * 55 + 120;
  return (
    <div className={styles.panel}>
      <div className={styles.input}>
        <IconMagnifier size={14} />
        <span>
          {text}
          <span
            className={styles.caret}
            style={{ opacity: Math.floor(t / 400) % 2 ? 0 : 1 }}
          />
        </span>
      </div>
      {BROWN.slice(0, 5).map((save, index) => (
        <div
          key={save.id}
          className={styles.result}
          data-active={index === 0 || undefined}
          style={pop(t, shown + index * 70, 6)}
        >
          <img alt="" src={cover(save.id)} className={styles.icon} />
          <span className={styles.name}>{save.title}</span>
          <span className={styles.app}>Pond</span>
        </div>
      ))}
    </div>
  );
}

function Smart({ t, at }: ArtProps) {
  const saves = BROWN.slice(0, 4);
  const count = saves.filter((_, index) => t >= at + 500 + index * 150).length;
  return (
    <div className={styles.smart}>
      <div className={styles.rules}>
        <span className={styles.folder}>
          <IconFolderBolt size={16} />
          Fall Browns
          <span className={styles.count}>{count}</span>
        </span>
        <span className={styles.rule} style={pop(t, at)}>
          Color is <b>Brown</b>
        </span>
        <span className={styles.rule} style={pop(t, at + 120)}>
          Added <b>this month</b>
        </span>
      </div>
      <div className={styles.strip}>
        {saves.map((save, index) => (
          <img
            key={save.id}
            alt=""
            src={cover(save.id)}
            className={styles.thumb}
            style={pop(t, at + 500 + index * 150, 14)}
          />
        ))}
      </div>
    </div>
  );
}

const CLI_ROWS = [
  ["01KV5AS1NV", "Chuncky brown shoes"],
  ["01KV5AS1H1", "Fall Outfits You'll FALL…"],
  ["01KV5AS1J1", "Dark academia outfit"],
];

function Cli({ t, at }: ArtProps) {
  const command = "pond saves search brown shoes";
  const done = at + command.length * 32 + 200;
  return (
    <div className={styles.terminal}>
      <p className={styles.line}>
        <span className={styles.prompt}>$</span>
        {typed(t, at, command, 32)}
      </p>
      {CLI_ROWS.map(([id, title], index) => (
        <p
          key={id}
          className={styles.line}
          style={pop(t, done + index * 80, 4)}
        >
          <span className={styles.id}>{id}</span>
          {title}
        </p>
      ))}
    </div>
  );
}

const BARS = Array.from({ length: 38 }, (_, index) => {
  const x = Math.sin(index * 1.7) * 0.5 + Math.sin(index * 0.43) * 0.5;
  return 0.25 + Math.abs(x) * 0.75;
});
const SPOKEN = "This wave only breaks a few days a year.".split(" ");

function Transcript({ t, at }: ArtProps) {
  const head = progress(t, at, 2600);
  return (
    <div className={styles.transcript}>
      <div className={styles.wave}>
        {BARS.map((height, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: bars are static
            key={index}
            className={styles.bar}
            data-played={index / BARS.length < head || undefined}
            style={{ height: `${height * 100}%` }}
          />
        ))}
      </div>
      <p className={styles.spoken}>
        <span className={styles.stamp}>0:42</span>
        {SPOKEN.map((word, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: words are static
            key={index}
            className={styles.word}
            data-said={index / SPOKEN.length < head || undefined}
          >
            {word}
          </span>
        ))}
      </p>
    </div>
  );
}

const SOURCE = sample("Long black coat");
const MATCHES = [
  { save: sample("Black coat, black boots"), score: 96 },
  { save: sample("All black, runway"), score: 93 },
  { save: sample("Black suit, long hair"), score: 91 },
];

function Similar({ t, at }: ArtProps) {
  return (
    <div className={styles.similar}>
      <img alt="" src={cover(SOURCE.id)} className={styles.source} />
      <div className={styles.matches}>
        {MATCHES.map(({ save, score }, index) => (
          <span
            key={save.id}
            className={styles.match}
            style={pop(t, at + 300 + index * 160, 10)}
          >
            <img alt="" src={cover(save.id)} className={styles.small} />
            <span className={styles.score}>{score}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const FOLDERS = [
  { name: "Posters", count: 214 },
  { name: "Type", count: 96 },
  { name: "Fashion", count: 388 },
  { name: "Interiors", count: 143 },
];

function Eagle({ t, at }: ArtProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.root}>
        <IconFolderImport size={15} />
        Eagle Library
      </div>
      <div className={styles.folders}>
        {FOLDERS.map((folder, index) => {
          const begins = at + 200 + index * 300;
          const fill = ease.out(progress(t, begins, 360));
          return (
            <div key={folder.name} className={styles.branch}>
              <IconFolder size={14} />
              <span className={styles.name}>{folder.name}</span>
              <span className={styles.tally}>
                {Math.round(folder.count * fill)}
              </span>
              {fill >= 1 ? (
                <IconCircleCheckFill size={14} className={styles.check} />
              ) : (
                <span className={styles.pending} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TWIN = sample("Ikebana");

function Duplicates({ t, at }: ArtProps) {
  const slide = ease.inOut(progress(t, at + 200, 700));
  return (
    <div className={styles.twins}>
      {[-1, 1].map((side) => (
        <img
          key={side}
          alt=""
          src={cover(TWIN.id)}
          className={styles.twin}
          style={{
            transform: `translateX(${side * mix(70, 26, slide)}px) rotate(${side * mix(6, 3, slide)}deg)`,
          }}
        />
      ))}
      <span className={styles.badge} style={pop(t, at + 950, 6)}>
        Same image
      </span>
    </div>
  );
}

const FORMATS = [
  "JPG",
  "PNG",
  "GIF",
  "WEBP",
  "HEIC",
  "RAW",
  "SVG",
  "MP4",
  "MOV",
  "MP3",
  "PDF",
  "EPUB",
  "PSD",
  "FIG",
  "SKETCH",
  "AI",
  "GLB",
  "OBJ",
  "WOFF2",
  "ZIP",
  "HTML",
];

function Formats({ t, at }: ArtProps) {
  return (
    <div className={styles.formats}>
      {FORMATS.map((format, index) => (
        <span
          key={format}
          className={styles.format}
          style={pop(t, at + 200 + index * 45, 8)}
        >
          {format}
        </span>
      ))}
    </div>
  );
}

const GLYPHS = "Aa Gg Rr Qq &".split(" ");

function Specimen({ t, at }: ArtProps) {
  const index = clamp(Math.floor((t - at - 300) / 380), 0, GLYPHS.length - 1);
  return (
    <span
      key={index}
      className={styles.specimen}
      style={pop(t, at + 300 + index * 380, 6)}
    >
      {GLYPHS[index]}
    </span>
  );
}

const FACES = [
  { turn: "rotateY(0deg)", shade: "#ffffff" },
  { turn: "rotateY(90deg)", shade: "#e9e9ec" },
  { turn: "rotateY(180deg)", shade: "#dcdce0" },
  { turn: "rotateY(-90deg)", shade: "#f1f1f3" },
  { turn: "rotateX(90deg)", shade: "#fafafa" },
  { turn: "rotateX(-90deg)", shade: "#cfcfd4" },
];

function Model({ t, at }: ArtProps) {
  return (
    <div className={styles.model}>
      <div
        className={styles.cube}
        style={{
          transform: `rotateX(-28deg) rotateY(${20 + (t - at) * 0.01}deg)`,
        }}
      >
        {FACES.map((face) => (
          <span
            key={face.turn}
            className={styles.face}
            style={{
              background: face.shade,
              transform: `${face.turn} translateZ(36px)`,
            }}
          />
        ))}
      </div>
      <span className={styles.floor} />
    </div>
  );
}

const LIBRARIES = [
  { name: "Personal", count: "2,431" },
  { name: "Studio", count: "864" },
  { name: "Archive", count: "12,077" },
];

function Libraries({ t, at }: ArtProps) {
  const active = t >= at + 1000 ? 1 : 0;
  return (
    <div className={styles.libraries}>
      {LIBRARIES.map((library, index) => (
        <div
          key={library.name}
          className={styles.library}
          data-active={index === active || undefined}
          style={pop(t, at + index * 100, 8)}
        >
          <Logo size={20} aria-hidden />
          <span className={styles.file}>
            <span className={styles.name}>{library.name}</span>
            <span className={styles.meta}>{library.count} saves</span>
          </span>
        </div>
      ))}
    </div>
  );
}

const LANES = [
  { id: "x", total: 120, rate: 0.75 },
  { id: "pinterest", total: 64, rate: 0.55 },
  { id: "arena", total: 38, rate: 0 },
];

function Syncing({ t, at }: ArtProps) {
  return (
    <div className={styles.queue}>
      <div className={styles.heading}>
        Syncing
        <span className={styles.pause}>Pause All</span>
      </div>
      {LANES.map((lane, index) => {
        const { Icon, name } = brand(lane.id);
        const paused = lane.rate === 0;
        const steps = Math.floor(progress(t, at + index * 120, 3000) * 8) / 8;
        const done = Math.round(lane.total * (0.2 + steps * lane.rate * 0.8));
        return (
          <div
            key={lane.id}
            className={styles.lane}
            data-paused={paused || undefined}
            style={pop(t, at + index * 100, 6)}
          >
            <Icon className={styles.brand} />
            <span className={styles.service}>{name}</span>
            {paused ? (
              <span className={styles.paused}>Paused</span>
            ) : (
              <>
                <span className={styles.track}>
                  <span
                    className={styles.fill}
                    style={{ width: `${(done / lane.total) * 100}%` }}
                  />
                </span>
                <span className={styles.status}>
                  {done}/{lane.total}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Extension({ t, at }: ArtProps) {
  const press = at + 700;
  const saved = t >= press + 120;
  const down = t >= press && t < press + 120;
  return (
    <div className={styles.extension}>
      <div className={styles.toolbar}>
        <span className={styles.lights}>
          <span />
          <span />
          <span />
        </span>
        <span className={styles.address}>x.com</span>
        <span
          className={styles.button}
          data-saved={saved || undefined}
          style={{ transform: `scale(${down ? 0.88 : 1})` }}
        >
          {saved ? (
            <IconCircleCheckFill size={14} />
          ) : (
            <Logo size={14} aria-hidden />
          )}
        </span>
      </div>
      <span className={styles.toast} style={pop(t, press + 200, 8)}>
        Saved to Pond
      </span>
    </div>
  );
}

const GENERATED = "Black coat, round sunglasses".split(" ");

function Titles({ t, at }: ArtProps) {
  const strike = ease.inOut(progress(t, at + 400, 400));
  return (
    <div className={styles.titles}>
      <span className={styles.filename}>
        IMG_4021.jpg
        <span className={styles.strike} style={{ width: `${strike * 100}%` }} />
      </span>
      <span className={styles.generated}>
        {GENERATED.map((word, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: words are static
            key={index}
            className={styles.term}
            style={pop(t, at + 900 + index * 90, 4)}
          >
            {word}
          </span>
        ))}
      </span>
    </div>
  );
}

const LINES = [92, 100, 84, 100, 96, 70];

function Reader({ t, at }: ArtProps) {
  return (
    <div className={styles.book}>
      {[0, 1].map((page) => (
        <span key={page} className={styles.page}>
          {page === 0 ? (
            <span className={styles.chapter}>Chapter 3</span>
          ) : null}
          {LINES.map((width, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: lines are static
              key={index}
              className={styles.text}
              style={{
                width: `${width}%`,
                opacity: ease.out(
                  progress(t, at + 300 + (page * 6 + index) * 60, 300),
                ),
              }}
            />
          ))}
          <span className={styles.folio}>{12 + page}</span>
        </span>
      ))}
    </div>
  );
}

export const Art = {
  Raycast,
  Smart,
  Cli,
  Transcript,
  Similar,
  Eagle,
  Duplicates,
  Formats,
  Specimen,
  Model,
  Libraries,
  Syncing,
  Extension,
  Titles,
  Reader,
};

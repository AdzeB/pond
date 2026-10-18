import {
  IconMagnifier,
  IconMediaPlayFill,
  IconPlus,
  IconScanImage,
  IconSparkle,
  IconVolume,
} from "@pond/icons";
import { Chip, Logo, Switch } from "@pond/ui";
import { type ReactNode, useId } from "react";
import appIcon from "@/assets/setup/app-icon.png";
import { IS_MAC } from "@/shared/lib/platform";
import { Art, type ArtKind } from "../../demo";
import type { OptionId, StepProps } from "../../model";
import styles from "./styles.module.css";

const WAVE = [4, 8, 12, 7, 14, 10, 16, 9, 6, 13, 8, 15, 6, 11, 5, 9];

const MATCHES = [
  {
    title: "Sunset over the bay",
    kind: "sunset",
    score: "94%",
  },
  {
    title: "Mountain trail",
    kind: "mountain",
    score: "86%",
  },
  {
    title: "Spring palette",
    kind: "swatch",
    score: "71%",
  },
] as const;

const RENAMED = [
  { title: "Harbor at Dawn", kind: "sunset", file: "IMG_4821.jpg" },
  { title: "Trail Above the Valley", kind: "mountain", file: "IMG_4790.jpg" },
  { title: "Studio Tour Walkthrough", kind: "video", file: "VID_0192.mov" },
  {
    title: "Spring Color Palette",
    kind: "swatch",
    file: "Screenshot 2026-04-02.png",
  },
] as const;

const CUES = [
  ["0:02", "Start with the room."],
  ["0:06", "Then find the voice."],
  ["0:11", "Keep what breathes."],
  ["0:15", "Cut the rest."],
] as const;

interface TileSpec {
  id: OptionId;
  title: string;
  /** Named area in the grid template. */
  area: string;
  visual: ReactNode;
}

function Thumb({ kind }: { kind: ArtKind }) {
  return (
    <span className={styles.media}>
      <Art kind={kind} size="slot" />
    </span>
  );
}

const TILES: readonly TileSpec[] = [
  {
    id: "semanticSearch",
    title: "Semantic Search",
    area: "search",
    visual: (
      <span className={styles.palette}>
        <span className={styles.field}>
          <IconMagnifier size={12} />
          golden hour
          <span className={styles.caret} />
        </span>
        <span className={styles.results}>
          {MATCHES.map(({ title, kind, score }, index) => (
            <span
              key={title}
              className={styles.row}
              data-active={index === 0 || undefined}
            >
              <Thumb kind={kind} />
              <span className={styles.name}>{title}</span>
              <span className={styles.score}>{score}</span>
            </span>
          ))}
        </span>
      </span>
    ),
  },
  {
    id: "enableOcr",
    title: "Text in Images",
    area: "ocr",
    visual: (
      <span className={styles.scan}>
        <span className={styles.panel} data-tilt>
          <span className={styles.found}>Spring Menu</span>
          <span className={styles.bar} />
          <span className={styles.bar} />
          <span className={styles.bar} data-short />
        </span>
        <span className={styles.pill}>
          <IconScanImage size={12} />
          Spring Menu
        </span>
      </span>
    ),
  },
  {
    id: "soundsEnabled",
    title: "Sounds",
    area: "sounds",
    visual: (
      <span className={styles.toasts}>
        <span className={styles.toast} data-ghost />
        <span className={styles.toast}>
          Moved to Trash
          <IconVolume size={12} className={styles.accent} />
        </span>
      </span>
    ),
  },
  {
    id: "launchAtLogin",
    title: "Launch at Login",
    area: "launch",
    visual: (
      <span className={styles.dock}>
        <span className={styles.slot} />
        <span className={styles.running}>
          <img className={styles.app} src={appIcon} alt="" />
        </span>
        <span className={styles.slot} />
      </span>
    ),
  },
  {
    id: "enableTranscript",
    title: "Transcription",
    area: "transcript",
    visual: (
      <span className={styles.player}>
        <span className={styles.controls}>
          <span className={styles.play}>
            <IconMediaPlayFill size={10} />
          </span>
          <span className={styles.wave}>
            {WAVE.map((height, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: static decorative bars
                key={index}
                style={{ height }}
                data-played={index < 7 || undefined}
              />
            ))}
          </span>
        </span>
        <span className={styles.cues}>
          {CUES.map(([time, line], index) => (
            <span
              key={time}
              className={styles.cue}
              data-current={index === 1 || undefined}
            >
              <span className={styles.time}>{time}</span>
              {line}
            </span>
          ))}
        </span>
      </span>
    ),
  },
  {
    id: "enableCaption",
    title: "Image Captions",
    area: "caption",
    visual: (
      <span className={styles.captioned}>
        <span className={styles.frame}>
          <Art kind="sunset" size="slot" />
        </span>
        <span className={styles.pill}>
          <IconSparkle size={10} className={styles.accent} />
          Boats at sunset
        </span>
      </span>
    ),
  },
  {
    id: "enableClip",
    title: "Visual Similarity",
    area: "similar",
    visual: (
      <span className={styles.similar}>
        <span className={styles.frame} data-source>
          <Art kind="sunset" size="slot" />
        </span>
        <span className={styles.links}>
          <span />
          <span />
        </span>
        <span className={styles.matches}>
          <span className={styles.match}>
            <Thumb kind="sunset" />
            <span className={styles.score}>96%</span>
          </span>
          <span className={styles.match}>
            <Thumb kind="mountain" />
            <span className={styles.score}>91%</span>
          </span>
        </span>
      </span>
    ),
  },
  {
    id: "enableSuggestedTags",
    title: "Suggested Tags",
    area: "tags",
    visual: (
      <span className={styles.tags}>
        <Chip.Root>
          <Chip.Item tone="tag">Travel</Chip.Item>
          <Chip.Action tone="suggested" tabIndex={-1}>
            <IconPlus size={10} />
            Beach
          </Chip.Action>
        </Chip.Root>
        <span className={styles.ghosts}>
          <span />
          <span />
        </span>
      </span>
    ),
  },
  {
    id: "enableAutoTitle",
    title: "Generated Titles",
    area: "titles",
    visual: (
      <span className={styles.palette}>
        <span className={styles.results}>
          {RENAMED.map(({ title, kind, file }, index) => (
            <span
              key={file}
              className={styles.row}
              data-active={index === 0 || undefined}
            >
              <Thumb kind={kind} />
              <span className={styles.lines}>
                <span className={styles.name}>
                  {title}
                  <IconSparkle size={10} className={styles.accent} />
                </span>
                <span className={styles.filename}>{file}</span>
              </span>
            </span>
          ))}
        </span>
      </span>
    ),
  },
  {
    id: "menuBarIcon",
    title: IS_MAC ? "Menu Bar Icon" : "Notification Area Icon",
    area: "menu",
    visual: (
      <span className={styles.status}>
        <span className={styles.menubar}>
          <span className={styles.tray}>
            <Logo size={12} aria-hidden />
          </span>
          <IconVolume size={12} />
          <span className={styles.clock}>Sun 9:41</span>
        </span>
        <span className={styles.menu}>
          <span>New</span>
          <span>Import</span>
          <span>Sources</span>
        </span>
      </span>
    ),
  },
];

function Tile({
  id,
  title,
  area,
  visual,
  choices,
  update,
}: StepProps & TileSpec) {
  const titleId = useId();
  const disabled =
    id === "enableAutoTitle" &&
    !choices.options.enableCaption &&
    !choices.options.enableOcr;
  return (
    <div
      className={styles.tile}
      style={{ gridArea: area }}
      data-disabled={disabled || undefined}
    >
      <div className={styles.visual} aria-hidden>
        {visual}
      </div>
      <div className={styles.footer}>
        <p id={titleId} className={styles.title}>
          {title}
        </p>
        <Switch.Root
          aria-labelledby={titleId}
          checked={choices.options[id]}
          disabled={disabled}
          onCheckedChange={(checked) =>
            update({ options: { ...choices.options, [id]: checked } })
          }
        />
      </div>
    </div>
  );
}

export function Customize({
  children,
  ...props
}: StepProps & { children?: ReactNode }) {
  return (
    <div className={styles.grid}>
      <div className={styles.intro}>{children}</div>
      {TILES.map((tile) => (
        <Tile key={tile.id} {...props} {...tile} />
      ))}
    </div>
  );
}

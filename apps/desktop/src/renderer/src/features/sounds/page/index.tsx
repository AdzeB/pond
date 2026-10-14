import { IconAnimationRepeat, IconMediaPlay } from "@pond/icons";
import { Button, Switch } from "@pond/ui";
import {
  ensureReady,
  type Layer,
  renderToBuffer,
  type SoundDefinition,
} from "@web-kits/audio";
import { useEffect, useState } from "react";
import {
  SOUND_PATCH,
  UI_SOUND_NAMES,
  UI_SOUNDS,
  type UiSoundName,
} from "@/shared/lib/sound-packs";
import styles from "./styles.module.css";

interface Cue {
  title: string;
  detail: string;
}

const CUES = {
  tap: { title: "Tap", detail: "Buttons, menu items, tabs, and links" },
  soft: { title: "Soft", detail: "Ghost, tertiary, and link buttons" },
  toggleOn: {
    title: "Toggle On",
    detail: "Switches and checkboxes turning on",
  },
  toggleOff: {
    title: "Toggle Off",
    detail: "Switches and checkboxes turning off",
  },
  success: { title: "Success", detail: "Source connected, backup finished" },
  trash: { title: "Trash", detail: "Saves or folders moved to Trash" },
} satisfies Record<UiSoundName, Cue>;

const BINS = 72;
const RENDER_RATE = 22050;
const BURST = 8;
const BURST_GAP_MS = 90;

interface Wave {
  peaks: number[];
  ms: number;
}

function layersOf(sound: SoundDefinition): Layer[] {
  return "layers" in sound ? sound.layers : [sound];
}

function tailOf(effects: Layer["effects"]): number {
  return (effects ?? []).reduce(
    (tail, effect) =>
      effect.type === "reverb" ? Math.max(tail, effect.decay ?? 0.5) : tail,
    0,
  );
}

function durationOf(sound: SoundDefinition): number {
  const shared = "layers" in sound ? tailOf(sound.effects) : 0;
  return layersOf(sound).reduce((longest, layer) => {
    const env = layer.envelope;
    const end =
      (layer.delay ?? 0) +
      (env?.attack ?? 0) +
      (env?.decay ?? 0.5) +
      (env?.release ?? 0) +
      Math.max(shared, tailOf(layer.effects));
    return Math.max(longest, end);
  }, 0);
}

async function renderWave(sound: SoundDefinition): Promise<Wave> {
  const seconds = durationOf(sound) + 0.04;
  const buffer = await renderToBuffer(sound, {
    duration: seconds,
    sampleRate: RENDER_RATE,
    numberOfChannels: 1,
  });
  const data = buffer.getChannelData(0);
  const size = Math.max(1, Math.floor(data.length / BINS));
  const peaks: number[] = [];
  for (let bin = 0; bin < BINS; bin++) {
    let peak = 0;
    for (let i = bin * size; i < Math.min(data.length, (bin + 1) * size); i++) {
      peak = Math.max(peak, Math.abs(data[i] ?? 0));
    }
    peaks.push(peak);
  }
  return { peaks, ms: Math.round(seconds * 1000) };
}

function useWaves(): Map<UiSoundName, Wave> {
  const [waves, setWaves] = useState(() => new Map<UiSoundName, Wave>());
  useEffect(() => {
    let cancelled = false;
    const jobs = UI_SOUND_NAMES.map(async (name) => {
      const wave = await renderWave(UI_SOUNDS[name]);
      return [name, wave] as const;
    });
    void Promise.all(jobs)
      .then((entries) => {
        if (!cancelled) setWaves(new Map(entries));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return waves;
}

function audition(name: UiSoundName, count = 1): void {
  void ensureReady()
    .then(() => {
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          SOUND_PATCH.play(name, {
            detune: (Math.random() - 0.5) * 28,
            volume: i === 0 ? 1 : 0.7,
          });
        }, i * BURST_GAP_MS);
      }
    })
    .catch(() => {});
}

function Waveform({ wave, scale }: { wave?: Wave; scale: number }) {
  if (!wave) return <div className={styles.wave} aria-hidden="true" />;
  const step = 100 / BINS;
  const top = wave.peaks.map((peak, i) => {
    const y = 50 - Math.min(1, peak / scale) * 46;
    return `${(i * step).toFixed(2)},${y.toFixed(2)}`;
  });
  const bottom = wave.peaks
    .map((peak, i) => {
      const y = 50 + Math.min(1, peak / scale) * 46;
      return `${(i * step).toFixed(2)},${y.toFixed(2)}`;
    })
    .reverse();
  return (
    <svg
      className={styles.wave}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon points={[...top, ...bottom].join(" ")} />
    </svg>
  );
}

function CueCard({
  name,
  wave,
  scale,
}: {
  name: UiSoundName;
  wave?: Wave;
  scale: number;
}) {
  const cue = CUES[name];
  return (
    <article className={styles.cue}>
      <header className={styles.heading}>
        <h2 className={styles.name}>{cue.title}</h2>
        <span className={styles.ms}>{wave ? `${wave.ms} ms` : ""}</span>
      </header>
      <p className={styles.detail}>{cue.detail}</p>
      <Waveform wave={wave} scale={scale} />
      <div className={styles.actions} data-sound="none">
        <Button size="sm" variant="secondary" onClick={() => audition(name)}>
          <IconMediaPlay size={12} />
          Play
        </Button>
        <Button size="sm" variant="ghost" onClick={() => audition(name, BURST)}>
          <IconAnimationRepeat size={12} />
          Repeat
        </Button>
      </div>
    </article>
  );
}

export function SoundGalleryPage() {
  const [on, setOn] = useState(false);
  const waves = useWaves();
  const scale = Math.max(
    0.01,
    ...[...waves.values()].flatMap((wave) => wave.peaks),
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Sound Gallery</h1>
        <p className={styles.summary}>
          Every interface sound in Pond. Repeat plays a burst to hear how a cue
          holds up under fast clicks.
        </p>
      </header>
      <div className={styles.scroll}>
        <section className={styles.context}>
          <h2 className={styles.name}>In Context</h2>
          <p className={styles.detail}>
            These controls play through the app, with your sound settings
            applied.
          </p>
          <div className={styles.controls}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Switch.Root
              aria-label="Toggle"
              checked={on}
              onCheckedChange={setOn}
            />
          </div>
        </section>
        <div className={styles.cues}>
          {UI_SOUND_NAMES.map((name) => (
            <CueCard
              key={name}
              name={name}
              wave={waves.get(name)}
              scale={scale}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

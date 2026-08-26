import {
  defineSound,
  ensureReady,
  type PlayOptions,
  type SoundDefinition,
} from "@web-kits/audio";
import { SOUND_PATCH, type UiSoundName } from "@/lib/ui/sound-packs";
import { getPrefsSnapshot } from "@/stores/prefs";

type SoundKind = UiSoundName | "toggle";

const RATE_MS = 40;
const RAPID_MS = 110;
const lastPlayed = new Map<SoundKind, number>();

function reduceMotion(): boolean {
  return document.documentElement.getAttribute("data-reduce-motion") === "true";
}

function soundsEnabled(): boolean {
  return getPrefsSnapshot()?.preferences.soundsEnabled !== false;
}

function play(kind: SoundKind, name: UiSoundName): void {
  if (reduceMotion()) return;
  if (!soundsEnabled()) return;
  const now = performance.now();
  const prev = lastPlayed.get(kind) ?? 0;
  if (now - prev < RATE_MS) return;
  lastPlayed.set(kind, now);
  const spread = kind === "success" ? 16 : 28;
  const opts: PlayOptions = {
    detune: (Math.random() - 0.5) * spread,
    volume: now - prev < RAPID_MS ? 0.7 : 1,
  };
  void ensureReady()
    .then(() => {
      SOUND_PATCH.play(name, opts);
    })
    .catch(() => {});
}

export function playUiTap(): void {
  play("tap", "tap");
}

export function playUiSoft(): void {
  play("soft", "soft");
}

export function playUiToggle(on: boolean): void {
  play("toggle", on ? "toggleOn" : "toggleOff");
}

export function playUiSuccess(): void {
  play("success", "success");
}

export function playTrashThunk(): void {
  play("trash", "trash");
}

export function previewUiSound(): void {
  playUiTap();
}

export function playUiPreview(name: UiSoundName): void {
  const spread = name === "success" ? 16 : 28;
  const opts: PlayOptions = {
    detune: (Math.random() - 0.5) * spread,
  };
  void ensureReady()
    .then(() => {
      SOUND_PATCH.play(name, opts);
    })
    .catch(() => {});
}

export function playUiDefinition(definition: SoundDefinition): void {
  void ensureReady()
    .then(() => {
      defineSound(definition)();
    })
    .catch(() => {});
}

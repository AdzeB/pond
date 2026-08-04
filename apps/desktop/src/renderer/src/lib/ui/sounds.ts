import type { SoundFeel } from "@pond/schema/db";
import { ensureReady, type PlayOptions } from "@web-kits/audio";
import { type FeelSoundName, SOUND_PACKS } from "@/lib/ui/sound-packs";
import { getPrefsSnapshot } from "@/stores/prefs";

type SoundKind = FeelSoundName | "toggle";

const RATE_MS = 40;
const lastPlayed = new Map<SoundKind, number>();

function reduceMotion(): boolean {
  return document.documentElement.getAttribute("data-reduce-motion") === "true";
}

function soundsEnabled(): boolean {
  return getPrefsSnapshot()?.preferences.soundsEnabled !== false;
}

function activeFeel(): SoundFeel {
  return getPrefsSnapshot()?.preferences.soundFeel ?? "soft";
}

function play(kind: SoundKind, name: FeelSoundName): void {
  if (reduceMotion()) return;
  if (!soundsEnabled()) return;
  const feel = activeFeel();
  const now = performance.now();
  const prev = lastPlayed.get(kind) ?? 0;
  if (now - prev < RATE_MS) return;
  lastPlayed.set(kind, now);
  const opts: PlayOptions = { detune: (Math.random() - 0.5) * 80 };
  void ensureReady()
    .then(() => {
      SOUND_PACKS[feel].play(name, opts);
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

/** Preview the active feel after the settings select patches preferences. */
export function previewSoundFeel(): void {
  playUiTap();
}

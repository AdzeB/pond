import { SOUND_PATCH, type UiSoundName } from "@pond/ui/sounds";
import type { FeedbackEvent } from "@shared/feedback";
import { ensureReady, type PlayOptions } from "@web-kits/audio";
import { getPrefsSnapshot } from "@/shared/state/prefs";

type SoundKind = UiSoundName | "toggle";

const RATE_MS = 40;
const RAPID_MS = 110;
const lastPlayed = new Map<SoundKind, number>();

function reduceMotion(): boolean {
  if (!("document" in globalThis)) return false;
  return (
    globalThis.document.documentElement.getAttribute("data-reduce-motion") ===
    "true"
  );
}

function soundsEnabled(interfaceSound: boolean): boolean {
  const prefs = getPrefsSnapshot();
  if (prefs?.preferences.soundsEnabled === false) return false;
  return !interfaceSound || prefs?.feedback.sounds.interface !== false;
}

function play(kind: SoundKind, name: UiSoundName, interfaceSound = true): void {
  if (reduceMotion()) return;
  if (!soundsEnabled(interfaceSound)) return;
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

function playTrashThunk(): void {
  play("trash", "trash", false);
}

export function emitFeedback(
  event: Extract<FeedbackEvent, "saveDeletion" | "folderDeletion">,
): void {
  const prefs = getPrefsSnapshot();
  if (prefs?.feedback.sounds[event] !== false) playTrashThunk();
  void window.pond.query("feedback.emit", { event }).catch(() => {});
}

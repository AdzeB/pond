import {
  definePatch,
  type Layer,
  type ReverbEffect,
  type SoundDefinition,
} from "@web-kits/audio";

export const UI_SOUND_NAMES = [
  "tap",
  "soft",
  "toggleOn",
  "toggleOff",
  "success",
  "trash",
] as const;

export type UiSoundName = (typeof UI_SOUND_NAMES)[number];

type SoundSet = Record<UiSoundName, SoundDefinition>;

type Hertz = number | { start: number; end: number };

interface ToneOptions {
  frequency: Hertz;
  gain: number;
  decay: number;
  delay?: number;
  attack?: number;
  release?: number;
}

function sine(opts: ToneOptions): Layer {
  return {
    source: { type: "sine", frequency: opts.frequency },
    envelope: {
      attack: opts.attack ?? 0.003,
      decay: opts.decay,
      sustain: 0,
      release: opts.release ?? 0.015,
    },
    delay: opts.delay,
    gain: opts.gain,
  };
}

/** Small, damped room; macOS cues are nearly dry, so frequent ones only get a trace. */
function room(mix: number, decay = 0.4): ReverbEffect {
  return { type: "reverb", decay, damping: 0.5, preDelay: 0.01, mix };
}

/** Modeled on measurements of macOS Tink, Media Keys, acknowledgment_sent, and Ping, not sampled from them. */
export const UI_SOUNDS = {
  tap: {
    layers: [
      sine({ frequency: { start: 740, end: 700 }, decay: 0.028, gain: 0.07 }),
      sine({ frequency: 3500, decay: 0.008, release: 0.006, gain: 0.006 }),
    ],
    effects: [room(0.04)],
  },
  soft: {
    layers: [
      sine({
        frequency: 520,
        attack: 0.002,
        decay: 0.014,
        release: 0.01,
        gain: 0.05,
      }),
      sine({ frequency: 2600, decay: 0.006, release: 0.005, gain: 0.005 }),
    ],
  },
  toggleOn: {
    layers: [
      sine({ frequency: { start: 620, end: 700 }, decay: 0.07, gain: 0.04 }),
      sine({ frequency: { start: 652, end: 736 }, decay: 0.07, gain: 0.035 }),
    ],
    effects: [room(0.05)],
  },
  toggleOff: {
    layers: [
      sine({ frequency: { start: 700, end: 600 }, decay: 0.07, gain: 0.038 }),
      sine({ frequency: { start: 736, end: 630 }, decay: 0.07, gain: 0.033 }),
    ],
    effects: [room(0.05)],
  },
  success: {
    layers: [
      sine({ frequency: 523.3, decay: 0.12, release: 0.04, gain: 0.07 }),
      sine({
        frequency: 784,
        decay: 0.3,
        release: 0.1,
        delay: 0.07,
        gain: 0.08,
      }),
      sine({
        frequency: 2352,
        decay: 0.1,
        release: 0.04,
        delay: 0.07,
        gain: 0.02,
      }),
    ],
    effects: [room(0.12, 0.7)],
  },
  trash: {
    layers: [
      {
        source: { type: "noise", color: "pink" },
        filter: {
          type: "bandpass",
          frequency: 1400,
          resonance: 0.8,
          envelope: { attack: 0.004, peak: 3600, decay: 0.12 },
        },
        envelope: { attack: 0.004, decay: 0.12, sustain: 0, release: 0.03 },
        effects: [{ type: "tremolo", rate: 38, depth: 0.7 }],
        gain: 0.045,
      },
      sine({
        frequency: { start: 330, end: 200 },
        decay: 0.08,
        release: 0.03,
        delay: 0.07,
        gain: 0.06,
      }),
    ],
    effects: [room(0.08)],
  },
} satisfies SoundSet;

export const SOUND_PATCH = definePatch({
  name: "pond",
  author: "pond",
  description: "Warm interface sounds modeled on macOS system cues",
  sounds: UI_SOUNDS,
});

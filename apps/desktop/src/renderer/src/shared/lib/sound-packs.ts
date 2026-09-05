import { definePatch, type Layer, type SoundDefinition } from "@web-kits/audio";

export const UI_SOUND_NAMES = [
  "tap",
  "soft",
  "toggleOn",
  "toggleOff",
  "success",
  "trash",
] as const;

export type UiSoundName = (typeof UI_SOUND_NAMES)[number];

const TONE = {
  type: "lowpass",
  frequency: 2200,
  resonance: 0.7,
} as const;

function tick(gain: number, frequency = 2100): Layer {
  return {
    source: { type: "noise", color: "pink" },
    filter: { type: "bandpass", frequency, resonance: 1.1 },
    envelope: { attack: 0, decay: 0.007, sustain: 0, release: 0.004 },
    gain,
  };
}

function tone(opts: {
  frequency: number | { start: number; end: number };
  gain: number;
  decay: number;
  delay?: number;
  attack?: number;
  release?: number;
  detune?: number;
}): Layer {
  return {
    source: {
      type: "triangle",
      frequency: opts.frequency,
      detune: opts.detune ?? 4,
    },
    filter: TONE,
    envelope: {
      attack: opts.attack ?? 0.002,
      decay: opts.decay,
      sustain: 0,
      release: opts.release ?? 0.016,
    },
    delay: opts.delay,
    gain: opts.gain,
  };
}

export const SOUND_PATCH = definePatch({
  name: "pond",
  author: "pond",
  description: "Quiet material interface sounds",
  sounds: {
    tap: {
      layers: [
        tick(0.028),
        tone({
          frequency: { start: 840, end: 680 },
          decay: 0.032,
          gain: 0.068,
        }),
      ],
    },
    soft: {
      layers: [
        tick(0.018, 2300),
        tone({
          frequency: 1080,
          decay: 0.022,
          release: 0.01,
          gain: 0.048,
        }),
      ],
    },
    toggleOn: {
      layers: [
        tick(0.03, 2000),
        tone({
          frequency: { start: 560, end: 700 },
          decay: 0.046,
          delay: 0.006,
          gain: 0.078,
        }),
      ],
    },
    toggleOff: {
      layers: [
        tick(0.026, 1900),
        tone({
          frequency: { start: 700, end: 500 },
          decay: 0.052,
          release: 0.02,
          delay: 0.006,
          gain: 0.074,
        }),
      ],
    },
    success: {
      layers: [
        tone({
          frequency: 622,
          decay: 0.14,
          attack: 0.003,
          release: 0.06,
          detune: 3,
          gain: 0.08,
        }),
        tone({
          frequency: 830,
          decay: 0.16,
          attack: 0.003,
          release: 0.06,
          delay: 0.014,
          detune: 3,
          gain: 0.09,
        }),
      ],
    },
    trash: {
      layers: [
        {
          source: { type: "noise", color: "pink" },
          filter: {
            type: "bandpass",
            frequency: 1320,
            resonance: 1.1,
            envelope: { attack: 0.02, peak: 420, decay: 0.2 },
          },
          envelope: { attack: 0.02, decay: 0.2, sustain: 0, release: 0.06 },
          gain: 0.055,
        },
        tone({
          frequency: { start: 220, end: 96 },
          decay: 0.16,
          attack: 0.004,
          release: 0.06,
          delay: 0.08,
          detune: 5,
          gain: 0.075,
        }),
      ],
    },
  },
});

export interface SoundAudition {
  id: string;
  title: string;
  description: string;
  definition: SoundDefinition;
}

export const SOUND_AUDITIONS: readonly SoundAudition[] = [
  {
    id: "tap-body",
    title: "Tap, more body",
    description:
      "Heavier low tick if the default feels thin on laptop speakers.",
    definition: {
      layers: [
        tick(0.026, 1800),
        tone({
          frequency: { start: 420, end: 170 },
          decay: 0.05,
          release: 0.02,
          gain: 0.08,
        }),
      ],
    },
  },
  {
    id: "success-notes",
    title: "Success, two notes",
    description: "Separated pitches if the default bloom feels muddy.",
    definition: {
      layers: [
        tone({
          frequency: 622,
          decay: 0.12,
          attack: 0.003,
          release: 0.05,
          detune: 3,
          gain: 0.08,
        }),
        tone({
          frequency: 830,
          decay: 0.16,
          attack: 0.003,
          release: 0.06,
          delay: 0.045,
          detune: 3,
          gain: 0.09,
        }),
      ],
    },
  },
  {
    id: "trash-short",
    title: "Trash, shorter",
    description: "A quicker drop if the whoosh outlasts the tumble.",
    definition: {
      layers: [
        {
          source: { type: "noise", color: "pink" },
          filter: {
            type: "bandpass",
            frequency: 1500,
            resonance: 1.1,
            envelope: { attack: 0.01, peak: 480, decay: 0.1 },
          },
          envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.04 },
          gain: 0.06,
        },
        tone({
          frequency: { start: 220, end: 96 },
          decay: 0.1,
          attack: 0.003,
          release: 0.04,
          delay: 0.03,
          detune: 5,
          gain: 0.075,
        }),
      ],
    },
  },
];

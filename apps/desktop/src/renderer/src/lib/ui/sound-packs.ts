import type { SoundFeel } from "@pond/schema/db";
import { definePatch, type SoundPatch } from "@web-kits/audio";

type ActiveFeel = SoundFeel;

/** Shared sound names every feel pack must provide. */
export type FeelSoundName =
  | "tap"
  | "soft"
  | "toggleOn"
  | "toggleOff"
  | "success"
  | "trash";

function feelPatch(
  name: ActiveFeel,
  description: string,
  sounds: SoundPatch["sounds"],
) {
  return definePatch({
    name: `pond-${name}`,
    author: "pond",
    description,
    sounds,
  });
}

/** event-tap + mood-warm */
const soft = feelPatch("soft", "Warm lowpass taps", {
  tap: {
    source: { type: "sine", frequency: 1300, fm: { ratio: 0.5, depth: 80 } },
    filter: { type: "lowpass", frequency: 2500 },
    envelope: { attack: 0, decay: 0.018, sustain: 0, release: 0.006 },
    effects: [{ type: "reverb", decay: 0.35, mix: 0.08 }],
    gain: 0.16,
  },
  soft: {
    source: { type: "sine", frequency: 1100, fm: { ratio: 0.5, depth: 50 } },
    filter: { type: "lowpass", frequency: 2000 },
    envelope: { attack: 0, decay: 0.016, sustain: 0, release: 0.005 },
    gain: 0.1,
  },
  toggleOn: {
    layers: [
      {
        source: { type: "sine", frequency: 1800 },
        filter: { type: "lowpass", frequency: 2800 },
        envelope: { attack: 0, decay: 0.014, sustain: 0, release: 0.005 },
        gain: 0.14,
      },
      {
        source: { type: "sine", frequency: 2400 },
        filter: { type: "lowpass", frequency: 2800 },
        envelope: { attack: 0, decay: 0.014, sustain: 0, release: 0.005 },
        delay: 0.028,
        gain: 0.12,
      },
    ],
  },
  toggleOff: {
    layers: [
      {
        source: { type: "sine", frequency: 2400 },
        filter: { type: "lowpass", frequency: 2800 },
        envelope: { attack: 0, decay: 0.014, sustain: 0, release: 0.005 },
        gain: 0.12,
      },
      {
        source: { type: "sine", frequency: 1800 },
        filter: { type: "lowpass", frequency: 2800 },
        envelope: { attack: 0, decay: 0.014, sustain: 0, release: 0.005 },
        delay: 0.028,
        gain: 0.14,
      },
    ],
  },
  success: {
    layers: [
      {
        source: { type: "sine", frequency: 523 },
        filter: { type: "lowpass", frequency: 3200 },
        envelope: { attack: 0.003, decay: 0.28, sustain: 0.05, release: 0.1 },
        gain: 0.14,
      },
      {
        source: { type: "sine", frequency: 659 },
        filter: { type: "lowpass", frequency: 3200 },
        envelope: { attack: 0.003, decay: 0.26, sustain: 0.04, release: 0.1 },
        delay: 0.07,
        gain: 0.12,
      },
      {
        source: { type: "sine", frequency: { start: 784, end: 880 } },
        filter: { type: "lowpass", frequency: 3200 },
        envelope: { attack: 0.003, decay: 0.3, sustain: 0.05, release: 0.12 },
        delay: 0.14,
        gain: 0.13,
      },
    ],
  },
  trash: {
    layers: [
      {
        source: { type: "triangle", frequency: { start: 280, end: 110 } },
        filter: { type: "lowpass", frequency: 1100 },
        envelope: { attack: 0, decay: 0.18, sustain: 0, release: 0.06 },
        gain: 0.18,
      },
      {
        source: { type: "sine", frequency: { start: 160, end: 70 } },
        filter: { type: "lowpass", frequency: 800 },
        envelope: { attack: 0, decay: 0.16, sustain: 0, release: 0.05 },
        delay: 0.02,
        gain: 0.1,
      },
    ],
  },
});

/** event-tap + mood-bright + mood-punchy */
const crisp = feelPatch("crisp", "Bright punchy taps with FM sparkle", {
  tap: {
    source: { type: "sine", frequency: 1500, fm: { ratio: 2.5, depth: 55 } },
    envelope: { attack: 0, decay: 0.014, sustain: 0, release: 0.005 },
    gain: 0.18,
  },
  soft: {
    source: { type: "sine", frequency: 1700, fm: { ratio: 2.5, depth: 40 } },
    envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.004 },
    gain: 0.1,
  },
  toggleOn: {
    layers: [
      {
        source: {
          type: "sine",
          frequency: 2093,
          fm: { ratio: 2.5, depth: 40 },
        },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.004 },
        gain: 0.16,
      },
      {
        source: {
          type: "sine",
          frequency: 3136,
          fm: { ratio: 2.5, depth: 40 },
        },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.004 },
        delay: 0.022,
        gain: 0.14,
      },
    ],
  },
  toggleOff: {
    layers: [
      {
        source: {
          type: "sine",
          frequency: 3136,
          fm: { ratio: 2.5, depth: 40 },
        },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.004 },
        gain: 0.14,
      },
      {
        source: {
          type: "sine",
          frequency: 2093,
          fm: { ratio: 2.5, depth: 40 },
        },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.004 },
        delay: 0.022,
        gain: 0.16,
      },
    ],
  },
  success: {
    layers: [
      {
        source: { type: "sine", frequency: 659, fm: { ratio: 2.5, depth: 40 } },
        envelope: { attack: 0.002, decay: 0.22, sustain: 0.04, release: 0.08 },
        gain: 0.14,
      },
      {
        source: { type: "sine", frequency: 831, fm: { ratio: 2.5, depth: 40 } },
        envelope: { attack: 0.002, decay: 0.2, sustain: 0.03, release: 0.08 },
        delay: 0.06,
        gain: 0.12,
      },
      {
        source: {
          type: "sine",
          frequency: { start: 988, end: 1175 },
          fm: { ratio: 2.5, depth: 35 },
        },
        envelope: { attack: 0.002, decay: 0.24, sustain: 0.04, release: 0.1 },
        delay: 0.12,
        gain: 0.13,
      },
    ],
  },
  trash: {
    layers: [
      {
        source: { type: "sawtooth", frequency: { start: 340, end: 150 } },
        filter: { type: "lowpass", frequency: 1400 },
        envelope: { attack: 0, decay: 0.14, sustain: 0, release: 0.05 },
        gain: 0.16,
      },
      {
        source: { type: "square", frequency: { start: 190, end: 90 } },
        filter: { type: "lowpass", frequency: 900 },
        envelope: { attack: 0, decay: 0.12, sustain: 0, release: 0.04 },
        delay: 0.025,
        gain: 0.1,
      },
    ],
  },
});

/** layer-click-plus-body + mood-organic */
const thock = feelPatch("thock", "Weighted click with a low body", {
  tap: {
    layers: [
      {
        source: {
          type: "sine",
          frequency: 3600,
          fm: { ratio: 0.5, depth: 180 },
          detune: 6,
        },
        envelope: { attack: 0, decay: 0.008, sustain: 0, release: 0.003 },
        gain: 0.12,
      },
      {
        source: {
          type: "triangle",
          frequency: { start: 220, end: 90 },
          detune: 5,
        },
        envelope: { attack: 0.002, decay: 0.1, sustain: 0, release: 0.04 },
        effects: [{ type: "reverb", decay: 0.25, mix: 0.06 }],
        gain: 0.16,
      },
    ],
  },
  soft: {
    source: {
      type: "triangle",
      frequency: { start: 280, end: 140 },
      detune: 5,
    },
    envelope: { attack: 0.003, decay: 0.06, sustain: 0, release: 0.03 },
    gain: 0.1,
  },
  toggleOn: {
    layers: [
      {
        source: { type: "triangle", frequency: 420, detune: 4 },
        envelope: { attack: 0.002, decay: 0.05, sustain: 0, release: 0.025 },
        gain: 0.14,
      },
      {
        source: { type: "triangle", frequency: 560, detune: 4 },
        envelope: { attack: 0.002, decay: 0.05, sustain: 0, release: 0.025 },
        delay: 0.03,
        gain: 0.12,
      },
    ],
  },
  toggleOff: {
    layers: [
      {
        source: { type: "triangle", frequency: 560, detune: 4 },
        envelope: { attack: 0.002, decay: 0.05, sustain: 0, release: 0.025 },
        gain: 0.12,
      },
      {
        source: { type: "triangle", frequency: 420, detune: 4 },
        envelope: { attack: 0.002, decay: 0.05, sustain: 0, release: 0.025 },
        delay: 0.03,
        gain: 0.14,
      },
    ],
  },
  success: {
    layers: [
      {
        source: { type: "triangle", frequency: 392, detune: 4 },
        envelope: { attack: 0.004, decay: 0.26, sustain: 0.04, release: 0.1 },
        gain: 0.14,
      },
      {
        source: { type: "triangle", frequency: 494, detune: 4 },
        envelope: { attack: 0.004, decay: 0.24, sustain: 0.03, release: 0.1 },
        delay: 0.08,
        gain: 0.12,
      },
      {
        source: {
          type: "triangle",
          frequency: { start: 587, end: 659 },
          detune: 4,
        },
        envelope: { attack: 0.004, decay: 0.28, sustain: 0.04, release: 0.12 },
        delay: 0.16,
        gain: 0.13,
      },
    ],
  },
  trash: {
    layers: [
      {
        source: {
          type: "triangle",
          frequency: { start: 200, end: 60 },
          detune: 6,
        },
        envelope: { attack: 0.003, decay: 0.18, sustain: 0, release: 0.06 },
        gain: 0.18,
      },
      {
        source: { type: "noise", color: "brown" },
        filter: { type: "lowpass", frequency: 500 },
        envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 },
        gain: 0.08,
      },
    ],
  },
});

/** event-tap + mood-glassy (short for UI) */
const glass = feelPatch("glass", "Crystalline FM bells", {
  tap: {
    source: { type: "sine", frequency: 1400, fm: { ratio: 3.5, depth: 220 } },
    envelope: { attack: 0, decay: 0.05, sustain: 0, release: 0.03 },
    effects: [{ type: "reverb", decay: 0.5, damping: 0.5, mix: 0.12 }],
    gain: 0.14,
  },
  soft: {
    source: { type: "sine", frequency: 1200, fm: { ratio: 3.5, depth: 160 } },
    envelope: { attack: 0, decay: 0.04, sustain: 0, release: 0.025 },
    effects: [{ type: "reverb", decay: 0.4, damping: 0.55, mix: 0.1 }],
    gain: 0.09,
  },
  toggleOn: {
    layers: [
      {
        source: {
          type: "sine",
          frequency: 1760,
          fm: { ratio: 3.5, depth: 180 },
        },
        envelope: { attack: 0, decay: 0.04, sustain: 0, release: 0.02 },
        effects: [{ type: "reverb", decay: 0.45, damping: 0.5, mix: 0.1 }],
        gain: 0.12,
      },
      {
        source: {
          type: "sine",
          frequency: 2637,
          fm: { ratio: 3.5, depth: 160 },
        },
        envelope: { attack: 0, decay: 0.04, sustain: 0, release: 0.02 },
        delay: 0.03,
        effects: [{ type: "reverb", decay: 0.45, damping: 0.5, mix: 0.1 }],
        gain: 0.1,
      },
    ],
  },
  toggleOff: {
    layers: [
      {
        source: {
          type: "sine",
          frequency: 2637,
          fm: { ratio: 3.5, depth: 160 },
        },
        envelope: { attack: 0, decay: 0.04, sustain: 0, release: 0.02 },
        effects: [{ type: "reverb", decay: 0.45, damping: 0.5, mix: 0.1 }],
        gain: 0.1,
      },
      {
        source: {
          type: "sine",
          frequency: 1760,
          fm: { ratio: 3.5, depth: 180 },
        },
        envelope: { attack: 0, decay: 0.04, sustain: 0, release: 0.02 },
        delay: 0.03,
        effects: [{ type: "reverb", decay: 0.45, damping: 0.5, mix: 0.1 }],
        gain: 0.12,
      },
    ],
  },
  success: {
    layers: [
      {
        source: {
          type: "sine",
          frequency: 784,
          fm: { ratio: 3.5, depth: 200 },
        },
        envelope: { attack: 0.002, decay: 0.35, sustain: 0.04, release: 0.15 },
        effects: [{ type: "reverb", decay: 0.65, damping: 0.5, mix: 0.14 }],
        gain: 0.12,
      },
      {
        source: {
          type: "sine",
          frequency: 988,
          fm: { ratio: 3.5, depth: 180 },
        },
        envelope: { attack: 0.002, decay: 0.32, sustain: 0.03, release: 0.15 },
        delay: 0.08,
        effects: [{ type: "reverb", decay: 0.65, damping: 0.5, mix: 0.14 }],
        gain: 0.11,
      },
      {
        source: {
          type: "sine",
          frequency: { start: 1175, end: 1319 },
          fm: { ratio: 3.5, depth: 160 },
        },
        envelope: { attack: 0.002, decay: 0.38, sustain: 0.04, release: 0.18 },
        delay: 0.16,
        effects: [{ type: "reverb", decay: 0.7, damping: 0.45, mix: 0.14 }],
        gain: 0.11,
      },
    ],
  },
  trash: {
    source: {
      type: "sine",
      frequency: { start: 900, end: 220 },
      fm: { ratio: 3.2, depth: 180 },
    },
    envelope: { attack: 0, decay: 0.2, sustain: 0, release: 0.08 },
    effects: [{ type: "reverb", decay: 0.5, damping: 0.6, mix: 0.12 }],
    gain: 0.14,
  },
});

/** event-tap + mood-metallic */
const metal = feelPatch("metal", "Inharmonic metallic clang", {
  tap: {
    source: { type: "sine", frequency: 1200, fm: { ratio: 2.76, depth: 320 } },
    envelope: { attack: 0, decay: 0.04, sustain: 0, release: 0.02 },
    gain: 0.15,
  },
  soft: {
    source: { type: "sine", frequency: 1000, fm: { ratio: 2.76, depth: 240 } },
    envelope: { attack: 0, decay: 0.035, sustain: 0, release: 0.018 },
    gain: 0.1,
  },
  toggleOn: {
    layers: [
      {
        source: {
          type: "sine",
          frequency: 1100,
          fm: { ratio: 2.76, depth: 280 },
        },
        envelope: { attack: 0, decay: 0.035, sustain: 0, release: 0.018 },
        gain: 0.13,
      },
      {
        source: {
          type: "sine",
          frequency: 1650,
          fm: { ratio: 2.76, depth: 260 },
        },
        envelope: { attack: 0, decay: 0.035, sustain: 0, release: 0.018 },
        delay: 0.028,
        gain: 0.11,
      },
    ],
  },
  toggleOff: {
    layers: [
      {
        source: {
          type: "sine",
          frequency: 1650,
          fm: { ratio: 2.76, depth: 260 },
        },
        envelope: { attack: 0, decay: 0.035, sustain: 0, release: 0.018 },
        gain: 0.11,
      },
      {
        source: {
          type: "sine",
          frequency: 1100,
          fm: { ratio: 2.76, depth: 280 },
        },
        envelope: { attack: 0, decay: 0.035, sustain: 0, release: 0.018 },
        delay: 0.028,
        gain: 0.13,
      },
    ],
  },
  success: {
    layers: [
      {
        source: {
          type: "sine",
          frequency: 880,
          fm: { ratio: 2.76, depth: 300 },
        },
        envelope: { attack: 0, decay: 0.28, sustain: 0.03, release: 0.12 },
        gain: 0.13,
      },
      {
        source: {
          type: "sine",
          frequency: 1320,
          fm: { ratio: 2.76, depth: 280 },
        },
        envelope: { attack: 0, decay: 0.26, sustain: 0.03, release: 0.12 },
        delay: 0.07,
        gain: 0.12,
      },
      {
        source: {
          type: "sine",
          frequency: { start: 1760, end: 1980 },
          fm: { ratio: 2.76, depth: 260 },
        },
        envelope: { attack: 0, decay: 0.3, sustain: 0.03, release: 0.14 },
        delay: 0.14,
        gain: 0.12,
      },
    ],
  },
  trash: {
    source: {
      type: "sine",
      frequency: { start: 700, end: 180 },
      fm: { ratio: 2.76, depth: 300 },
    },
    envelope: { attack: 0, decay: 0.22, sustain: 0, release: 0.08 },
    gain: 0.16,
  },
});

/** event-click + mood-lofi */
const lofi = feelPatch("lofi", "Bitcrushed lowpass clicks", {
  tap: {
    source: {
      type: "sine",
      frequency: { start: 220, end: 720 },
      fm: { ratio: 0.5, depth: 70 },
    },
    filter: { type: "lowpass", frequency: 1500 },
    envelope: { attack: 0, decay: 0.05, sustain: 0, release: 0.018 },
    effects: [{ type: "bitcrusher", bits: 6, mix: 0.85 }],
    gain: 0.16,
  },
  soft: {
    source: { type: "sine", frequency: 1000, fm: { ratio: 0.5, depth: 50 } },
    filter: { type: "lowpass", frequency: 1400 },
    envelope: { attack: 0, decay: 0.02, sustain: 0, release: 0.008 },
    effects: [{ type: "bitcrusher", bits: 7, mix: 0.75 }],
    gain: 0.1,
  },
  toggleOn: {
    layers: [
      {
        source: { type: "sine", frequency: 1200 },
        filter: { type: "lowpass", frequency: 1600 },
        envelope: { attack: 0, decay: 0.016, sustain: 0, release: 0.006 },
        effects: [{ type: "bitcrusher", bits: 6, mix: 0.8 }],
        gain: 0.13,
      },
      {
        source: { type: "sine", frequency: 1600 },
        filter: { type: "lowpass", frequency: 1600 },
        envelope: { attack: 0, decay: 0.016, sustain: 0, release: 0.006 },
        delay: 0.03,
        effects: [{ type: "bitcrusher", bits: 6, mix: 0.8 }],
        gain: 0.11,
      },
    ],
  },
  toggleOff: {
    layers: [
      {
        source: { type: "sine", frequency: 1600 },
        filter: { type: "lowpass", frequency: 1600 },
        envelope: { attack: 0, decay: 0.016, sustain: 0, release: 0.006 },
        effects: [{ type: "bitcrusher", bits: 6, mix: 0.8 }],
        gain: 0.11,
      },
      {
        source: { type: "sine", frequency: 1200 },
        filter: { type: "lowpass", frequency: 1600 },
        envelope: { attack: 0, decay: 0.016, sustain: 0, release: 0.006 },
        delay: 0.03,
        effects: [{ type: "bitcrusher", bits: 6, mix: 0.8 }],
        gain: 0.13,
      },
    ],
  },
  success: {
    layers: [
      {
        source: { type: "sine", frequency: 523 },
        filter: { type: "lowpass", frequency: 1800 },
        envelope: { attack: 0.003, decay: 0.26, sustain: 0.04, release: 0.1 },
        effects: [{ type: "bitcrusher", bits: 7, mix: 0.7 }],
        gain: 0.13,
      },
      {
        source: { type: "sine", frequency: 659 },
        filter: { type: "lowpass", frequency: 1800 },
        envelope: { attack: 0.003, decay: 0.24, sustain: 0.03, release: 0.1 },
        delay: 0.07,
        effects: [{ type: "bitcrusher", bits: 7, mix: 0.7 }],
        gain: 0.11,
      },
      {
        source: { type: "sine", frequency: { start: 784, end: 880 } },
        filter: { type: "lowpass", frequency: 1800 },
        envelope: { attack: 0.003, decay: 0.28, sustain: 0.04, release: 0.12 },
        delay: 0.14,
        effects: [{ type: "bitcrusher", bits: 7, mix: 0.7 }],
        gain: 0.12,
      },
    ],
  },
  trash: {
    layers: [
      {
        source: { type: "sawtooth", frequency: { start: 280, end: 120 } },
        filter: { type: "lowpass", frequency: 1200 },
        envelope: { attack: 0, decay: 0.18, sustain: 0, release: 0.06 },
        effects: [{ type: "bitcrusher", bits: 5, mix: 0.9 }],
        gain: 0.16,
      },
      {
        source: { type: "square", frequency: { start: 160, end: 70 } },
        filter: { type: "lowpass", frequency: 800 },
        envelope: { attack: 0, decay: 0.15, sustain: 0, release: 0.05 },
        delay: 0.03,
        effects: [{ type: "bitcrusher", bits: 5, mix: 0.9 }],
        gain: 0.1,
      },
    ],
  },
});

/** event-click + mood-retro */
const retro = feelPatch("retro", "8-bit square chiptune", {
  tap: {
    source: { type: "square", frequency: { start: 700, end: 1100 } },
    filter: { type: "lowpass", frequency: 3000 },
    envelope: { attack: 0, decay: 0.045, sustain: 0, release: 0.015 },
    effects: [{ type: "bitcrusher", bits: 8, sampleRateReduction: 3, mix: 1 }],
    gain: 0.14,
  },
  soft: {
    source: { type: "square", frequency: 900 },
    filter: { type: "lowpass", frequency: 2800 },
    envelope: { attack: 0, decay: 0.03, sustain: 0, release: 0.01 },
    effects: [{ type: "bitcrusher", bits: 8, sampleRateReduction: 2, mix: 1 }],
    gain: 0.09,
  },
  toggleOn: {
    layers: [
      {
        source: { type: "square", frequency: 1047 },
        filter: { type: "lowpass", frequency: 3000 },
        envelope: { attack: 0, decay: 0.03, sustain: 0, release: 0.01 },
        effects: [
          { type: "bitcrusher", bits: 8, sampleRateReduction: 3, mix: 1 },
        ],
        gain: 0.12,
      },
      {
        source: { type: "square", frequency: 1568 },
        filter: { type: "lowpass", frequency: 3000 },
        envelope: { attack: 0, decay: 0.03, sustain: 0, release: 0.01 },
        delay: 0.035,
        effects: [
          { type: "bitcrusher", bits: 8, sampleRateReduction: 3, mix: 1 },
        ],
        gain: 0.1,
      },
    ],
  },
  toggleOff: {
    layers: [
      {
        source: { type: "square", frequency: 1568 },
        filter: { type: "lowpass", frequency: 3000 },
        envelope: { attack: 0, decay: 0.03, sustain: 0, release: 0.01 },
        effects: [
          { type: "bitcrusher", bits: 8, sampleRateReduction: 3, mix: 1 },
        ],
        gain: 0.1,
      },
      {
        source: { type: "square", frequency: 1047 },
        filter: { type: "lowpass", frequency: 3000 },
        envelope: { attack: 0, decay: 0.03, sustain: 0, release: 0.01 },
        delay: 0.035,
        effects: [
          { type: "bitcrusher", bits: 8, sampleRateReduction: 3, mix: 1 },
        ],
        gain: 0.12,
      },
    ],
  },
  success: {
    layers: [
      {
        source: { type: "square", frequency: 523 },
        filter: { type: "lowpass", frequency: 3200 },
        envelope: { attack: 0, decay: 0.12, sustain: 0, release: 0.04 },
        effects: [
          { type: "bitcrusher", bits: 8, sampleRateReduction: 2, mix: 1 },
        ],
        gain: 0.12,
      },
      {
        source: { type: "square", frequency: 659 },
        filter: { type: "lowpass", frequency: 3200 },
        envelope: { attack: 0, decay: 0.12, sustain: 0, release: 0.04 },
        delay: 0.07,
        effects: [
          { type: "bitcrusher", bits: 8, sampleRateReduction: 2, mix: 1 },
        ],
        gain: 0.11,
      },
      {
        source: { type: "square", frequency: { start: 784, end: 1047 } },
        filter: { type: "lowpass", frequency: 3200 },
        envelope: { attack: 0, decay: 0.16, sustain: 0, release: 0.05 },
        delay: 0.14,
        effects: [
          { type: "bitcrusher", bits: 8, sampleRateReduction: 2, mix: 1 },
        ],
        gain: 0.11,
      },
    ],
  },
  trash: {
    source: { type: "sawtooth", frequency: { start: 400, end: 100 } },
    filter: { type: "lowpass", frequency: 2200 },
    envelope: { attack: 0, decay: 0.16, sustain: 0, release: 0.05 },
    effects: [{ type: "bitcrusher", bits: 6, sampleRateReduction: 4, mix: 1 }],
    gain: 0.15,
  },
});

/** event-tap + mood-organic + mood-warm */
const organic = feelPatch("organic", "Triangle pops with soft reverb", {
  tap: {
    source: {
      type: "triangle",
      frequency: { start: 900, end: 500 },
      detune: 7,
    },
    filter: { type: "lowpass", frequency: 2400 },
    envelope: { attack: 0.004, decay: 0.05, sustain: 0, release: 0.025 },
    effects: [{ type: "reverb", decay: 0.3, mix: 0.08 }],
    gain: 0.16,
  },
  soft: {
    source: { type: "triangle", frequency: 700, detune: 6 },
    filter: { type: "lowpass", frequency: 2000 },
    envelope: { attack: 0.005, decay: 0.04, sustain: 0, release: 0.02 },
    effects: [{ type: "reverb", decay: 0.25, mix: 0.06 }],
    gain: 0.1,
  },
  toggleOn: {
    layers: [
      {
        source: { type: "triangle", frequency: 660, detune: 5 },
        envelope: { attack: 0.004, decay: 0.045, sustain: 0, release: 0.02 },
        effects: [{ type: "reverb", decay: 0.25, mix: 0.06 }],
        gain: 0.13,
      },
      {
        source: { type: "triangle", frequency: 880, detune: 5 },
        envelope: { attack: 0.004, decay: 0.045, sustain: 0, release: 0.02 },
        delay: 0.032,
        effects: [{ type: "reverb", decay: 0.25, mix: 0.06 }],
        gain: 0.11,
      },
    ],
  },
  toggleOff: {
    layers: [
      {
        source: { type: "triangle", frequency: 880, detune: 5 },
        envelope: { attack: 0.004, decay: 0.045, sustain: 0, release: 0.02 },
        effects: [{ type: "reverb", decay: 0.25, mix: 0.06 }],
        gain: 0.11,
      },
      {
        source: { type: "triangle", frequency: 660, detune: 5 },
        envelope: { attack: 0.004, decay: 0.045, sustain: 0, release: 0.02 },
        delay: 0.032,
        effects: [{ type: "reverb", decay: 0.25, mix: 0.06 }],
        gain: 0.13,
      },
    ],
  },
  success: {
    layers: [
      {
        source: { type: "triangle", frequency: 523, detune: 4 },
        envelope: { attack: 0.005, decay: 0.28, sustain: 0.04, release: 0.1 },
        effects: [{ type: "reverb", decay: 0.35, mix: 0.08 }],
        gain: 0.13,
      },
      {
        source: { type: "triangle", frequency: 659, detune: 4 },
        envelope: { attack: 0.005, decay: 0.26, sustain: 0.03, release: 0.1 },
        delay: 0.08,
        effects: [{ type: "reverb", decay: 0.35, mix: 0.08 }],
        gain: 0.12,
      },
      {
        source: {
          type: "triangle",
          frequency: { start: 784, end: 880 },
          detune: 4,
        },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.04, release: 0.12 },
        delay: 0.16,
        effects: [{ type: "reverb", decay: 0.4, mix: 0.08 }],
        gain: 0.12,
      },
    ],
  },
  trash: {
    source: {
      type: "triangle",
      frequency: { start: 320, end: 90 },
      detune: 8,
    },
    filter: { type: "lowpass", frequency: 1200 },
    envelope: { attack: 0.004, decay: 0.16, sustain: 0, release: 0.06 },
    effects: [{ type: "reverb", decay: 0.3, mix: 0.08 }],
    gain: 0.16,
  },
});

/** event-tick / event-swoosh + mood-airy */
const airy = feelPatch("airy", "Whispery noise and light ticks", {
  tap: {
    source: { type: "noise", color: "white" },
    filter: {
      type: "bandpass",
      frequency: 900,
      resonance: 1.4,
      envelope: { attack: 0.008, peak: 4500, decay: 0.04 },
    },
    envelope: { attack: 0.006, decay: 0.05, sustain: 0, release: 0.02 },
    gain: 0.1,
  },
  soft: {
    source: { type: "noise", color: "pink" },
    filter: {
      type: "bandpass",
      frequency: 700,
      resonance: 1.1,
      envelope: { attack: 0.01, peak: 3200, decay: 0.05 },
    },
    envelope: { attack: 0.01, decay: 0.06, sustain: 0, release: 0.025 },
    gain: 0.07,
  },
  toggleOn: {
    layers: [
      {
        source: {
          type: "sine",
          frequency: 1600,
          fm: { ratio: 0.5, depth: 40 },
        },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.005 },
        gain: 0.08,
      },
      {
        source: { type: "noise", color: "white" },
        filter: {
          type: "bandpass",
          frequency: 1200,
          resonance: 1.2,
          envelope: { attack: 0.01, peak: 4000, decay: 0.05 },
        },
        envelope: { attack: 0.008, decay: 0.06, sustain: 0, release: 0.02 },
        delay: 0.02,
        gain: 0.06,
      },
    ],
  },
  toggleOff: {
    layers: [
      {
        source: { type: "noise", color: "white" },
        filter: {
          type: "bandpass",
          frequency: 2800,
          resonance: 1.2,
          envelope: { attack: 0.008, peak: 800, decay: 0.06 },
        },
        envelope: { attack: 0.008, decay: 0.07, sustain: 0, release: 0.025 },
        gain: 0.07,
      },
      {
        source: {
          type: "sine",
          frequency: 1100,
          fm: { ratio: 0.5, depth: 40 },
        },
        envelope: { attack: 0, decay: 0.014, sustain: 0, release: 0.006 },
        delay: 0.025,
        gain: 0.08,
      },
    ],
  },
  success: {
    layers: [
      {
        source: { type: "sine", frequency: 660 },
        envelope: { attack: 0.01, decay: 0.22, sustain: 0.03, release: 0.1 },
        gain: 0.1,
      },
      {
        source: { type: "noise", color: "white" },
        filter: {
          type: "bandpass",
          frequency: 600,
          resonance: 1.1,
          envelope: { attack: 0.04, peak: 5000, decay: 0.18 },
        },
        envelope: { attack: 0.03, decay: 0.25, sustain: 0, release: 0.08 },
        delay: 0.05,
        gain: 0.08,
      },
      {
        source: { type: "sine", frequency: { start: 880, end: 1047 } },
        envelope: { attack: 0.01, decay: 0.26, sustain: 0.03, release: 0.12 },
        delay: 0.12,
        gain: 0.1,
      },
    ],
  },
  trash: {
    source: { type: "noise", color: "pink" },
    filter: {
      type: "bandpass",
      frequency: 2000,
      resonance: 1.3,
      envelope: { attack: 0.01, peak: 400, decay: 0.14 },
    },
    envelope: { attack: 0.01, decay: 0.16, sustain: 0, release: 0.06 },
    gain: 0.12,
  },
});

/** event-click + mood-punchy */
const punchy = feelPatch("punchy", "Hard transient snaps", {
  tap: {
    source: {
      type: "sine",
      frequency: { start: 200, end: 800 },
      fm: { ratio: 0.5, depth: 90 },
    },
    envelope: { attack: 0, decay: 0.035, sustain: 0, release: 0.01 },
    gain: 0.22,
  },
  soft: {
    source: { type: "sine", frequency: 1400, fm: { ratio: 0.5, depth: 70 } },
    envelope: { attack: 0, decay: 0.02, sustain: 0, release: 0.008 },
    gain: 0.12,
  },
  toggleOn: {
    layers: [
      {
        source: { type: "sine", frequency: 2093 },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.004 },
        gain: 0.18,
      },
      {
        source: { type: "sine", frequency: 3136 },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.004 },
        delay: 0.02,
        gain: 0.16,
      },
    ],
  },
  toggleOff: {
    layers: [
      {
        source: { type: "sine", frequency: 3136 },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.004 },
        gain: 0.16,
      },
      {
        source: { type: "sine", frequency: 2093 },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.004 },
        delay: 0.02,
        gain: 0.18,
      },
    ],
  },
  success: {
    layers: [
      {
        source: { type: "sine", frequency: 523 },
        envelope: { attack: 0, decay: 0.18, sustain: 0, release: 0.05 },
        gain: 0.16,
      },
      {
        source: { type: "sine", frequency: 659 },
        envelope: { attack: 0, decay: 0.16, sustain: 0, release: 0.05 },
        delay: 0.05,
        gain: 0.14,
      },
      {
        source: { type: "sine", frequency: { start: 784, end: 988 } },
        envelope: { attack: 0, decay: 0.2, sustain: 0, release: 0.06 },
        delay: 0.1,
        gain: 0.14,
      },
    ],
  },
  trash: {
    layers: [
      {
        source: { type: "sawtooth", frequency: { start: 360, end: 140 } },
        filter: { type: "lowpass", frequency: 1300 },
        envelope: { attack: 0, decay: 0.12, sustain: 0, release: 0.04 },
        gain: 0.2,
      },
      {
        source: { type: "square", frequency: { start: 200, end: 80 } },
        filter: { type: "lowpass", frequency: 900 },
        envelope: { attack: 0, decay: 0.1, sustain: 0, release: 0.03 },
        delay: 0.02,
        gain: 0.12,
      },
    ],
  },
});

export const SOUND_PACKS: Record<ActiveFeel, ReturnType<typeof definePatch>> = {
  soft,
  crisp,
  thock,
  glass,
  metal,
  lofi,
  retro,
  organic,
  airy,
  punchy,
};

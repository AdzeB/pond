import { describe, expect, it } from "vitest";
import { SOUND_AUDITIONS, SOUND_PATCH, UI_SOUND_NAMES } from "./sound-packs";

interface LayerLike {
  envelope?: {
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
  };
  delay?: number;
  gain?: number;
  source?: {
    frequency?: number | { start: number; end: number };
  };
  filter?: {
    frequency?: number;
    envelope?: { peak?: number };
  };
}

function layersOf(sound: unknown): LayerLike[] {
  if (!sound || typeof sound !== "object") return [];
  if ("layers" in sound && Array.isArray(sound.layers)) {
    return sound.layers as LayerLike[];
  }
  return [sound as LayerLike];
}

function frequencies(layer: LayerLike): number[] {
  const values: number[] = [];
  const freq = layer.source?.frequency;
  if (typeof freq === "number") values.push(freq);
  else if (freq) values.push(freq.start, freq.end);
  if (typeof layer.filter?.frequency === "number") {
    values.push(layer.filter.frequency);
  }
  if (typeof layer.filter?.envelope?.peak === "number") {
    values.push(layer.filter.envelope.peak);
  }
  return values;
}

function durationMs(layer: LayerLike): number {
  const env = layer.envelope;
  const attack = env?.attack ?? 0;
  const decay = env?.decay ?? 0;
  const release = env?.release ?? 0;
  const delay = layer.delay ?? 0;
  return (delay + attack + decay + release) * 1000;
}

describe("sound packs", () => {
  const patch = SOUND_PATCH.toJSON();

  it("exposes every production cue", () => {
    expect(patch.sounds).toBeDefined();
    expect(Object.keys(patch.sounds ?? {})).toEqual([...UI_SOUND_NAMES]);
  });

  it("keeps envelopes, gain, and frequencies in UI bounds", () => {
    for (const name of UI_SOUND_NAMES) {
      const layers = layersOf(patch.sounds?.[name]);
      expect(layers.length).toBeGreaterThan(0);
      expect(layers.length).toBeLessThanOrEqual(2);

      let gain = 0;
      let longest = 0;
      for (const layer of layers) {
        expect(layer.envelope?.decay ?? 0).toBeGreaterThan(0);
        if ((layer.envelope?.sustain ?? 0) > 0) {
          expect(layer.envelope?.release ?? 0).toBeGreaterThan(0);
        }
        gain += layer.gain ?? 0.5;
        longest = Math.max(longest, durationMs(layer));
        for (const hz of frequencies(layer)) {
          expect(hz).toBeGreaterThanOrEqual(20);
          expect(hz).toBeLessThanOrEqual(8000);
        }
      }

      expect(gain).toBeLessThanOrEqual(0.6);
      if (name === "tap" || name === "soft") {
        expect(gain).toBeLessThanOrEqual(0.2);
        expect(longest).toBeLessThanOrEqual(100);
      }
      if (name === "toggleOn" || name === "toggleOff") {
        expect(longest).toBeLessThanOrEqual(200);
      }
      if (name === "success") {
        expect(longest).toBeLessThanOrEqual(800);
      }
      if (name === "trash") {
        expect(longest).toBeLessThanOrEqual(500);
      }
    }
  });

  it("keeps frequent cues quieter than rare ones", () => {
    const gainOf = (name: (typeof UI_SOUND_NAMES)[number]) =>
      layersOf(patch.sounds?.[name]).reduce(
        (sum, layer) => sum + (layer.gain ?? 0.5),
        0,
      );
    expect(gainOf("tap")).toBeLessThan(gainOf("success"));
    expect(gainOf("soft")).toBeLessThan(gainOf("tap"));
    expect(gainOf("toggleOn")).toBeLessThan(gainOf("success"));
  });

  it("ships audition leftovers as extra definitions", () => {
    expect(SOUND_AUDITIONS.map((cue) => cue.id)).toEqual([
      "tap-body",
      "success-notes",
      "trash-short",
    ]);
    for (const cue of SOUND_AUDITIONS) {
      expect(layersOf(cue.definition).length).toBeGreaterThan(0);
    }
  });
});

import type { Layer, SoundDefinition } from "@web-kits/audio";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { SOUND_PATCH, UI_SOUND_NAMES } from ".";

const HertzSchema = z.number();
const SweepSchema = z.object({ start: z.number(), end: z.number() });

function layersOf(sound: SoundDefinition | undefined): Layer[] {
  if (!sound) return [];
  return "layers" in sound ? sound.layers : [sound];
}

function frequencies(layer: Layer): number[] {
  const values: number[] = [];
  const source = layer.source;
  const freq = "frequency" in source ? source.frequency : undefined;
  const hertz = HertzSchema.safeParse(freq);
  const sweep = SweepSchema.safeParse(freq);
  if (hertz.success) values.push(hertz.data);
  else if (sweep.success) values.push(sweep.data.start, sweep.data.end);
  const filter = Array.isArray(layer.filter) ? undefined : layer.filter;
  if (filter && "frequency" in filter) values.push(filter.frequency);
  const peak =
    filter && "envelope" in filter ? filter.envelope?.peak : undefined;
  if (peak !== undefined) values.push(peak);
  return values;
}

function durationMs(layer: Layer): number {
  const env = layer.envelope;
  const attack = env?.attack ?? 0;
  const decay = env?.decay ?? 0;
  const release = env?.release ?? 0;
  const delay = layer.delay ?? 0;
  return (delay + attack + decay + release) * 1000;
}

describe("interface sounds", () => {
  const patch = SOUND_PATCH.toJSON();

  it("exposes every production cue", () => {
    expect(patch.sounds).toBeDefined();
    expect(Object.keys(patch.sounds ?? {})).toEqual([...UI_SOUND_NAMES]);
  });

  it("keeps envelopes, gain, and frequencies in UI bounds", () => {
    for (const name of UI_SOUND_NAMES) {
      const layers = layersOf(patch.sounds?.[name]);
      expect(layers.length).toBeGreaterThan(0);
      expect(layers.length).toBeLessThanOrEqual(name === "success" ? 3 : 2);

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
});

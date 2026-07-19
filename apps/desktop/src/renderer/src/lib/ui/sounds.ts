import { defineSound, ensureReady } from "@web-kits/audio";

/** Soft low plop for saves dropping into the trash. */
const trashThunk = defineSound({
  source: { type: "sine", frequency: { start: 260, end: 85 } },
  envelope: { attack: 0.002, decay: 0.14, sustain: 0, release: 0.05 },
  gain: 0.22,
});

export function playTrashThunk(): void {
  void ensureReady()
    .then(() => {
      /** A touch of random detune so repeat deletes don't sound stamped out. */
      trashThunk({ detune: (Math.random() - 0.5) * 100 });
    })
    .catch(() => {});
}

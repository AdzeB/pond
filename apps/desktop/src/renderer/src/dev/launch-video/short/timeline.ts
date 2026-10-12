/** Scene timing for the short cut, in milliseconds. Every scene renders as a pure function of `t`. */

/** Cut to "Happy Beats vol. 1" from 41s: the phrase lifts at 7s and breathes from 21s to 23s. */
export const SCENES = {
  hook: [0, 1900],
  sources: [1900, 7000],
  save: [7000, 10400],
  find: [10400, 15400],
  ask: [15400, 21000],
  values: [21000, 23000],
  outro: [23000, 25500],
} as const satisfies Record<string, readonly [number, number]>;

export type SceneId = keyof typeof SCENES;
export const DURATION = SCENES.outro[1];

export const start = (scene: SceneId) => SCENES[scene][0];
export const end = (scene: SceneId) => SCENES[scene][1];

/** Center line of the step caption under every product window. */
export const CAPTION_Y = 958;

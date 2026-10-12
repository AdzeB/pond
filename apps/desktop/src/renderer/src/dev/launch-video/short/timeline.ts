/** Scene timing for the short cut, in milliseconds. Every scene renders as a pure function of `t`. */

/** Cut to "Happy Beats vol. 1" from 38.7s: the phrase lifts at 9.3s and lands its hit at 25.3s. */
export const SCENES = {
  logo: [0, 2700],
  sources: [2700, 7400],
  saveTitle: [7400, 9000],
  save: [9000, 13000],
  findTitle: [13000, 14300],
  find: [14300, 18600],
  askTitle: [18600, 19700],
  ask: [19700, 25200],
  outro: [25300, 28300],
} as const satisfies Record<string, readonly [number, number]>;

export type SceneId = keyof typeof SCENES;
export const DURATION = SCENES.outro[1];

export const start = (scene: SceneId) => SCENES[scene][0];
export const end = (scene: SceneId) => SCENES[scene][1];

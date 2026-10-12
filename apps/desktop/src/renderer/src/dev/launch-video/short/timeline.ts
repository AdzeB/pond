/** Scene timing for the short cut, in milliseconds. Every scene renders as a pure function of `t`. */

/** Cut to "Happy Beats vol. 1" from 37.5s: the phrase lifts on the Save press and hits on the thesis. */
export const SCENES = {
  logo: [0, 2700],
  sources: [2700, 7400],
  saveTitle: [7400, 9000],
  save: [9000, 13500],
  findTitle: [13500, 14800],
  find: [14800, 19800],
  askTitle: [19800, 20900],
  ask: [20900, 26400],
  thesis: [26500, 29800],
  offer: [29900, 32500],
  end: [32600, 35000],
} as const satisfies Record<string, readonly [number, number]>;

export type SceneId = keyof typeof SCENES;
export const DURATION = SCENES.end[1];

export const start = (scene: SceneId) => SCENES[scene][0];
export const end = (scene: SceneId) => SCENES[scene][1];

/** Whether a scene is on screen, with `lead` ms of warm-up before it. */
export const live = (t: number, scene: SceneId, lead = 0) =>
  t >= start(scene) - lead && t <= end(scene) + 50;

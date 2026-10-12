/** Scene timing for the short cut, in milliseconds. Every scene renders as a pure function of `t`. */

/** Cut to "Happy Beats vol. 9" from 64.25s: the drop lands on the mark and the breakdown carries the outro. */
export const SCENES = {
  sea: [0, 3500],
  logo: [3300, 6100],
  sources: [6100, 10800],
  saveTitle: [10800, 12800],
  save: [12800, 17300],
  findTitle: [17300, 19300],
  find: [19300, 24300],
  askTitle: [24300, 26300],
  ask: [26300, 31800],
  thesis: [31900, 35200],
  offer: [35300, 37900],
  end: [38000, 40400],
} as const satisfies Record<string, readonly [number, number]>;

export type SceneId = keyof typeof SCENES;
export const DURATION = SCENES.end[1];

export const start = (scene: SceneId) => SCENES[scene][0];
export const end = (scene: SceneId) => SCENES[scene][1];

/** Whether a scene is on screen, with `lead` ms of warm-up before it. */
export const live = (t: number, scene: SceneId, lead = 0) =>
  t >= start(scene) - lead && t <= end(scene) + 50;

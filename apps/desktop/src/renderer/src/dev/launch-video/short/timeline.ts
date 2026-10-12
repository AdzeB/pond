/** Scene timing for the short cut, in milliseconds. Every scene renders as a pure function of `t`. */

/** Cut to a scored track: each section of the score is sized to one scene below. */
export const SCENES = {
  sea: [0, 3500],
  logo: [3300, 6100],
  sources: [6100, 10800],
  saveTitle: [10800, 12600],
  save: [12600, 17100],
  ownTitle: [17100, 18900],
  own: [18900, 22900],
  enrichTitle: [22900, 24700],
  enrich: [24700, 29200],
  findTitle: [29200, 31000],
  find: [31000, 36000],
  askTitle: [36000, 37800],
  ask: [37800, 43300],
  connectTitle: [43300, 45100],
  connect: [45100, 49600],
  bento: [49700, 55400],
  thesis: [55500, 58800],
  offer: [58900, 61500],
  end: [61600, 64000],
} as const satisfies Record<string, readonly [number, number]>;

export type SceneId = keyof typeof SCENES;
export const DURATION = SCENES.end[1];

export const start = (scene: SceneId) => SCENES[scene][0];
export const end = (scene: SceneId) => SCENES[scene][1];

/** Whether a scene is on screen, with `lead` ms of warm-up before it. */
export const live = (t: number, scene: SceneId, lead = 0) =>
  t >= start(scene) - lead && t <= end(scene) + 50;

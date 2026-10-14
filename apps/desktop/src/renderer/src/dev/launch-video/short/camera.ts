import { ease, mix, progress, WIDTH } from "../stage/timeline";

/** A stage-space crop: its top-left corner and width at 16:9. */
export interface View {
  x: number;
  y: number;
  width: number;
}

export interface Key extends View {
  at: number;
  move?: number;
}

export const WHOLE: View = { x: 0, y: 0, width: WIDTH };

/** The crop at `t`, easing into each key by its `at`. */
export function track(t: number, keys: readonly Key[]): View {
  const first = keys[0] ?? { ...WHOLE, at: 0 };
  const view = { x: first.x, y: first.y, width: first.width };
  for (const key of keys) {
    const move = key.move ?? 600;
    const k = ease.inOut(progress(t, key.at - move, move));
    view.x = mix(view.x, key.x, k);
    view.y = mix(view.y, key.y, k);
    view.width = mix(view.width, key.width, k);
  }
  return view;
}

/** The transform that fills the frame with `view`, for a layer with origin at its top-left. */
export const lens = (view: View) =>
  `scale(${WIDTH / view.width}) translate(${-view.x}px, ${-view.y}px)`;

/** Timed app actions: each runs once when capture crosses `at`. */
import type { Director } from "../director";
import type { FrameId } from "./frames";

export interface Action {
  at: number;
  frame: FrameId;
  run: (director: Director) => void;
}

export const ACTIONS: Action[] = [];

export function at(time: number, frame: FrameId, run: Action["run"]) {
  ACTIONS.push({ at: time, frame, run });
}

/** Types into a Lexical editor one character per step. */
export function composeText(
  start: number,
  frame: FrameId,
  selector: string,
  text: string,
  step = 55,
) {
  for (let index = 1; index <= text.length; index++) {
    at(start + (index - 1) * step, frame, (d) =>
      d.compose(selector, text.slice(0, index)),
    );
  }
  return start + text.length * step;
}

export function sortActions() {
  ACTIONS.sort((a, b) => a.at - b.at);
}

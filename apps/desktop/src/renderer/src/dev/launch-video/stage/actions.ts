/** Timed app actions: each runs once when capture crosses `at`. */
import type { Director } from "../director";

export interface Action {
  at: number;
  run: (director: Director) => void;
}

export const ACTIONS: Action[] = [];

export function at(time: number, run: Action["run"]) {
  ACTIONS.push({ at: time, run });
}

/** Types into a Lexical editor one character per step. */
export function composeText(
  start: number,
  selector: string,
  text: string,
  step = 55,
) {
  for (let index = 1; index <= text.length; index++) {
    at(start + (index - 1) * step, (d) =>
      d.compose(selector, text.slice(0, index)),
    );
  }
  return start + text.length * step;
}

export function sortActions() {
  ACTIONS.sort((a, b) => a.at - b.at);
}

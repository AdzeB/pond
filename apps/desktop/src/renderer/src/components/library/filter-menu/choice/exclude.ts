import type { KeyboardEvent, MouseEvent } from "react";

export function excludeGestures(exclude: () => void) {
  return {
    onContextMenu: (event: MouseEvent) => {
      event.preventDefault();
      exclude();
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "F10" && event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        exclude();
      }
    },
  };
}

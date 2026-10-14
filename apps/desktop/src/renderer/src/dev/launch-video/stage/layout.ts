import { useLayoutEffect, useRef, useState } from "react";

/** Reads layout on mount and again once fonts load, since text positions depend on glyph widths. */
export function useLayout<T>(read: () => T, initial: T): T {
  const [value, setValue] = useState(initial);
  const reader = useRef(read);
  reader.current = read;
  useLayoutEffect(() => {
    const update = () => setValue(reader.current());
    update();
    void document.fonts.ready.then(update);
  }, []);
  return value;
}

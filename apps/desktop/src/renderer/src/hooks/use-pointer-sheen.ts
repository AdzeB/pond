import { type PointerEvent, useCallback } from "react";

// Pointer-tracked specular for liquid-glass surfaces. Sets the CSS custom
// properties the `.glass::after` glint reads (`--glass-mx`/`--glass-my` for the
// highlight centre, `--glass-sheen` for its strength) so the reflection slides
// under the cursor like light catching the lens. Position only — writes
// straight to the element's inline style, so no React state and no re-renders.
//
// Spread the returned handlers onto any glass surface (or pass `sheen` to
// <Glass>). Honours `prefers-reduced-motion` because the fade itself runs
// through the global reduced-motion transition killswitch.
export function usePointerSheen() {
  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--glass-mx", `${x}%`);
    el.style.setProperty("--glass-my", `${y}%`);
    el.style.setProperty("--glass-sheen", "1");
  }, []);

  const onPointerLeave = useCallback((event: PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--glass-sheen", "0");
  }, []);

  return { onPointerMove, onPointerLeave };
}

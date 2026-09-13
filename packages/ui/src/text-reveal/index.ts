import { useReducedMotionConfig } from "motion/react";
import { useEffect, useRef, useState } from "react";

export function useTextReveal(
  content: string,
  animate: boolean,
  finish = false,
) {
  const reduced = useReducedMotionConfig();
  const [visible, setVisible] = useState(() => (animate ? "" : content));
  const current = useRef(visible);
  const target = useRef(content);
  target.current = content;
  const started = useRef(animate);
  useEffect(() => {
    if (animate) started.current = true;
    if (reduced || finish) {
      current.current = content;
      setVisible(content);
      return;
    }
    if (!started.current) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const next = target.current;
      if (!next.startsWith(current.current)) {
        current.current = next;
        setVisible(next);
        return;
      }
      const remaining = Array.from(next.slice(current.current.length));
      if (!remaining.length) return;
      const elapsed = Math.min(64, now - previous);
      const count = Math.min(
        remaining.length,
        Math.max(
          1,
          Math.floor(elapsed / 12),
          Math.ceil((remaining.length * elapsed) / 200),
        ),
      );
      previous = now;
      current.current += remaining.slice(0, count).join("");
      setVisible(current.current);
      if (current.current !== next) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [content, animate, reduced, finish]);
  const text =
    !reduced && !finish && started.current && content.startsWith(visible)
      ? visible
      : content;
  return { text, pending: text !== content };
}

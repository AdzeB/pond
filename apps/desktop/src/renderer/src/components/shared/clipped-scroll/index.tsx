import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styles from "./styles.module.css";

interface ClippedScrollProps {
  /** Real height is derived from this and the rows so an overflowing list always ends mid-row, never on a boundary that reads as a false bottom. */
  maxHeight: number;
  children: ReactNode;
  className?: string;
  /** Rows must be direct children of the scroll element, so layout (e.g. grid) goes here, not on a wrapper. */
  contentClassName?: string;
  /** How much of the first clipped row to leave peeking below the fold. */
  peek?: number;
  /** Fade height at each overflowing edge. */
  fade?: number;
  /** Inner padding lives here so row offsets stay measurable. */
  pad?: number;
}

/** Fades overflowing edges and deliberately clips the last visible row; direct children must be the scrollable rows themselves. */
export function ClippedScroll({
  maxHeight,
  children,
  className,
  contentClassName,
  peek = 22,
  fade = 28,
  pad = 4,
}: ClippedScrollProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(maxHeight);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const content = el.scrollHeight;
    if (content <= maxHeight) {
      setHeight(content);
      return;
    }
    /** Fit whole rows within a reduced budget, then reveal `peek` px of the next row so the bottom edge always cuts through a row. */
    const budget = maxHeight - peek;
    let base = 0;
    for (const child of Array.from(el.children) as HTMLElement[]) {
      const bottom = child.offsetTop + child.offsetHeight;
      if (bottom <= budget) base = bottom;
      else break;
    }
    setHeight(Math.min(base + peek, maxHeight));
  }, [maxHeight, peek]);

  const updateOverflow = useCallback(() => {
    const el = scrollRef.current;
    const root = rootRef.current;
    if (!el || !root) return;
    root.toggleAttribute("data-clip-top", el.scrollTop > 1);
    root.toggleAttribute(
      "data-clip-bottom",
      el.scrollTop + el.clientHeight < el.scrollHeight - 1,
    );
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  /** Re-evaluate the fades after the container is resized to its clipped height. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: height is the trigger, not a read
  useEffect(() => {
    updateOverflow();
  }, [height, updateOverflow]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      measure();
      updateOverflow();
    });
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [measure, updateOverflow]);

  return (
    <div
      ref={rootRef}
      className={`${styles.root}${className ? ` ${className}` : ""}`}
      style={{ height, "--clip-fade": `${fade}px` } as CSSProperties}
    >
      <div
        ref={scrollRef}
        className={`${styles.scroll}${contentClassName ? ` ${contentClassName}` : ""}`}
        style={{ padding: pad }}
        onScroll={updateOverflow}
      >
        {children}
      </div>
    </div>
  );
}

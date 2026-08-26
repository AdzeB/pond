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
  maxHeight: number;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  peek?: number;
  fade?: number;
  pad?: number;
}

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

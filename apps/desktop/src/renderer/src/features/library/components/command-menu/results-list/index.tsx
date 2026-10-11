import { type CSSProperties, useCallback, useEffect } from "react";
import { ShortcutKeys } from "@/shared/components/shortcut-keys";
import type { MenuEntry, MenuGroup } from "../types";
import { useResultsHeight } from "../use-results-height";
import styles from "./styles.module.css";

interface ResultsListProps {
  open: boolean;
  groups: MenuGroup[];
  entries: MenuEntry[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onExecute: (index: number) => void;
}

export function ResultsList({
  open,
  groups,
  entries,
  activeIndex,
  onActiveIndexChange,
  onExecute,
}: ResultsListProps) {
  const { viewportRef, contentRef, height, sized } = useResultsHeight(
    open,
    groups,
  );
  const setViewportRef = useCallback(
    (element: HTMLDivElement | null) => {
      viewportRef.current = element;
    },
    [viewportRef],
  );

  useEffect(() => {
    if (entries.length === 0) return;
    const active = viewportRef.current?.querySelector<HTMLElement>(
      `[data-command-index="${activeIndex}"]`,
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, entries.length, viewportRef]);

  const resultsStyle: CSSProperties & { "--results-height"?: string } = {};
  if (height != null) resultsStyle["--results-height"] = `${height}px`;

  return (
    <div
      id="pond-command-menu-results"
      ref={setViewportRef}
      className={styles.results}
      role="listbox"
      data-sized={sized || undefined}
      style={resultsStyle}
    >
      <div ref={contentRef} className={styles.content}>
        {groups.map((section) => (
          <section className={styles.group} key={section.group}>
            <div className={styles["group-label"]}>{section.group}</div>
            {section.entries.map((entry) => {
              const index = entries.indexOf(entry);
              const active = index === activeIndex;
              return (
                <button
                  id={entry.id}
                  key={entry.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-command-index={index}
                  className={styles.item}
                  onMouseMove={() => onActiveIndexChange(index)}
                  onClick={() => onExecute(index)}
                >
                  <span className={styles.icon}>{entry.icon}</span>
                  <span className={styles.copy}>
                    <span className={styles.label}>{entry.label}</span>
                    {entry.detail ? (
                      <span className={styles.detail}>{entry.detail}</span>
                    ) : null}
                  </span>
                  {entry.shortcut ? (
                    <span className={styles.shortcut}>
                      <ShortcutKeys id={entry.shortcut} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}

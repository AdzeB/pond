import { clsx as cn } from "clsx";
import { ease, progress } from "../timeline";
import styles from "./styles.module.css";

export interface Run {
  text: string;
  tone?: "strong" | "muted" | "accent";
}

interface WordsProps extends React.ComponentPropsWithoutRef<"span"> {
  runs: readonly Run[];
  t: number;
  start: number;
  stagger?: number;
  duration?: number;
}

/** Splits runs into words that rise and unblur one after another. */
export function Words({
  runs,
  t,
  start,
  stagger = 45,
  duration = 560,
  className,
  ...props
}: WordsProps) {
  let index = 0;
  return (
    <span className={cn(styles.words, className)} {...props}>
      {runs.map((run, runIndex) =>
        run.text.split(/(\s+)/).map((word, wordIndex) => {
          if (!word.trim()) return word;
          const p = ease.out(progress(t, start + index++ * stagger, duration));
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: words are static per render
              key={`${runIndex}-${wordIndex}`}
              className={styles.word}
              data-tone={run.tone}
              style={{
                opacity: p,
                transform: `translateY(${(1 - p) * 0.32}em)`,
                filter: p < 1 ? `blur(${(1 - p) * 8}px)` : undefined,
              }}
            >
              {word}
            </span>
          );
        }),
      )}
    </span>
  );
}

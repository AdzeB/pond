import { clsx as cn } from "clsx";
import { envelope, styled } from "../timeline";
import styles from "./styles.module.css";

interface WordsProps {
  t: number;
  text: string;
  enter: number;
  exit: number;
  stagger?: number;
  out?: number;
}

/** Words that rise and unblur one after another, then blur away together. */
export function Words({
  t,
  text,
  enter,
  exit,
  stagger = 50,
  out = 350,
}: WordsProps) {
  return text.split(" ").map((word, index) => (
    <span
      // biome-ignore lint/suspicious/noArrayIndexKey: words are static per line
      key={`${index}-${word}`}
      className={styles.word}
      style={styled(
        envelope(t, enter + index * stagger, exit + index * 12, {
          rise: 14,
          out,
        }),
      )}
    >
      {word}
    </span>
  ));
}

interface LineProps
  extends WordsProps,
    Omit<React.ComponentPropsWithoutRef<"div">, keyof WordsProps> {
  y?: number;
}

/** One centered line of stage type at height `y`. */
export function Line({
  t,
  text,
  enter,
  exit,
  stagger,
  out = 350,
  y = 540,
  className,
  style,
  ...props
}: LineProps) {
  if (t < enter - 50 || t > exit + out + 600) return null;
  return (
    <div
      className={cn(styles.line, className)}
      style={{ top: y, ...style }}
      {...props}
    >
      <Words
        t={t}
        text={text}
        enter={enter}
        exit={exit}
        stagger={stagger}
        out={out}
      />
    </div>
  );
}

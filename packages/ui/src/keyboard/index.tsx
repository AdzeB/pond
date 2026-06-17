import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

interface ClusterProps {
  keys: string[];
  separator?: string;
  className?: string;
}

function Cluster({ keys, separator = "", className }: ClusterProps) {
  return (
    <span className={cn(styles.cluster, className)} aria-hidden>
      {keys.map((k, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: short, immutable lists; duplicate keys are valid (e.g. `⌘ ⌘`)
        <span key={`${i}-${k}`} className={styles.row}>
          {i > 0 && separator ? (
            <span className={styles.sep}>{separator}</span>
          ) : null}
          <kbd className={styles.key}>{k}</kbd>
        </span>
      ))}
    </span>
  );
}

interface KeyProps extends React.ComponentPropsWithoutRef<"kbd"> {
  density?: "default" | "inline";
}

function Key({ density = "default", className, ...props }: KeyProps) {
  return (
    <kbd
      data-density={density}
      className={cn(styles.key, className)}
      {...props}
    />
  );
}

export const Keyboard = {
  Cluster,
  Key,
};

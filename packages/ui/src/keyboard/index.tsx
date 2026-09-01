import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

/** Punctuation keys that read as glued to a modifier unless we insert "then". */
const THEN_KEYS = new Set([",", ".", "/", ";", "=", "-", "[", "]", "\\"]);

type Density = "default" | "inline" | "flat";

interface ClusterProps {
  keys: string[];
  separator?: string;
  density?: Density;
  className?: string;
}

function clusterSeparator(keys: string[]): string {
  const last = keys.at(-1);
  return last != null && THEN_KEYS.has(last) ? "then" : "";
}

function Cluster({
  keys,
  separator,
  density = "default",
  className,
}: ClusterProps) {
  const gap = separator !== undefined ? separator : clusterSeparator(keys);
  return (
    <span
      className={cn(styles.cluster, className)}
      data-density={density === "default" ? undefined : density}
      aria-hidden
    >
      {keys.map((k, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: short, immutable lists; duplicate keys are valid (e.g. `⌘ ⌘`)
        <span key={`${i}-${k}`} className={styles.row}>
          {i > 0 && gap ? (
            <span className={styles.separator}>{gap}</span>
          ) : null}
          <Key density={density}>{k}</Key>
        </span>
      ))}
    </span>
  );
}

interface KeyProps extends React.ComponentPropsWithoutRef<"kbd"> {
  density?: Density;
}

function Key({ density = "default", className, ...props }: KeyProps) {
  return (
    <kbd
      data-density={density === "default" ? undefined : density}
      className={cn(styles.key, className)}
      {...props}
    />
  );
}

function keysFromChildren(children: React.ReactNode): string[] | null {
  if (typeof children === "string" && children.length > 0) return [children];
  if (Array.isArray(children) && children.every((c) => typeof c === "string")) {
    return children as string[];
  }
  return null;
}

function Shortcut({
  className,
  children,
  density = "default",
  ...props
}: React.ComponentPropsWithoutRef<"span"> & { density?: Density }) {
  const keys = keysFromChildren(children);
  return (
    <span className={className} {...props}>
      {keys ? <Cluster keys={keys} density={density} /> : children}
    </span>
  );
}

export const Keyboard = {
  Cluster,
  Key,
  Shortcut,
};

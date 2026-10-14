import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<"span">) {
  return (
    <span role="status" className={cn(styles.root, className)} {...props} />
  );
}

function Dots({ className, ...props }: ComponentProps<"span">) {
  return (
    <span className={cn(styles.dots, className)} aria-hidden {...props}>
      <span />
      <span />
      <span />
    </span>
  );
}

/** Same ring geometry as the desktop Harvester mark; change both together. */
const SPINNER_VIEW_BOX = 207;
const SPINNER_RADIUS = 77;
const SPINNER_THICKNESS = 30;

function Spinner({ className, ...props }: ComponentProps<"svg">) {
  const center = SPINNER_VIEW_BOX / 2;
  return (
    <svg
      className={cn(styles.spinner, className)}
      viewBox={`0 0 ${SPINNER_VIEW_BOX} ${SPINNER_VIEW_BOX}`}
      fill="none"
      aria-hidden
      {...props}
    >
      <circle
        className={styles.track}
        cx={center}
        cy={center}
        r={SPINNER_RADIUS}
        stroke="currentColor"
        strokeWidth={SPINNER_THICKNESS}
      />
      <circle
        className={styles.arc}
        cx={center}
        cy={center}
        r={SPINNER_RADIUS}
        stroke="currentColor"
        strokeWidth={SPINNER_THICKNESS}
        strokeLinecap="round"
        pathLength={100}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </svg>
  );
}

export const Loader = { Root, Dots, Spinner };

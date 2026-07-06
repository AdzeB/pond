import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useId } from "react";
import { snappySpring } from "@/lib/ui/motion";
import styles from "./styles.module.css";

export interface SegmentedOption<T> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedProps<T> {
  ariaLabel: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  // When false, render icon-only cells and rely on the group header / aria for
  // the label (used by Zoom). Defaults to true (Layout's icon + caption tiles).
  showLabels?: boolean;
}

// Single-select switch. The active cell is a floating surface shared across
// options via a motion layoutId, so the selection springs between positions
// rather than blinking on/off. Honours reduced-motion.
export function Segmented<T extends string | number>({
  ariaLabel,
  options,
  value,
  onChange,
  showLabels = true,
}: SegmentedProps<T>) {
  const groupId = useId();
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={styles.segmented}
      data-labels={showLabels}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: button styled as a radio within a radiogroup
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={showLabels ? undefined : option.label}
            title={showLabels ? undefined : option.label}
            data-active={active}
            className={styles.segment}
            onClick={() => onChange(option.value)}
          >
            {active ? (
              <motion.span
                aria-hidden
                layoutId={`${groupId}-active`}
                className={styles["segment-highlight"]}
                transition={reduceMotion ? { duration: 0 } : snappySpring}
              />
            ) : null}
            <span className={styles["segment-inner"]}>
              {option.icon}
              {showLabels ? (
                <span className={styles["segment-label"]}>{option.label}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

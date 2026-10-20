import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { IconStarFill } from "@pond/icons";
import { clsx as cn } from "clsx";
import type { KeyboardEvent } from "react";
import styles from "./styles.module.css";

const STARS = [1, 2, 3, 4, 5] as const;
const MAX = STARS.length;

/** Shortcuts on top of the radio group's own arrow keys. */
export function nextRating(key: string): number | null {
  if (key === "Home") return 1;
  if (key === "End") return MAX;
  if (key === "Delete" || key === "Backspace" || key === "0") return 0;
  const digit = Number(key);
  return Number.isInteger(digit) && digit >= 1 && digit <= MAX ? digit : null;
}

interface RatingProps
  extends Omit<
    React.ComponentPropsWithoutRef<"div">,
    "onChange" | "defaultValue"
  > {
  value: number;
  onValueChange: (value: number) => void;
  size?: "sm" | "md";
}

export function Rating({
  value,
  onValueChange,
  size = "md",
  className,
  onKeyDown,
  ...props
}: RatingProps) {
  const jump = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    const next = nextRating(event.key);
    if (next === null || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    onValueChange(next);
    event.currentTarget
      .querySelectorAll<HTMLElement>('[role="radio"]')
      .item(Math.max(next, 1) - 1)
      ?.focus();
  };

  return (
    <RadioGroup
      aria-label="Rating"
      data-size={size}
      className={cn(styles.root, className)}
      value={value > 0 ? value : null}
      onValueChange={(next: number | null) => onValueChange(next ?? 0)}
      onKeyDown={jump}
      {...props}
    >
      {STARS.map((star) => (
        <Radio.Root
          key={star}
          value={star}
          aria-label={`${star} ${star === 1 ? "Star" : "Stars"}`}
          data-filled={star <= value || undefined}
          className={styles.star}
          onClick={() => {
            if (star === value) onValueChange(0);
          }}
        >
          <IconStarFill size={size === "sm" ? 12 : 14} />
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}

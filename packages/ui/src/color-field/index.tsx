import Sketch from "@uiw/react-color-sketch";
import { useEffect, useState } from "react";
import { cn } from "../_shared/cn";
import { Input } from "../input";
import { Popover } from "../popover";
import styles from "./styles.module.css";

// Accepts 3- or 6-digit hex with or without a leading "#", returns
// `#rrggbb` lowercase. Null when the input isn't a valid hex color.
function defaultNormalize(input: string): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().replace(/^#/, "");
  const expanded =
    trimmed.length === 3
      ? trimmed
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : trimmed;
  return /^[0-9a-f]{6}$/i.test(expanded) ? `#${expanded.toLowerCase()}` : null;
}

interface ColorFieldProps {
  value: string;
  onChange: (hex: string) => void;
  "aria-label": string;
  normalize?: (input: string) => string | null;
  className?: string;
}

export function ColorField({
  value,
  onChange,
  "aria-label": ariaLabel,
  normalize = defaultNormalize,
  className,
}: ColorFieldProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = (next: string) => {
    const normalized = normalize(next);
    if (normalized) onChange(normalized);
    else setDraft(value);
  };

  const swatch = normalize(value) ?? "#000000";

  return (
    <div className={cn(styles.root, className)}>
      <Popover.Root>
        <Popover.Trigger
          type="button"
          aria-label={`${ariaLabel} picker`}
          className={styles.swatch}
          style={{ background: swatch }}
        />
        <Popover.Portal>
          <Popover.Positioner sideOffset={6} align="end">
            <Popover.Popup className={styles.popup}>
              <Sketch
                disableAlpha
                color={swatch}
                className={styles.sketch}
                onChange={(result) => onChange(result.hex)}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <Input.Field
        data-size="sm"
        aria-label={`${ariaLabel} hex`}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        value={draft}
        className={styles.input}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
        }}
      />
    </div>
  );
}

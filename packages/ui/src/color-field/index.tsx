import {
  type HsvaColor,
  hexToHsva,
  hsvaToHex,
  validHex,
} from "@uiw/color-convert";
import Hue from "@uiw/react-color-hue";
import Saturation from "@uiw/react-color-saturation";
import { clsx as cn } from "clsx";
import { useEffect, useState } from "react";
import { Input } from "../input";
import { Popover } from "../popover";
import styles from "./styles.module.css";

// Normalize 3/6-digit hex (with or without "#") to lowercase `#rrggbb`; null if invalid.
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
              <ColorPicker value={swatch} onChange={onChange} />
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

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const [hsva, setHsva] = useState<HsvaColor>(() => hexToHsva(value));

  useEffect(() => {
    if (!validHex(value)) return;
    setHsva((prev) => (hsvaToHex(prev) === value ? prev : hexToHsva(value)));
  }, [value]);

  const apply = (next: HsvaColor) => {
    setHsva(next);
    onChange(hsvaToHex(next));
  };

  return (
    <div className={styles.picker}>
      <div className={styles.body}>
        <Saturation
          hsva={hsva}
          radius="8px"
          style={{ flex: 1, height: 156 }}
          className={styles.saturation}
          pointer={SaturationHandle}
          onChange={(next) => apply({ ...hsva, ...next })}
        />
        <Hue
          hue={hsva.h}
          direction="vertical"
          width="12px"
          height="156px"
          radius="6px"
          className={styles.hue}
          pointer={HueHandle}
          onChange={({ h }) => apply({ ...hsva, h })}
        />
      </div>
    </div>
  );
}

interface HandleProps {
  left?: string | number;
  top?: string | number;
}

function SaturationHandle({ left, top }: HandleProps) {
  return <div className={styles.satHandle} style={{ left, top }} />;
}

function HueHandle({ top }: HandleProps) {
  return <div className={styles.hueHandle} style={{ left: "50%", top }} />;
}

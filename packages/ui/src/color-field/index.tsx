import { clsx as cn } from "clsx";
import { createContext, use, useEffect, useRef, useState } from "react";
import {
  useColorArea,
  useColorSlider,
  useFocusRing,
  useLocale,
  VisuallyHidden,
} from "react-aria";
import {
  type Color,
  parseColor,
  useColorAreaState,
  useColorSliderState,
} from "react-stately";
import { Input } from "../input";
import { Popover } from "../popover";
import styles from "./styles.module.css";

const AREA_SIZE = 156;
const TRACK_WIDTH = 12;

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

function toHsb(hex: string): Color {
  try {
    return parseColor(hex).toFormat("hsb");
  } catch {
    return parseColor("#000000").toFormat("hsb");
  }
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
          <Popover.Positioner sideOffset={6} align="start">
            <Popover.Popup className={styles.popup}>
              <ColorPicker
                value={swatch}
                ariaLabel={ariaLabel}
                onChange={onChange}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <Input.Field
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

interface PickerContextValue {
  color: Color;
  ariaLabel: string;
  onChange: (color: Color) => void;
}

const PickerContext = createContext<PickerContextValue | null>(null);

function usePicker(): PickerContextValue {
  const context = use(PickerContext);
  if (!context) {
    throw new Error("Color picker parts must be rendered within ColorPicker");
  }
  return context;
}

function ColorPicker({
  value,
  ariaLabel,
  onChange,
}: {
  value: string;
  ariaLabel: string;
  onChange: (hex: string) => void;
}) {
  const [color, setColor] = useState<Color>(() => toHsb(value));

  useEffect(() => {
    setColor((prev) => (prev.toString("hex") === value ? prev : toHsb(value)));
  }, [value]);

  const apply = (next: Color) => {
    setColor(next);
    onChange(next.toString("hex"));
  };

  return (
    <PickerContext value={{ color, ariaLabel, onChange: apply }}>
      <div className={styles.picker}>
        <div className={styles.body}>
          <ColorArea />
          <HueSlider />
        </div>
      </div>
    </PickerContext>
  );
}

function ColorArea() {
  const { color, ariaLabel, onChange } = usePicker();
  const inputXRef = useRef<HTMLInputElement>(null);
  const inputYRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const state = useColorAreaState({
    value: color,
    onChange,
    xChannel: "saturation",
    yChannel: "brightness",
  });

  const { isFocusVisible, focusProps } = useFocusRing();
  const { colorAreaProps, xInputProps, yInputProps, thumbProps } = useColorArea(
    {
      "aria-label": `${ariaLabel} saturation and brightness`,
      inputXRef,
      inputYRef,
      containerRef,
    },
    state,
  );

  return (
    <div
      ref={containerRef}
      {...colorAreaProps}
      className={styles.saturation}
      style={{ ...colorAreaProps.style, width: AREA_SIZE, height: AREA_SIZE }}
    >
      <div
        {...thumbProps}
        className={styles.satHandle}
        data-focus={isFocusVisible || undefined}
        style={thumbProps.style}
      >
        <VisuallyHidden>
          <input ref={inputXRef} {...xInputProps} {...focusProps} />
          <input ref={inputYRef} {...yInputProps} {...focusProps} />
        </VisuallyHidden>
      </div>
    </div>
  );
}

function HueSlider() {
  const { color, ariaLabel, onChange } = usePicker();
  const { locale } = useLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const state = useColorSliderState({
    value: color,
    onChange,
    channel: "hue",
    orientation: "vertical",
    locale,
  });

  const { isFocusVisible, focusProps } = useFocusRing();
  const { trackProps, thumbProps, inputProps } = useColorSlider(
    {
      "aria-label": `${ariaLabel} hue`,
      channel: "hue",
      orientation: "vertical",
      trackRef,
      inputRef,
    },
    state,
  );

  return (
    <div
      {...trackProps}
      ref={trackRef}
      className={styles.hue}
      style={{ ...trackProps.style, width: TRACK_WIDTH, height: AREA_SIZE }}
    >
      <div
        {...thumbProps}
        className={styles.hueHandle}
        data-focus={isFocusVisible || undefined}
        style={{ ...thumbProps.style, left: "50%" }}
      >
        <VisuallyHidden>
          <input ref={inputRef} {...inputProps} {...focusProps} />
        </VisuallyHidden>
      </div>
    </div>
  );
}

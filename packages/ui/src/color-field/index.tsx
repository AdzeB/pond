import { clsx as cn } from "clsx";
import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useRef,
  useState,
} from "react";
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
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  /** Auto-apply as the user types: input that resolves to a real colour commits immediately; invalid input stays in the field. */
  const handleChange = (next: string) => {
    setText(next);
    const normalized = normalize(next);
    if (normalized) onChange(normalized);
  };

  const normalized = normalize(text);

  return (
    <div className={cn(styles.root, className)}>
      <Popover.Root>
        <Popover.Trigger
          type="button"
          aria-label={`${ariaLabel} picker`}
          className={styles.swatch}
          data-empty={!normalized || undefined}
          style={normalized ? { background: normalized } : undefined}
        />
        <Popover.Portal>
          <Popover.Positioner sideOffset={6} align="start">
            <Popover.Popup className={styles.popup}>
              <ColorPicker
                value={normalized ?? "#000000"}
                ariaLabel={ariaLabel}
                onChange={onChange}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <Input.Root>
        <Input.Field
          aria-label={`${ariaLabel} hex`}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          value={text}
          onChange={(e) => handleChange(e.target.value)}
        />
      </Input.Root>
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

/**
 * Headless colour-picker state provider; compose the visual parts inside it.
 * For the common bundled layout use `<ColorPicker />` directly.
 */
function ColorPickerRoot({
  value,
  ariaLabel,
  onChange,
  children,
}: {
  value: string;
  ariaLabel: string;
  onChange: (hex: string) => void;
  children: ReactNode;
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
      {children}
    </PickerContext>
  );
}

export function ColorPicker({
  value,
  ariaLabel,
  onChange,
  areaWidth = AREA_SIZE,
  areaHeight = AREA_SIZE,
}: {
  value: string;
  ariaLabel: string;
  onChange: (hex: string) => void;
  areaWidth?: number;
  areaHeight?: number;
}) {
  return (
    <ColorPickerRoot value={value} ariaLabel={ariaLabel} onChange={onChange}>
      <div className={styles.picker}>
        <div className={styles.body}>
          <ColorArea width={areaWidth} height={areaHeight} />
          <HueSlider height={areaHeight} />
        </div>
      </div>
    </ColorPickerRoot>
  );
}

function ColorArea({
  width,
  height = AREA_SIZE,
}: {
  width?: number;
  height?: number;
}) {
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
      style={{
        ...colorAreaProps.style,
        width: width ? `${width}px` : "100%",
        height,
      }}
    >
      <div
        {...thumbProps}
        className={styles["saturation-handle"]}
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

function HueSlider({
  height = AREA_SIZE,
  width = TRACK_WIDTH,
}: {
  height?: number;
  width?: number;
}) {
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
      style={{ ...trackProps.style, width, height }}
    >
      <div
        {...thumbProps}
        className={styles["hue-handle"]}
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

ColorPicker.Root = ColorPickerRoot;
ColorPicker.Area = ColorArea;
ColorPicker.Hue = HueSlider;

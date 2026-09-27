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
  "aria-describedby"?: string;
  normalize?: (input: string) => string | null;
  className?: string;
}

export function ColorField({
  value,
  onChange,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  normalize = defaultNormalize,
  className,
}: ColorFieldProps) {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

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
          aria-describedby={ariaDescribedBy}
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
      <Input.Root className={styles.input}>
        <Input.Field
          className={styles.hex}
          aria-label={`${ariaLabel} hex`}
          aria-describedby={ariaDescribedBy}
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
  className,
  thumbClassName,
}: {
  width?: number;
  height?: number;
  className?: string;
  thumbClassName?: string;
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
      className={cn(styles.saturation, className)}
      style={{
        ...colorAreaProps.style,
        width: width ? `${width}px` : "100%",
        height,
      }}
    >
      <div
        {...thumbProps}
        className={cn(styles["saturation-handle"], thumbClassName)}
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
  orientation = "vertical",
  className,
  thumbClassName,
}: {
  height?: number;
  width?: number;
  orientation?: "horizontal" | "vertical";
  className?: string;
  thumbClassName?: string;
}) {
  const { color, ariaLabel, onChange } = usePicker();
  const { locale } = useLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const state = useColorSliderState({
    value: color,
    onChange,
    channel: "hue",
    orientation,
    locale,
  });

  const { isFocusVisible, focusProps } = useFocusRing();
  const { trackProps, thumbProps, inputProps, labelProps } = useColorSlider(
    {
      "aria-label": `${ariaLabel} hue`,
      channel: "hue",
      orientation,
      trackRef,
      inputRef,
    },
    state,
  );

  return (
    <div
      {...trackProps}
      ref={trackRef}
      className={cn(styles.hue, className)}
      style={{ ...trackProps.style, width, height }}
    >
      <VisuallyHidden>
        <span {...labelProps}>{ariaLabel} hue</span>
      </VisuallyHidden>
      <div
        {...thumbProps}
        className={cn(styles["hue-handle"], thumbClassName)}
        data-focus={isFocusVisible || undefined}
        style={{
          ...thumbProps.style,
          ...(orientation === "vertical" ? { left: "50%" } : { top: "50%" }),
        }}
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
